import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { IGoalRepository } from '../../../domain/interfaces/goal-repository';
import { Book } from '../../../domain/entities/book';
import { NotFoundError, UnauthorizedError } from '../../../domain/errors/domain-errors';

export interface UpdateBookInput {
  bookId: string;
  userId: string;
  updates: Partial<Book>;
}

export class UpdateBookUseCase {
  constructor(
    private bookRepository: IBookRepository,
    private goalRepository?: IGoalRepository
  ) {}

  async execute(input: UpdateBookInput): Promise<Book> {
    const book = await this.bookRepository.findById(input.bookId);

    if (!book) {
      throw new NotFoundError('Book', input.bookId);
    }

    if (book.userId !== input.userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    // Check if status is changing to 'read' from a different status
    const isBecomingRead = input.updates.status === 'read' && book.status !== 'read';

    const updated = await this.bookRepository.update(input.bookId, input.updates);

    if (!updated) {
      throw new NotFoundError('Book', input.bookId);
    }

    // Update goals when a book is marked as read
    if (isBecomingRead && this.goalRepository) {
      await this.updateGoalsProgress(input.userId);
    }

    return updated;
  }

  private async updateGoalsProgress(userId: string): Promise<void> {
    if (!this.goalRepository) return;

    // Get all goals for the user
    const goals = await this.goalRepository.findByUserId(userId);

    // Count books with status 'read'
    const readBooks = await this.bookRepository.findByStatus(userId, 'read');
    const readBooksCount = readBooks.length;

    // Update each goal with the current count
    for (const goal of goals) {
      await this.goalRepository.update(goal.id, {
        currentBooks: readBooksCount,
        completed: readBooksCount >= goal.targetBooks,
      });
    }
  }
}
