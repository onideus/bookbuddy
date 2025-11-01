import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { Book, BookStatus } from '../../../domain/entities/book';
import { DuplicateError } from '../../../domain/errors/domain-errors';
import { randomUUID } from 'crypto';

export interface AddBookInput {
  userId: string;
  googleBooksId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  description?: string;
  pageCount?: number;
  status: BookStatus;
}

export class AddBookUseCase {
  constructor(private bookRepository: IBookRepository) {}

  async execute(input: AddBookInput): Promise<Book> {
    // Check for duplicates
    const userBooks = await this.bookRepository.findByUserId(input.userId);
    const duplicate = userBooks.find(
      book => book.googleBooksId === input.googleBooksId
    );

    if (duplicate) {
      throw new DuplicateError('Book', 'googleBooksId');
    }

    const book: Book = {
      id: randomUUID(),
      userId: input.userId,
      googleBooksId: input.googleBooksId,
      title: input.title,
      authors: input.authors,
      thumbnail: input.thumbnail,
      description: input.description,
      pageCount: input.pageCount,
      status: input.status,
      addedAt: new Date(),
    };

    return this.bookRepository.create(book);
  }
}
