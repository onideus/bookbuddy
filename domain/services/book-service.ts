import { IBookRepository } from '../interfaces/book-repository';
import { Book, BookStatus } from '../entities/book';
import { ReadingStatus } from '../value-objects/reading-status';
import { NotFoundError, UnauthorizedError, ValidationError } from '../errors/domain-errors';

export class BookService {
  constructor(private bookRepository: IBookRepository) {}

  async updateReadingProgress(
    bookId: string,
    userId: string,
    currentPage: number
  ): Promise<Book> {
    const book = await this.bookRepository.findById(bookId);

    if (!book) {
      throw new NotFoundError('Book', bookId);
    }

    if (book.userId !== userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    const readingStatus = new ReadingStatus(book);
    readingStatus.validatePageProgress(currentPage);

    const updates: Partial<Book> = { currentPage };

    // Auto-mark as read if completed
    if (readingStatus.shouldAutoMarkAsRead()) {
      const statusUpdates = readingStatus.transitionTo('read');
      Object.assign(updates, statusUpdates);
    }

    const updated = await this.bookRepository.update(bookId, updates);

    if (!updated) {
      throw new NotFoundError('Book', bookId);
    }

    return updated;
  }

  async updateStatus(
    bookId: string,
    userId: string,
    newStatus: BookStatus
  ): Promise<Book> {
    const book = await this.bookRepository.findById(bookId);

    if (!book) {
      throw new NotFoundError('Book', bookId);
    }

    if (book.userId !== userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    const readingStatus = new ReadingStatus(book);
    const updates = readingStatus.transitionTo(newStatus);

    const updated = await this.bookRepository.update(bookId, updates);

    if (!updated) {
      throw new NotFoundError('Book', bookId);
    }

    return updated;
  }

  async rateBook(
    bookId: string,
    userId: string,
    rating: number
  ): Promise<Book> {
    const book = await this.bookRepository.findById(bookId);

    if (!book) {
      throw new NotFoundError('Book', bookId);
    }

    if (book.userId !== userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    const readingStatus = new ReadingStatus(book);
    readingStatus.validateRating(rating);

    const updated = await this.bookRepository.update(bookId, { rating });

    if (!updated) {
      throw new NotFoundError('Book', bookId);
    }

    return updated;
  }

  async getReadingStatistics(userId: string) {
    const books = await this.bookRepository.findByUserId(userId);

    const stats = {
      total: books.length,
      wantToRead: 0,
      reading: 0,
      read: 0,
      totalPagesRead: 0,
      averageRating: 0,
      currentlyReading: [] as Book[],
    };

    let ratedBooksCount = 0;
    let totalRating = 0;

    for (const book of books) {
      switch (book.status) {
        case 'want-to-read':
          stats.wantToRead++;
          break;
        case 'reading':
          stats.reading++;
          stats.currentlyReading.push(book);
          break;
        case 'read':
          stats.read++;
          if (book.pageCount) {
            stats.totalPagesRead += book.pageCount;
          }
          if (book.rating) {
            totalRating += book.rating;
            ratedBooksCount++;
          }
          break;
      }
    }

    if (ratedBooksCount > 0) {
      stats.averageRating = Math.round((totalRating / ratedBooksCount) * 10) / 10;
    }

    return stats;
  }
}
