import { Book } from '../entities/book';

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface PaginatedBooks {
  books: Book[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface IBookRepository {
  create(book: Book): Promise<Book>;
  findByUserId(userId: string): Promise<Book[]>;
  findByUserIdPaginated(userId: string, options: PaginationOptions): Promise<PaginatedBooks>;
  findById(id: string): Promise<Book | undefined>;
  update(id: string, updates: Partial<Book>): Promise<Book | null>;
  delete(id: string): Promise<boolean>;
  findByStatus(userId: string, status: string): Promise<Book[]>;
  findByGenre(userId: string, genre: string): Promise<Book[]>;
  getUniqueGenres(userId: string): Promise<string[]>;
  countByUserId(userId: string): Promise<number>;
  /**
   * Checks if a book with the given Google Books ID exists for a user.
   * More efficient than fetching all books when only checking existence.
   */
  existsByGoogleBooksId(userId: string, googleBooksId: string): Promise<boolean>;

  /**
   * Finds a book by ISBN (checks both ISBN-10 and ISBN-13).
   * Used for duplicate detection during Goodreads import.
   * @param userId - The user ID to search within
   * @param isbn - The ISBN to search for (can be ISBN-10 or ISBN-13)
   * @returns The matching book or null if not found
   */
  findByISBN(userId: string, isbn: string): Promise<Book | null>;

  /**
   * Finds a book by normalized title and author.
   * Used for duplicate detection when ISBN is not available.
   * @param userId - The user ID to search within
   * @param title - The book title to search for
   * @param author - The primary author name to search for
   * @returns The matching book or null if not found
   */
  findByTitleAndAuthor(userId: string, title: string, author: string): Promise<Book | null>;

  /**
   * Finds a book by Goodreads ID.
   * Used to prevent duplicate imports from Goodreads.
   * @param userId - The user ID to search within
   * @param goodreadsId - The Goodreads book ID (prefixed with 'goodreads-' in googleBooksId)
   * @returns The matching book or null if not found
   */
  findByGoodreadsId(userId: string, goodreadsId: string): Promise<Book | null>;
}
