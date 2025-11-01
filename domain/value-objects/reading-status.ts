import { Book, BookStatus } from '../entities/book';
import { ValidationError } from '../errors/domain-errors';

export class ReadingStatus {
  private book: Book;

  constructor(book: Book) {
    this.book = book;
  }

  canTransitionTo(newStatus: BookStatus): boolean {
    const validTransitions: Record<BookStatus, BookStatus[]> = {
      'want-to-read': ['reading', 'read'],
      'reading': ['want-to-read', 'read'],
      'read': ['reading', 'want-to-read'],
    };

    return validTransitions[this.book.status].includes(newStatus);
  }

  transitionTo(newStatus: BookStatus): Partial<Book> {
    if (!this.canTransitionTo(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${this.book.status} to ${newStatus}`
      );
    }

    const updates: Partial<Book> = { status: newStatus };

    // Auto-set finishedAt when transitioning to 'read'
    if (newStatus === 'read' && !this.book.finishedAt) {
      updates.finishedAt = new Date();

      // Set current page to total pages if available
      if (this.book.pageCount) {
        updates.currentPage = this.book.pageCount;
      }
    }

    // Clear finishedAt when transitioning away from 'read'
    if (this.book.status === 'read' && newStatus !== 'read') {
      updates.finishedAt = undefined;
      updates.rating = undefined; // Clear rating when moving away from 'read'
    }

    // Reset current page when transitioning to 'want-to-read'
    if (newStatus === 'want-to-read') {
      updates.currentPage = 0;
    }

    return updates;
  }

  getReadingProgress(): number {
    if (!this.book.pageCount || this.book.pageCount === 0) return 0;
    if (!this.book.currentPage) return 0;

    const progress = (this.book.currentPage / this.book.pageCount) * 100;
    return Math.min(100, Math.round(progress));
  }

  canBeRated(): boolean {
    return this.book.status === 'read';
  }

  validateRating(rating: number): void {
    if (!this.canBeRated()) {
      throw new ValidationError('Only finished books can be rated');
    }

    if (rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }
  }

  validatePageProgress(currentPage: number): void {
    if (currentPage < 0) {
      throw new ValidationError('Current page cannot be negative');
    }

    if (this.book.pageCount && currentPage > this.book.pageCount) {
      throw new ValidationError(
        `Current page (${currentPage}) cannot exceed total pages (${this.book.pageCount})`
      );
    }
  }

  shouldAutoMarkAsRead(): boolean {
    return (
      this.book.status === 'reading' &&
      this.book.pageCount !== undefined &&
      this.book.currentPage !== undefined &&
      this.book.currentPage >= this.book.pageCount
    );
  }
}
