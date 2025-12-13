import { Book, BookStatus } from '../entities/book';
import { GoodreadsBook, GoodreadsExclusiveShelf } from '../entities/goodreads-book';
import { v4 as uuidv4 } from 'uuid';

/**
 * Maps Goodreads exclusive shelf values to BookBuddy status values.
 */
const SHELF_TO_STATUS_MAP: Record<GoodreadsExclusiveShelf, BookStatus> = {
  'to-read': 'want-to-read',
  'currently-reading': 'reading',
  'read': 'read',
};

/**
 * Service for mapping Goodreads book data to BookBuddy Book entities.
 * Implements the mapping logic defined in the design document section 3.1.
 */
export class GoodreadsMapper {
  /**
   * Maps a GoodreadsBook entity to a BookBuddy Book entity.
   * 
   * Mapping rules:
   * - exclusiveShelf → status (to-read→want-to-read, currently-reading→reading, read→read)
   * - author + authorAdditional → authors array
   * - bookshelves (excluding status shelves) → genres
   * - dateAdded → addedAt
   * - dateRead → finishedAt (only if status is 'read')
   * - 'goodreads-{bookId}' → googleBooksId (placeholder per design doc section 8.1)
   * - numberOfPages → pageCount
   * - currentPage starts at 0
   * 
   * @param goodreadsBook - The Goodreads book to map
   * @param userId - The user ID to associate with the book
   * @returns A new Book entity
   */
  mapToBook(goodreadsBook: GoodreadsBook, userId: string): Book {
    // Validate inputs (defensive programming)
    if (!goodreadsBook) {
      throw new Error('GoodreadsBook is required for mapping');
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required for mapping');
    }

    const status = this.mapStatus(goodreadsBook.exclusiveShelf);
    const authors = goodreadsBook.getAllAuthors();
    const genres = goodreadsBook.getGenreShelves();

    // Only set finishedAt if the book is marked as read and has a dateRead
    const finishedAt = status === 'read' && goodreadsBook.dateRead
      ? goodreadsBook.dateRead
      : undefined;

    // Only include rating if the book is read and rating is greater than 0
    // Goodreads uses 0 to indicate "not rated"
    const rating = status === 'read' && goodreadsBook.myRating && goodreadsBook.myRating > 0
      ? goodreadsBook.myRating
      : undefined;

    // Validate authors array is not empty
    if (!authors || authors.length === 0) {
      throw new Error('Book must have at least one author');
    }

    return {
      id: uuidv4(),
      userId,
      googleBooksId: `goodreads-${goodreadsBook.bookId}`,
      title: goodreadsBook.title,
      authors,
      thumbnail: undefined, // Goodreads CSV doesn't include image URLs
      description: undefined, // Goodreads CSV doesn't include descriptions
      pageCount: goodreadsBook.numberOfPages,
      status,
      currentPage: 0, // Start at 0, user can update later
      rating,
      addedAt: goodreadsBook.dateAdded,
      finishedAt,
      genres,
    };
  }

  /**
   * Maps a Goodreads exclusive shelf to a BookBuddy status.
   * @param exclusiveShelf - The Goodreads shelf value
   * @returns The corresponding BookBuddy status
   */
  private mapStatus(exclusiveShelf: GoodreadsExclusiveShelf): BookStatus {
    return SHELF_TO_STATUS_MAP[exclusiveShelf];
  }
}