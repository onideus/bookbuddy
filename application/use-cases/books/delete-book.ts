import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { NotFoundError, UnauthorizedError } from '../../../domain/errors/domain-errors';

export interface DeleteBookInput {
  bookId: string;
  userId: string;
}

export class DeleteBookUseCase {
  constructor(private bookRepository: IBookRepository) {}

  async execute(input: DeleteBookInput): Promise<void> {
    const book = await this.bookRepository.findById(input.bookId);

    if (!book) {
      throw new NotFoundError('Book', input.bookId);
    }

    if (book.userId !== input.userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    await this.bookRepository.delete(input.bookId);
  }
}
