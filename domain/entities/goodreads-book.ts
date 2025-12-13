/**
 * Type representing the exclusive shelf (reading status) from Goodreads.
 */
export type GoodreadsExclusiveShelf = 'to-read' | 'currently-reading' | 'read';

/**
 * Interface representing the raw data from a Goodreads CSV export.
 * This can be used for partial data or error reporting.
 */
export interface GoodreadsBookData {
  bookId: string;
  title: string;
  author: string;
  authorAdditional?: string;
  isbn?: string;
  isbn13?: string;
  myRating?: number;
  averageRating?: number;
  publisher?: string;
  binding?: string;
  yearPublished?: number;
  originalPublicationYear?: number;
  dateRead?: Date;
  dateAdded: Date;
  bookshelves: string[];
  exclusiveShelf: GoodreadsExclusiveShelf;
  myReview?: string;
  numberOfPages?: number;
}

/**
 * Entity representing a book imported from a Goodreads CSV export.
 * Includes validation to ensure required fields are present.
 */
export class GoodreadsBook {
  readonly bookId: string;
  readonly title: string;
  readonly author: string;
  readonly authorAdditional?: string;
  readonly isbn?: string;
  readonly isbn13?: string;
  readonly myRating?: number;
  readonly averageRating?: number;
  readonly publisher?: string;
  readonly binding?: string;
  readonly yearPublished?: number;
  readonly originalPublicationYear?: number;
  readonly dateRead?: Date;
  readonly dateAdded: Date;
  readonly bookshelves: string[];
  readonly exclusiveShelf: GoodreadsExclusiveShelf;
  readonly myReview?: string;
  readonly numberOfPages?: number;

  /**
   * Creates a new GoodreadsBook instance.
   * @param data - The book data from Goodreads CSV
   * @throws Error if required fields (title, author) are missing or empty
   */
  constructor(data: GoodreadsBookData) {
    // Validate required fields with detailed error messages
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required and cannot be empty. Please ensure the CSV contains a valid title.');
    }
    if (!data.author || data.author.trim().length === 0) {
      throw new Error('Author is required and cannot be empty. Please ensure the CSV contains a valid author.');
    }
    if (!data.bookId || data.bookId.trim().length === 0) {
      throw new Error('Book ID is required and cannot be empty. Please ensure the CSV contains a valid Goodreads Book ID.');
    }
    if (!data.exclusiveShelf) {
      throw new Error('Exclusive shelf is required. Valid values are: to-read, currently-reading, read.');
    }
    if (!data.dateAdded) {
      throw new Error('Date Added is required. Please ensure the CSV contains a valid date in YYYY/MM/DD format.');
    }

    // Validate rating if provided (must be 0-5)
    if (data.myRating !== undefined && (data.myRating < 0 || data.myRating > 5)) {
      throw new Error(`Rating must be between 0 and 5. Received: ${data.myRating}`);
    }

    // Validate page count if provided (must be positive)
    if (data.numberOfPages !== undefined && data.numberOfPages < 0) {
      throw new Error(`Number of pages cannot be negative. Received: ${data.numberOfPages}`);
    }

    // Validate average rating if provided (must be 0-5)
    if (data.averageRating !== undefined && (data.averageRating < 0 || data.averageRating > 5)) {
      throw new Error(`Average rating must be between 0 and 5. Received: ${data.averageRating}`);
    }

    this.bookId = data.bookId.trim();
    this.title = data.title.trim();
    this.author = data.author.trim();
    this.authorAdditional = data.authorAdditional?.trim() || undefined;
    this.isbn = data.isbn?.trim() || undefined;
    this.isbn13 = data.isbn13?.trim() || undefined;
    this.myRating = data.myRating;
    this.averageRating = data.averageRating;
    this.publisher = data.publisher?.trim() || undefined;
    this.binding = data.binding?.trim() || undefined;
    this.yearPublished = data.yearPublished;
    this.originalPublicationYear = data.originalPublicationYear;
    this.dateRead = data.dateRead;
    this.dateAdded = data.dateAdded;
    this.bookshelves = data.bookshelves || [];
    this.exclusiveShelf = data.exclusiveShelf;
    this.myReview = data.myReview?.trim() || undefined;
    this.numberOfPages = data.numberOfPages;
  }

  /**
   * Returns all authors as an array, combining primary author and additional authors.
   */
  getAllAuthors(): string[] {
    const authors = [this.author];
    if (this.authorAdditional) {
      // Additional authors are comma-separated
      const additionalAuthors = this.authorAdditional
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
      authors.push(...additionalAuthors);
    }
    return authors;
  }

  /**
   * Returns non-status bookshelves that can be used as genres.
   */
  getGenreShelves(): string[] {
    const statusShelves = ['to-read', 'currently-reading', 'read', 'favorites'];
    return this.bookshelves.filter(shelf => !statusShelves.includes(shelf.toLowerCase()));
  }
}