import { Book } from '../entities/book';

export interface IBookRepository {
  create(book: Book): Promise<Book>;
  findByUserId(userId: string): Promise<Book[]>;
  findById(id: string): Promise<Book | undefined>;
  update(id: string, updates: Partial<Book>): Promise<Book | null>;
  delete(id: string): Promise<boolean>;
  findByStatus(userId: string, status: string): Promise<Book[]>;
}
