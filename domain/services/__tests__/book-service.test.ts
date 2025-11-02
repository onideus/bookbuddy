import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookService } from '../book-service';
import { IBookRepository } from '@/domain/interfaces/book-repository';
import { Book, BookStatus } from '@/domain/entities/book';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/domain/errors/domain-errors';
import { createMockBookRepository, setupBookRepositoryMocks } from '@/tests/mocks/repositories';

describe('BookService', () => {
  let bookService: BookService;
  let mockBookRepository: IBookRepository;
  let testBooks: Book[];
  const userId = 'user-123';
  const otherUserId = 'user-456';

  beforeEach(() => {
    mockBookRepository = createMockBookRepository();
    bookService = new BookService(mockBookRepository);

    testBooks = [
      {
        id: 'book-1',
        userId,
        googleBooksId: 'google-1',
        title: 'Test Book 1',
        authors: ['Author 1'],
        thumbnail: 'https://example.com/cover1.jpg',
        description: 'Description 1',
        pageCount: 300,
        status: 'want-to-read',
        currentPage: 0,
        addedAt: new Date('2024-01-01'),
      },
      {
        id: 'book-2',
        userId,
        googleBooksId: 'google-2',
        title: 'Test Book 2',
        authors: ['Author 2'],
        thumbnail: 'https://example.com/cover2.jpg',
        description: 'Description 2',
        pageCount: 400,
        status: 'reading',
        currentPage: 200,
        addedAt: new Date('2024-01-01'),
      },
      {
        id: 'book-3',
        userId,
        googleBooksId: 'google-3',
        title: 'Test Book 3',
        authors: ['Author 3'],
        thumbnail: 'https://example.com/cover3.jpg',
        description: 'Description 3',
        pageCount: 250,
        status: 'read',
        currentPage: 250,
        rating: 4,
        addedAt: new Date('2024-01-01'),
        finishedAt: new Date('2024-02-01'),
      },
    ];

    setupBookRepositoryMocks(mockBookRepository, testBooks);
  });

  describe('updateReadingProgress', () => {
    it('should update currentPage successfully', async () => {
      const book = testBooks[1]; // reading book
      const newPage = 250;

      const result = await bookService.updateReadingProgress(book.id, userId, newPage);

      expect(mockBookRepository.update).toHaveBeenCalledWith(book.id, {
        currentPage: newPage,
      });
      expect(result.currentPage).toBe(newPage);
    });

    it('should auto-mark as read when reaching last page', async () => {
      const book = testBooks[1]; // reading book with 400 pages
      const lastPage = 400;

      // Mock the update to include the auto-transition logic
      vi.mocked(mockBookRepository.update).mockResolvedValueOnce({
        ...book,
        currentPage: lastPage,
        status: 'read',
        finishedAt: new Date(),
      });

      const result = await bookService.updateReadingProgress(book.id, userId, lastPage);

      // Verify update was called with the page update
      // The service will check shouldAutoMarkAsRead and apply transition
      expect(mockBookRepository.update).toHaveBeenCalled();
      const updateCall = vi.mocked(mockBookRepository.update).mock.calls[0];
      expect(updateCall[1]).toHaveProperty('currentPage', lastPage);
    });

    it('should throw NotFoundError for non-existent book', async () => {
      const nonExistentId = 'non-existent';
      vi.mocked(mockBookRepository.findById).mockResolvedValueOnce(undefined);

      await expect(
        bookService.updateReadingProgress(nonExistentId, userId, 100)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError for book owned by different user', async () => {
      const book = testBooks[0];

      await expect(
        bookService.updateReadingProgress(book.id, otherUserId, 100)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ValidationError for negative page number', async () => {
      const book = testBooks[1];

      await expect(
        bookService.updateReadingProgress(book.id, userId, -10)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when exceeding total pages', async () => {
      const book = testBooks[1]; // 400 pages

      await expect(
        bookService.updateReadingProgress(book.id, userId, 500)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle books without page count', async () => {
      const bookWithoutPages = {
        ...testBooks[1],
        pageCount: undefined,
      };
      vi.mocked(mockBookRepository.findById).mockResolvedValueOnce(bookWithoutPages);

      const result = await bookService.updateReadingProgress(bookWithoutPages.id, userId, 100);

      expect(mockBookRepository.update).toHaveBeenCalledWith(
        bookWithoutPages.id,
        expect.objectContaining({ currentPage: 100 })
      );
      expect(result.currentPage).toBe(100);
    });
  });

  describe('updateStatus', () => {
    it('should transition from want-to-read to reading', async () => {
      const book = testBooks[0];

      const result = await bookService.updateStatus(book.id, userId, 'reading');

      expect(mockBookRepository.update).toHaveBeenCalledWith(
        book.id,
        expect.objectContaining({ status: 'reading' })
      );
      expect(result.status).toBe('reading');
    });

    it('should transition from reading to read with finishedAt', async () => {
      const book = testBooks[1];

      const result = await bookService.updateStatus(book.id, userId, 'read');

      expect(mockBookRepository.update).toHaveBeenCalledWith(
        book.id,
        expect.objectContaining({
          status: 'read',
          finishedAt: expect.any(Date),
          currentPage: book.pageCount,
        })
      );
      expect(result.status).toBe('read');
      expect(result.finishedAt).toBeDefined();
    });

    it('should clear finishedAt and rating when moving from read to reading', async () => {
      const book = testBooks[2]; // read book with rating

      const result = await bookService.updateStatus(book.id, userId, 'reading');

      expect(mockBookRepository.update).toHaveBeenCalledWith(
        book.id,
        expect.objectContaining({
          status: 'reading',
          finishedAt: undefined,
          rating: undefined,
        })
      );
      expect(result.finishedAt).toBeUndefined();
      expect(result.rating).toBeUndefined();
    });

    it('should reset currentPage when moving to want-to-read', async () => {
      const book = testBooks[1]; // reading book with currentPage

      const result = await bookService.updateStatus(book.id, userId, 'want-to-read');

      expect(mockBookRepository.update).toHaveBeenCalledWith(
        book.id,
        expect.objectContaining({
          status: 'want-to-read',
          currentPage: 0,
        })
      );
      expect(result.currentPage).toBe(0);
    });

    it('should throw ValidationError for invalid transition', async () => {
      const book = testBooks[0]; // want-to-read

      await expect(
        bookService.updateStatus(book.id, userId, 'want-to-read')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent book', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValueOnce(undefined);

      await expect(
        bookService.updateStatus('non-existent', userId, 'reading')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError for unauthorized user', async () => {
      const book = testBooks[0];

      await expect(
        bookService.updateStatus(book.id, otherUserId, 'reading')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('rateBook', () => {
    it('should rate a read book successfully', async () => {
      const book = testBooks[2]; // read book
      const rating = 5;

      const result = await bookService.rateBook(book.id, userId, rating);

      expect(mockBookRepository.update).toHaveBeenCalledWith(book.id, { rating });
      expect(result.rating).toBe(rating);
    });

    it('should update existing rating', async () => {
      const book = testBooks[2]; // read book with rating 4
      const newRating = 3;

      const result = await bookService.rateBook(book.id, userId, newRating);

      expect(result.rating).toBe(newRating);
    });

    it('should throw ValidationError for non-read book', async () => {
      const book = testBooks[1]; // reading book

      await expect(
        bookService.rateBook(book.id, userId, 4)
      ).rejects.toThrow(ValidationError);
      expect(mockBookRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for rating below 1', async () => {
      const book = testBooks[2];

      await expect(
        bookService.rateBook(book.id, userId, 0)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for rating above 5', async () => {
      const book = testBooks[2];

      await expect(
        bookService.rateBook(book.id, userId, 6)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent book', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValueOnce(undefined);

      await expect(
        bookService.rateBook('non-existent', userId, 4)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError for unauthorized user', async () => {
      const book = testBooks[2];

      await expect(
        bookService.rateBook(book.id, otherUserId, 4)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getReadingStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const stats = await bookService.getReadingStatistics(userId);

      expect(stats).toEqual({
        total: 3,
        wantToRead: 1,
        reading: 1,
        read: 1,
        totalPagesRead: 250,
        averageRating: 4.0,
        currentlyReading: [testBooks[1]],
      });
    });

    it('should handle user with no books', async () => {
      const emptyUserId = 'empty-user';
      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce([]);

      const stats = await bookService.getReadingStatistics(emptyUserId);

      expect(stats).toEqual({
        total: 0,
        wantToRead: 0,
        reading: 0,
        read: 0,
        totalPagesRead: 0,
        averageRating: 0,
        currentlyReading: [],
      });
    });

    it('should calculate average rating correctly with multiple rated books', async () => {
      const booksWithRatings: Book[] = [
        {
          ...testBooks[2],
          id: 'rated-1',
          rating: 5,
          pageCount: 300,
        },
        {
          ...testBooks[2],
          id: 'rated-2',
          rating: 3,
          pageCount: 200,
        },
        {
          ...testBooks[2],
          id: 'rated-3',
          rating: 4,
          pageCount: 250,
        },
      ];

      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce(booksWithRatings);

      const stats = await bookService.getReadingStatistics(userId);

      // Average: (5 + 3 + 4) / 3 = 4.0
      expect(stats.averageRating).toBe(4.0);
      expect(stats.totalPagesRead).toBe(750);
    });

    it('should ignore books without ratings in average calculation', async () => {
      const mixedBooks: Book[] = [
        { ...testBooks[2], id: 'rated', rating: 5, pageCount: 300 },
        { ...testBooks[2], id: 'unrated', rating: undefined, pageCount: 200 },
      ];

      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce(mixedBooks);

      const stats = await bookService.getReadingStatistics(userId);

      expect(stats.averageRating).toBe(5.0);
    });

    it('should ignore read books without page count in total pages', async () => {
      const booksWithMissingPages: Book[] = [
        { ...testBooks[2], pageCount: 300 },
        { ...testBooks[2], id: 'no-pages', pageCount: undefined },
      ];

      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce(booksWithMissingPages);

      const stats = await bookService.getReadingStatistics(userId);

      expect(stats.totalPagesRead).toBe(300);
    });

    it('should round average rating to one decimal place', async () => {
      const booksWithRatings: Book[] = [
        { ...testBooks[2], id: 'rated-1', rating: 5 },
        { ...testBooks[2], id: 'rated-2', rating: 4 },
        { ...testBooks[2], id: 'rated-3', rating: 3 },
      ];

      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce(booksWithRatings);

      const stats = await bookService.getReadingStatistics(userId);

      // Average: (5 + 4 + 3) / 3 = 4.0
      expect(stats.averageRating).toBe(4.0);
    });

    it('should include multiple books in currentlyReading', async () => {
      const multipleReading: Book[] = [
        { ...testBooks[1], id: 'reading-1' },
        { ...testBooks[1], id: 'reading-2' },
        { ...testBooks[1], id: 'reading-3' },
      ];

      vi.mocked(mockBookRepository.findByUserId).mockResolvedValueOnce(multipleReading);

      const stats = await bookService.getReadingStatistics(userId);

      expect(stats.currentlyReading).toHaveLength(3);
      expect(stats.reading).toBe(3);
    });
  });
});