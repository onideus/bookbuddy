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
  genres?: string[];
}

export class AddBookUseCase {
  constructor(private bookRepository: IBookRepository) {}

  async execute(input: AddBookInput): Promise<Book> {
    // Check for duplicates using optimized exists query
    const bookExists = await this.bookRepository.existsByGoogleBooksId(
      input.userId,
      input.googleBooksId
    );

    if (bookExists) {
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
      genres: input.genres ?? [],
    };

    return this.bookRepository.create(book);
  }
}
