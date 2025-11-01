import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { Book } from '../../../domain/entities/book';

export interface GetUserBooksInput {
  userId: string;
}

export class GetUserBooksUseCase {
  constructor(private bookRepository: IBookRepository) {}

  async execute(input: GetUserBooksInput): Promise<Book[]> {
    return this.bookRepository.findByUserId(input.userId);
  }
}
