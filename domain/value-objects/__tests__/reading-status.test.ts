import { describe, it, expect, beforeEach } from 'vitest';
import { ReadingStatus } from '../reading-status';
import { Book, BookStatus } from '../../entities/book';
import { ValidationError } from '../../errors/domain-errors';

describe('ReadingStatus', () => {
  let baseBook: Book;

  beforeEach(() => {
    baseBook = {
      id: 'book-1',
      userId: 'user-1',
      googleBooksId: 'google-123',
      title: 'Test Book',
      authors: ['Test Author'],
      thumbnail: 'https://example.com/cover.jpg',
      description: 'A test book',
      pageCount: 300,
      status: 'want-to-read',
      currentPage: 0,
      rating: undefined,
      addedAt: new Date('2024-01-01'),
      finishedAt: undefined,
    };
  });

  describe('canTransitionTo', () => {
    it('should allow valid transitions from want-to-read', () => {
      const status = new ReadingStatus({ ...baseBook, status: 'want-to-read' });
      expect(status.canTransitionTo('reading')).toBe(true);
      expect(status.canTransitionTo('read')).toBe(true);
      expect(status.canTransitionTo('want-to-read')).toBe(false);
    });

    it('should allow valid transitions from reading', () => {
      const status = new ReadingStatus({ ...baseBook, status: 'reading' });
      expect(status.canTransitionTo('want-to-read')).toBe(true);
      expect(status.canTransitionTo('read')).toBe(true);
      expect(status.canTransitionTo('reading')).toBe(false);
    });

    it('should allow valid transitions from read', () => {
      const status = new ReadingStatus({ ...baseBook, status: 'read' });
      expect(status.canTransitionTo('reading')).toBe(true);
      expect(status.canTransitionTo('want-to-read')).toBe(true);
      expect(status.canTransitionTo('read')).toBe(false);
    });
  });

  describe('transitionTo', () => {
    describe('transitioning to read', () => {
      it('should set finishedAt date when transitioning to read', () => {
        const book = { ...baseBook, status: 'reading' as BookStatus };
        const status = new ReadingStatus(book);
        const updates = status.transitionTo('read');

        expect(updates.status).toBe('read');
        expect(updates.finishedAt).toBeInstanceOf(Date);
        expect(updates.currentPage).toBe(300);
      });

      it('should not override existing finishedAt when transitioning to read', () => {
        const existingDate = new Date('2024-05-15');
        const book = {
          ...baseBook,
          status: 'reading' as BookStatus,
          finishedAt: existingDate
        };
        const status = new ReadingStatus(book);
        const updates = status.transitionTo('read');

        expect(updates.status).toBe('read');
        expect(updates.finishedAt).toBeUndefined(); // Not setting a new date
      });

      it('should handle books without page count', () => {
        const book = {
          ...baseBook,
          status: 'reading' as BookStatus,
          pageCount: undefined
        };
        const status = new ReadingStatus(book);
        const updates = status.transitionTo('read');

        expect(updates.status).toBe('read');
        expect(updates.currentPage).toBeUndefined();
      });
    });

    describe('transitioning from read', () => {
      it('should clear finishedAt and rating when moving from read', () => {
        const book = {
          ...baseBook,
          status: 'read' as BookStatus,
          finishedAt: new Date('2024-05-15'),
          rating: 4
        };
        const status = new ReadingStatus(book);
        const updates = status.transitionTo('reading');

        expect(updates.status).toBe('reading');
        expect(updates.finishedAt).toBeUndefined();
        expect(updates.rating).toBeUndefined();
      });
    });

    describe('transitioning to want-to-read', () => {
      it('should reset current page when transitioning to want-to-read', () => {
        const book = {
          ...baseBook,
          status: 'reading' as BookStatus,
          currentPage: 150
        };
        const status = new ReadingStatus(book);
        const updates = status.transitionTo('want-to-read');

        expect(updates.status).toBe('want-to-read');
        expect(updates.currentPage).toBe(0);
      });
    });

    describe('invalid transitions', () => {
      it('should throw error for invalid transitions', () => {
        const book = { ...baseBook, status: 'want-to-read' as BookStatus };
        const status = new ReadingStatus(book);

        expect(() => status.transitionTo('want-to-read')).toThrow(ValidationError);
        expect(() => status.transitionTo('want-to-read')).toThrow(
          'Cannot transition from want-to-read to want-to-read'
        );
      });
    });
  });

  describe('getReadingProgress', () => {
    it('should calculate progress percentage correctly', () => {
      const book = { ...baseBook, currentPage: 150, pageCount: 300 };
      const status = new ReadingStatus(book);
      expect(status.getReadingProgress()).toBe(50);
    });

    it('should return 0 when pageCount is 0', () => {
      const book = { ...baseBook, pageCount: 0 };
      const status = new ReadingStatus(book);
      expect(status.getReadingProgress()).toBe(0);
    });

    it('should return 0 when pageCount is undefined', () => {
      const book = { ...baseBook, pageCount: undefined };
      const status = new ReadingStatus(book);
      expect(status.getReadingProgress()).toBe(0);
    });

    it('should return 0 when currentPage is undefined', () => {
      const book = { ...baseBook, currentPage: undefined };
      const status = new ReadingStatus(book);
      expect(status.getReadingProgress()).toBe(0);
    });

    it('should cap progress at 100%', () => {
      const book = { ...baseBook, currentPage: 400, pageCount: 300 };
      const status = new ReadingStatus(book);
      expect(status.getReadingProgress()).toBe(100);
    });

    it('should round to nearest integer', () => {
      const book = { ...baseBook, currentPage: 100, pageCount: 300 };
      const status = new ReadingStatus(book);
      expect(status.getReadingProgress()).toBe(33); // 100/300 = 0.333... -> 33
    });
  });

  describe('canBeRated', () => {
    it('should return true for read books', () => {
      const book = { ...baseBook, status: 'read' as BookStatus };
      const status = new ReadingStatus(book);
      expect(status.canBeRated()).toBe(true);
    });

    it('should return false for reading books', () => {
      const book = { ...baseBook, status: 'reading' as BookStatus };
      const status = new ReadingStatus(book);
      expect(status.canBeRated()).toBe(false);
    });

    it('should return false for want-to-read books', () => {
      const book = { ...baseBook, status: 'want-to-read' as BookStatus };
      const status = new ReadingStatus(book);
      expect(status.canBeRated()).toBe(false);
    });
  });

  describe('validateRating', () => {
    it('should accept valid ratings for read books', () => {
      const book = { ...baseBook, status: 'read' as BookStatus };
      const status = new ReadingStatus(book);

      expect(() => status.validateRating(1)).not.toThrow();
      expect(() => status.validateRating(3)).not.toThrow();
      expect(() => status.validateRating(5)).not.toThrow();
    });

    it('should throw error for non-read books', () => {
      const book = { ...baseBook, status: 'reading' as BookStatus };
      const status = new ReadingStatus(book);

      expect(() => status.validateRating(3)).toThrow(ValidationError);
      expect(() => status.validateRating(3)).toThrow('Only finished books can be rated');
    });

    it('should throw error for ratings below 1', () => {
      const book = { ...baseBook, status: 'read' as BookStatus };
      const status = new ReadingStatus(book);

      expect(() => status.validateRating(0)).toThrow(ValidationError);
      expect(() => status.validateRating(-1)).toThrow('Rating must be between 1 and 5');
    });

    it('should throw error for ratings above 5', () => {
      const book = { ...baseBook, status: 'read' as BookStatus };
      const status = new ReadingStatus(book);

      expect(() => status.validateRating(6)).toThrow(ValidationError);
      expect(() => status.validateRating(10)).toThrow('Rating must be between 1 and 5');
    });

    it('should handle decimal ratings', () => {
      const book = { ...baseBook, status: 'read' as BookStatus };
      const status = new ReadingStatus(book);

      expect(() => status.validateRating(0.5)).toThrow('Rating must be between 1 and 5');
      expect(() => status.validateRating(2.5)).not.toThrow(); // Allowing decimals between 1-5
      expect(() => status.validateRating(5.5)).toThrow('Rating must be between 1 and 5');
    });
  });

  describe('validatePageProgress', () => {
    it('should accept valid page numbers', () => {
      const book = { ...baseBook, pageCount: 300 };
      const status = new ReadingStatus(book);

      expect(() => status.validatePageProgress(0)).not.toThrow();
      expect(() => status.validatePageProgress(150)).not.toThrow();
      expect(() => status.validatePageProgress(300)).not.toThrow();
    });

    it('should throw error for negative page numbers', () => {
      const status = new ReadingStatus(baseBook);

      expect(() => status.validatePageProgress(-1)).toThrow(ValidationError);
      expect(() => status.validatePageProgress(-100)).toThrow('Current page cannot be negative');
    });

    it('should throw error when current page exceeds total pages', () => {
      const book = { ...baseBook, pageCount: 300 };
      const status = new ReadingStatus(book);

      expect(() => status.validatePageProgress(301)).toThrow(ValidationError);
      expect(() => status.validatePageProgress(500)).toThrow(
        'Current page (500) cannot exceed total pages (300)'
      );
    });

    it('should allow any positive page when pageCount is undefined', () => {
      const book = { ...baseBook, pageCount: undefined };
      const status = new ReadingStatus(book);

      expect(() => status.validatePageProgress(0)).not.toThrow();
      expect(() => status.validatePageProgress(1000)).not.toThrow();
      expect(() => status.validatePageProgress(99999)).not.toThrow();
    });
  });

  describe('shouldAutoMarkAsRead', () => {
    it('should return true when reading and reached last page', () => {
      const book = {
        ...baseBook,
        status: 'reading' as BookStatus,
        currentPage: 300,
        pageCount: 300
      };
      const status = new ReadingStatus(book);
      expect(status.shouldAutoMarkAsRead()).toBe(true);
    });

    it('should return true when reading and exceeded page count', () => {
      const book = {
        ...baseBook,
        status: 'reading' as BookStatus,
        currentPage: 350,
        pageCount: 300
      };
      const status = new ReadingStatus(book);
      expect(status.shouldAutoMarkAsRead()).toBe(true);
    });

    it('should return false when not in reading status', () => {
      const book = {
        ...baseBook,
        status: 'want-to-read' as BookStatus,
        currentPage: 300,
        pageCount: 300
      };
      const status = new ReadingStatus(book);
      expect(status.shouldAutoMarkAsRead()).toBe(false);
    });

    it('should return false when not at last page', () => {
      const book = {
        ...baseBook,
        status: 'reading' as BookStatus,
        currentPage: 299,
        pageCount: 300
      };
      const status = new ReadingStatus(book);
      expect(status.shouldAutoMarkAsRead()).toBe(false);
    });

    it('should return false when pageCount is undefined', () => {
      const book = {
        ...baseBook,
        status: 'reading' as BookStatus,
        currentPage: 300,
        pageCount: undefined
      };
      const status = new ReadingStatus(book);
      expect(status.shouldAutoMarkAsRead()).toBe(false);
    });

    it('should return false when currentPage is undefined', () => {
      const book = {
        ...baseBook,
        status: 'reading' as BookStatus,
        currentPage: undefined,
        pageCount: 300
      };
      const status = new ReadingStatus(book);
      expect(status.shouldAutoMarkAsRead()).toBe(false);
    });
  });

  describe('edge cases and complex scenarios', () => {
    it('should handle multiple transitions correctly', () => {
      let book = { ...baseBook, status: 'want-to-read' as BookStatus };
      let status = new ReadingStatus(book);

      // Transition to reading
      let updates = status.transitionTo('reading');
      book = { ...book, ...updates };
      status = new ReadingStatus(book);
      expect(book.status).toBe('reading');

      // Update progress
      book.currentPage = 150;
      expect(status.getReadingProgress()).toBe(50);

      // Complete the book
      book.currentPage = 300;
      expect(status.shouldAutoMarkAsRead()).toBe(true);
      updates = status.transitionTo('read');
      book = { ...book, ...updates };
      status = new ReadingStatus(book);

      // Verify final state
      expect(book.status).toBe('read');
      expect(book.finishedAt).toBeInstanceOf(Date);
      expect(status.canBeRated()).toBe(true);
    });

    it('should handle re-reading workflow', () => {
      // Start with a completed book
      let book = {
        ...baseBook,
        status: 'read' as BookStatus,
        currentPage: 300,
        finishedAt: new Date('2024-03-01'),
        rating: 5
      };
      let status = new ReadingStatus(book);

      // Transition back to reading for re-read
      const updates = status.transitionTo('reading');
      book = { ...book, ...updates };
      status = new ReadingStatus(book);

      // Verify state after re-reading
      expect(book.status).toBe('reading');
      expect(updates.finishedAt).toBeUndefined();
      expect(updates.rating).toBeUndefined();
      // Note: currentPage is not modified during status transition
    });

    it('should handle books with zero pages', () => {
      const book = { ...baseBook, pageCount: 0, currentPage: 0 };
      const status = new ReadingStatus(book);

      expect(status.getReadingProgress()).toBe(0);
      expect(() => status.validatePageProgress(0)).not.toThrow();
      // When pageCount is 0, the validation logic may still allow positive pages
      // This is a boundary case that might need product decision
      expect(() => status.validatePageProgress(-1)).toThrow(ValidationError);
    });
  });
});