import { describe, it, expect } from 'vitest';
import { GoodreadsBook, GoodreadsBookData } from '../goodreads-book';

describe('GoodreadsBook', () => {
  const validBookData: GoodreadsBookData = {
    bookId: '12345',
    title: 'Test Book',
    author: 'Test Author',
    authorAdditional: 'Co-Author One, Co-Author Two',
    isbn: '1234567890',
    isbn13: '1234567890123',
    myRating: 4,
    averageRating: 3.5,
    publisher: 'Test Publisher',
    binding: 'Hardcover',
    yearPublished: 2020,
    originalPublicationYear: 2019,
    dateRead: new Date('2024-01-15'),
    dateAdded: new Date('2024-01-01'),
    bookshelves: ['fiction', 'favorites', 'science-fiction'],
    exclusiveShelf: 'read',
    myReview: 'Great book!',
    numberOfPages: 350,
  };

  describe('constructor - valid data', () => {
    it('should create a GoodreadsBook with all fields', () => {
      const book = new GoodreadsBook(validBookData);

      expect(book.bookId).toBe('12345');
      expect(book.title).toBe('Test Book');
      expect(book.author).toBe('Test Author');
      expect(book.authorAdditional).toBe('Co-Author One, Co-Author Two');
      expect(book.isbn).toBe('1234567890');
      expect(book.isbn13).toBe('1234567890123');
      expect(book.myRating).toBe(4);
      expect(book.averageRating).toBe(3.5);
      expect(book.publisher).toBe('Test Publisher');
      expect(book.binding).toBe('Hardcover');
      expect(book.yearPublished).toBe(2020);
      expect(book.originalPublicationYear).toBe(2019);
      expect(book.dateRead).toEqual(new Date('2024-01-15'));
      expect(book.dateAdded).toEqual(new Date('2024-01-01'));
      expect(book.bookshelves).toEqual(['fiction', 'favorites', 'science-fiction']);
      expect(book.exclusiveShelf).toBe('read');
      expect(book.myReview).toBe('Great book!');
      expect(book.numberOfPages).toBe(350);
    });

    it('should create a GoodreadsBook with minimal required fields', () => {
      const minimalData: GoodreadsBookData = {
        bookId: '67890',
        title: 'Minimal Book',
        author: 'Another Author',
        dateAdded: new Date('2024-02-01'),
        bookshelves: [],
        exclusiveShelf: 'to-read',
      };

      const book = new GoodreadsBook(minimalData);

      expect(book.bookId).toBe('67890');
      expect(book.title).toBe('Minimal Book');
      expect(book.author).toBe('Another Author');
      expect(book.dateAdded).toEqual(new Date('2024-02-01'));
      expect(book.exclusiveShelf).toBe('to-read');
      expect(book.isbn).toBeUndefined();
      expect(book.myRating).toBeUndefined();
      expect(book.publisher).toBeUndefined();
    });

    it('should trim whitespace from text fields', () => {
      const dataWithWhitespace: GoodreadsBookData = {
        bookId: '  12345  ',
        title: '  Test Book  ',
        author: '  Test Author  ',
        authorAdditional: '  Co-Author  ',
        isbn: '  1234567890  ',
        publisher: '  Publisher  ',
        myReview: '  Great!  ',
        dateAdded: new Date('2024-01-01'),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const book = new GoodreadsBook(dataWithWhitespace);

      expect(book.bookId).toBe('12345');
      expect(book.title).toBe('Test Book');
      expect(book.author).toBe('Test Author');
      expect(book.authorAdditional).toBe('Co-Author');
      expect(book.isbn).toBe('1234567890');
      expect(book.publisher).toBe('Publisher');
      expect(book.myReview).toBe('Great!');
    });

    it('should handle empty optional fields by setting to undefined', () => {
      const data: GoodreadsBookData = {
        bookId: '12345',
        title: 'Test Book',
        author: 'Test Author',
        authorAdditional: '   ',
        isbn: '',
        publisher: '  ',
        myReview: '',
        dateAdded: new Date('2024-01-01'),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const book = new GoodreadsBook(data);

      expect(book.authorAdditional).toBeUndefined();
      expect(book.isbn).toBeUndefined();
      expect(book.publisher).toBeUndefined();
      expect(book.myReview).toBeUndefined();
    });
  });

  describe('constructor - validation errors', () => {
    it('should throw error when title is missing', () => {
      const data = { ...validBookData, title: '' };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Title is required and cannot be empty'
      );
    });

    it('should throw error when title is only whitespace', () => {
      const data = { ...validBookData, title: '   ' };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Title is required and cannot be empty'
      );
    });

    it('should throw error when author is missing', () => {
      const data = { ...validBookData, author: '' };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Author is required and cannot be empty'
      );
    });

    it('should throw error when author is only whitespace', () => {
      const data = { ...validBookData, author: '   ' };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Author is required and cannot be empty'
      );
    });

    it('should throw error when bookId is missing', () => {
      const data = { ...validBookData, bookId: '' };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Book ID is required and cannot be empty'
      );
    });

    it('should throw error when bookId is only whitespace', () => {
      const data = { ...validBookData, bookId: '   ' };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Book ID is required and cannot be empty'
      );
    });

    it('should throw error when exclusiveShelf is missing', () => {
      const data = { ...validBookData, exclusiveShelf: undefined as any };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Exclusive shelf is required'
      );
    });

    it('should throw error when dateAdded is missing', () => {
      const data = { ...validBookData, dateAdded: undefined as any };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Date Added is required'
      );
    });
  });

  describe('constructor - rating validation', () => {
    it('should accept valid ratings (0-5)', () => {
      expect(() => new GoodreadsBook({ ...validBookData, myRating: 0 })).not.toThrow();
      expect(() => new GoodreadsBook({ ...validBookData, myRating: 3 })).not.toThrow();
      expect(() => new GoodreadsBook({ ...validBookData, myRating: 5 })).not.toThrow();
    });

    it('should throw error for negative rating', () => {
      const data = { ...validBookData, myRating: -1 };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Rating must be between 0 and 5. Received: -1'
      );
    });

    it('should throw error for rating above 5', () => {
      const data = { ...validBookData, myRating: 6 };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Rating must be between 0 and 5. Received: 6'
      );
    });

    it('should throw error for rating above 5 with averageRating', () => {
      const data = { ...validBookData, averageRating: 6 };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Average rating must be between 0 and 5. Received: 6'
      );
    });

    it('should throw error for negative averageRating', () => {
      const data = { ...validBookData, averageRating: -1 };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Average rating must be between 0 and 5. Received: -1'
      );
    });
  });

  describe('constructor - page count validation', () => {
    it('should accept valid page counts', () => {
      expect(() => new GoodreadsBook({ ...validBookData, numberOfPages: 0 })).not.toThrow();
      expect(() => new GoodreadsBook({ ...validBookData, numberOfPages: 100 })).not.toThrow();
      expect(() => new GoodreadsBook({ ...validBookData, numberOfPages: 1000 })).not.toThrow();
    });

    it('should throw error for negative page count', () => {
      const data = { ...validBookData, numberOfPages: -10 };
      expect(() => new GoodreadsBook(data)).toThrow(
        'Number of pages cannot be negative. Received: -10'
      );
    });
  });

  describe('getAllAuthors', () => {
    it('should return only primary author when no additional authors', () => {
      const data = { ...validBookData, authorAdditional: undefined };
      const book = new GoodreadsBook(data);

      expect(book.getAllAuthors()).toEqual(['Test Author']);
    });

    it('should return primary and additional authors', () => {
      const book = new GoodreadsBook(validBookData);

      expect(book.getAllAuthors()).toEqual([
        'Test Author',
        'Co-Author One',
        'Co-Author Two',
      ]);
    });

    it('should handle additional authors with extra whitespace', () => {
      const data = {
        ...validBookData,
        authorAdditional: '  Co-Author One  ,  Co-Author Two  ',
      };
      const book = new GoodreadsBook(data);

      expect(book.getAllAuthors()).toEqual([
        'Test Author',
        'Co-Author One',
        'Co-Author Two',
      ]);
    });

    it('should filter out empty additional author entries', () => {
      const data = {
        ...validBookData,
        authorAdditional: 'Co-Author One, , Co-Author Two,',
      };
      const book = new GoodreadsBook(data);

      expect(book.getAllAuthors()).toEqual([
        'Test Author',
        'Co-Author One',
        'Co-Author Two',
      ]);
    });

    it('should handle single additional author', () => {
      const data = { ...validBookData, authorAdditional: 'Single Co-Author' };
      const book = new GoodreadsBook(data);

      expect(book.getAllAuthors()).toEqual(['Test Author', 'Single Co-Author']);
    });
  });

  describe('getGenreShelves', () => {
    it('should filter out status shelves', () => {
      const data = {
        ...validBookData,
        bookshelves: ['fiction', 'to-read', 'science-fiction', 'currently-reading', 'favorites', 'read'],
      };
      const book = new GoodreadsBook(data);

      expect(book.getGenreShelves()).toEqual(['fiction', 'science-fiction']);
    });

    it('should return all shelves when no status shelves present', () => {
      const data = {
        ...validBookData,
        bookshelves: ['fiction', 'science-fiction', 'thriller'],
      };
      const book = new GoodreadsBook(data);

      expect(book.getGenreShelves()).toEqual(['fiction', 'science-fiction', 'thriller']);
    });

    it('should return empty array when all shelves are status shelves', () => {
      const data = {
        ...validBookData,
        bookshelves: ['to-read', 'currently-reading', 'read', 'favorites'],
      };
      const book = new GoodreadsBook(data);

      expect(book.getGenreShelves()).toEqual([]);
    });

    it('should handle case-insensitive status shelf filtering', () => {
      const data = {
        ...validBookData,
        bookshelves: ['fiction', 'TO-READ', 'Science-Fiction', 'CURRENTLY-READING'],
      };
      const book = new GoodreadsBook(data);

      expect(book.getGenreShelves()).toEqual(['fiction', 'Science-Fiction']);
    });

    it('should return empty array when no bookshelves', () => {
      const data = { ...validBookData, bookshelves: [] };
      const book = new GoodreadsBook(data);

      expect(book.getGenreShelves()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle books with zero pages', () => {
      const data = { ...validBookData, numberOfPages: 0 };
      const book = new GoodreadsBook(data);

      expect(book.numberOfPages).toBe(0);
    });

    it('should handle books with zero rating', () => {
      const data = { ...validBookData, myRating: 0 };
      const book = new GoodreadsBook(data);

      expect(book.myRating).toBe(0);
    });

    it('should handle all valid exclusive shelf values', () => {
      const toReadBook = new GoodreadsBook({ ...validBookData, exclusiveShelf: 'to-read' });
      const readingBook = new GoodreadsBook({ ...validBookData, exclusiveShelf: 'currently-reading' });
      const readBook = new GoodreadsBook({ ...validBookData, exclusiveShelf: 'read' });

      expect(toReadBook.exclusiveShelf).toBe('to-read');
      expect(readingBook.exclusiveShelf).toBe('currently-reading');
      expect(readBook.exclusiveShelf).toBe('read');
    });

    it('should handle very long text fields', () => {
      const longTitle = 'A'.repeat(500);
      const longAuthor = 'B'.repeat(200);
      const longReview = 'C'.repeat(10000);

      const data = {
        ...validBookData,
        title: longTitle,
        author: longAuthor,
        myReview: longReview,
      };

      const book = new GoodreadsBook(data);

      expect(book.title).toBe(longTitle);
      expect(book.author).toBe(longAuthor);
      expect(book.myReview).toBe(longReview);
    });

    it('should handle special characters in text fields', () => {
      const data = {
        ...validBookData,
        title: 'Test Book: A "Special" Title (2024)',
        author: "O'Brien, James-John",
        myReview: 'Great book!\nMultiple lines\nWith\ttabs',
      };

      const book = new GoodreadsBook(data);

      expect(book.title).toBe('Test Book: A "Special" Title (2024)');
      expect(book.author).toBe("O'Brien, James-John");
      expect(book.myReview).toBe('Great book!\nMultiple lines\nWith\ttabs');
    });
  });
});