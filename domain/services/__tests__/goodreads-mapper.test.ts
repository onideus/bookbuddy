import { describe, it, expect, beforeEach } from 'vitest';
import { GoodreadsMapper } from '../goodreads-mapper';
import { GoodreadsBook, GoodreadsBookData } from '../../entities/goodreads-book';

describe('GoodreadsMapper', () => {
  let mapper: GoodreadsMapper;
  const userId = 'user-123';

  beforeEach(() => {
    mapper = new GoodreadsMapper();
  });

  describe('mapToBook', () => {
    it('should map a complete GoodreadsBook to Book entity', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '12345',
        title: 'Test Book',
        author: 'Primary Author',
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
        bookshelves: ['fiction', 'science-fiction', 'favorites'],
        exclusiveShelf: 'read',
        myReview: 'Great book!',
        numberOfPages: 350,
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.id).toBeDefined();
      expect(book.userId).toBe(userId);
      expect(book.googleBooksId).toBe('goodreads-12345');
      expect(book.title).toBe('Test Book');
      expect(book.authors).toEqual(['Primary Author', 'Co-Author One', 'Co-Author Two']);
      expect(book.thumbnail).toBeUndefined();
      expect(book.description).toBeUndefined();
      expect(book.pageCount).toBe(350);
      expect(book.status).toBe('read');
      expect(book.currentPage).toBe(0);
      expect(book.rating).toBe(4);
      expect(book.addedAt).toEqual(new Date('2024-01-01'));
      expect(book.finishedAt).toEqual(new Date('2024-01-15'));
      expect(book.genres).toEqual(['fiction', 'science-fiction']);
    });

    it('should map minimal GoodreadsBook to Book entity', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '67890',
        title: 'Minimal Book',
        author: 'Single Author',
        dateAdded: new Date('2024-02-01'),
        bookshelves: [],
        exclusiveShelf: 'to-read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.userId).toBe(userId);
      expect(book.googleBooksId).toBe('goodreads-67890');
      expect(book.title).toBe('Minimal Book');
      expect(book.authors).toEqual(['Single Author']);
      expect(book.pageCount).toBeUndefined();
      expect(book.status).toBe('want-to-read');
      expect(book.currentPage).toBe(0);
      expect(book.rating).toBeUndefined();
      expect(book.finishedAt).toBeUndefined();
      expect(book.genres).toEqual([]);
    });
  });

  describe('status mapping', () => {
    it('should map "to-read" to "want-to-read"', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'To Read Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'to-read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.status).toBe('want-to-read');
      expect(book.finishedAt).toBeUndefined();
      expect(book.rating).toBeUndefined();
    });

    it('should map "currently-reading" to "reading"', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '2',
        title: 'Reading Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'currently-reading',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.status).toBe('reading');
      expect(book.finishedAt).toBeUndefined();
      expect(book.rating).toBeUndefined();
    });

    it('should map "read" to "read"', () => {
      const dateRead = new Date('2024-01-15');
      const goodreadsData: GoodreadsBookData = {
        bookId: '3',
        title: 'Read Book',
        author: 'Author',
        dateAdded: new Date('2024-01-01'),
        dateRead,
        myRating: 5,
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.status).toBe('read');
      expect(book.finishedAt).toEqual(dateRead);
      expect(book.rating).toBe(5);
    });
  });

  describe('author combination', () => {
    it('should handle single author', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Single Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.authors).toEqual(['Single Author']);
    });

    it('should combine primary and additional authors', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '2',
        title: 'Book',
        author: 'Primary',
        authorAdditional: 'Second, Third',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.authors).toEqual(['Primary', 'Second', 'Third']);
    });

    it('should handle authors with special characters', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '3',
        title: 'Book',
        author: "O'Brien, Patrick",
        authorAdditional: "D'Arcy, Jean-Luc, Smith-Jones",
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.authors).toEqual(["O'Brien, Patrick", "D'Arcy", "Jean-Luc", "Smith-Jones"]);
    });
  });

  describe('genre extraction from bookshelves', () => {
    it('should extract genre shelves and exclude status shelves', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: ['fiction', 'to-read', 'science-fiction', 'favorites', 'thriller'],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.genres).toEqual(['fiction', 'science-fiction', 'thriller']);
    });

    it('should handle empty bookshelves', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '2',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.genres).toEqual([]);
    });

    it('should filter out all status shelves', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '3',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: ['to-read', 'currently-reading', 'read', 'favorites'],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.genres).toEqual([]);
    });
  });

  describe('date handling', () => {
    it('should set finishedAt only for read books with dateRead', () => {
      const dateRead = new Date('2024-03-15');
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date('2024-01-01'),
        dateRead,
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.finishedAt).toEqual(dateRead);
    });

    it('should not set finishedAt for read books without dateRead', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '2',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date('2024-01-01'),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.finishedAt).toBeUndefined();
    });

    it('should not set finishedAt for non-read books even with dateRead', () => {
      const dateRead = new Date('2024-03-15');
      const goodreadsData: GoodreadsBookData = {
        bookId: '3',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date('2024-01-01'),
        dateRead,
        bookshelves: [],
        exclusiveShelf: 'currently-reading',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.status).toBe('reading');
      expect(book.finishedAt).toBeUndefined();
    });

    it('should always set addedAt from dateAdded', () => {
      const dateAdded = new Date('2024-02-20');
      const goodreadsData: GoodreadsBookData = {
        bookId: '4',
        title: 'Book',
        author: 'Author',
        dateAdded,
        bookshelves: [],
        exclusiveShelf: 'to-read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.addedAt).toEqual(dateAdded);
    });
  });

  describe('rating handling', () => {
    it('should include rating for read books with rating > 0', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        myRating: 4,
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.rating).toBe(4);
    });

    it('should not include rating when myRating is 0', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '2',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        myRating: 0,
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.rating).toBeUndefined();
    });

    it('should not include rating for non-read books', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '3',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        myRating: 5,
        bookshelves: [],
        exclusiveShelf: 'currently-reading',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.status).toBe('reading');
      expect(book.rating).toBeUndefined();
    });

    it('should not include rating when undefined', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '4',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.rating).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle books with no optional fields', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Minimal',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'to-read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.pageCount).toBeUndefined();
      expect(book.rating).toBeUndefined();
      expect(book.finishedAt).toBeUndefined();
      expect(book.thumbnail).toBeUndefined();
      expect(book.description).toBeUndefined();
    });

    it('should always set currentPage to 0', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '2',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.currentPage).toBe(0);
    });

    it('should always set thumbnail and description to undefined', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '3',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.thumbnail).toBeUndefined();
      expect(book.description).toBeUndefined();
    });

    it('should create placeholder googleBooksId from Goodreads bookId', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '98765',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book = mapper.mapToBook(goodreadsBook, userId);

      expect(book.googleBooksId).toBe('goodreads-98765');
    });

    it('should generate unique IDs for each book', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      const book1 = mapper.mapToBook(goodreadsBook, userId);
      const book2 = mapper.mapToBook(goodreadsBook, userId);

      expect(book1.id).not.toBe(book2.id);
      expect(book1.id).toBeDefined();
      expect(book2.id).toBeDefined();
    });
  });

  describe('validation errors', () => {
    it('should throw error when GoodreadsBook is null', () => {
      expect(() => mapper.mapToBook(null as any, userId)).toThrow(
        'GoodreadsBook is required for mapping'
      );
    });

    it('should throw error when GoodreadsBook is undefined', () => {
      expect(() => mapper.mapToBook(undefined as any, userId)).toThrow(
        'GoodreadsBook is required for mapping'
      );
    });

    it('should throw error when userId is empty', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      expect(() => mapper.mapToBook(goodreadsBook, '')).toThrow(
        'User ID is required for mapping'
      );
    });

    it('should throw error when userId is whitespace', () => {
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      expect(() => mapper.mapToBook(goodreadsBook, '   ')).toThrow(
        'User ID is required for mapping'
      );
    });

    it('should throw error when book has no authors', () => {
      // This would require bypassing GoodreadsBook constructor validation
      // The validation in the mapper is defensive programming
      const goodreadsData: GoodreadsBookData = {
        bookId: '1',
        title: 'Book',
        author: 'Author',
        dateAdded: new Date(),
        bookshelves: [],
        exclusiveShelf: 'read',
      };

      const goodreadsBook = new GoodreadsBook(goodreadsData);
      // Mock getAllAuthors to return empty array
      goodreadsBook.getAllAuthors = () => [];

      expect(() => mapper.mapToBook(goodreadsBook, userId)).toThrow(
        'Book must have at least one author'
      );
    });
  });
});