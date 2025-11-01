import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { Book } from '../../../domain/entities/book';
import { NotFoundError, UnauthorizedError } from '../../../domain/errors/domain-errors';

export interface UpdateBookInput {
  bookId: string;
  userId: string;
  updates: Partial<Book>;
}

export class UpdateBookUseCase {
  constructor(private bookRepository: IBookRepository) {}

  async execute(input: UpdateBookInput): Promise<Book> {
    const book = await this.bookRepository.findById(input.bookId);

    if (!book) {
      throw new NotFoundError('Book', input.bookId);
    }

    if (book.userId !== input.userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    const updated = await this.bookRepository.update(input.bookId, input.updates);

    if (!updated) {
      throw new NotFoundError('Book', input.bookId);
    }

    return updated;
  }
}
