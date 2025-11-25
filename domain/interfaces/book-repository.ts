import { Book } from '../entities/book';

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface PaginatedBooks {
  books: Book[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface IBookRepository {
  create(book: Book): Promise<Book>;
  findByUserId(userId: string): Promise<Book[]>;
  findByUserIdPaginated(userId: string, options: PaginationOptions): Promise<PaginatedBooks>;
  findById(id: string): Promise<Book | undefined>;
  update(id: string, updates: Partial<Book>): Promise<Book | null>;
  delete(id: string): Promise<boolean>;
  findByStatus(userId: string, status: string): Promise<Book[]>;
  findByGenre(userId: string, genre: string): Promise<Book[]>;
  getUniqueGenres(userId: string): Promise<string[]>;
  countByUserId(userId: string): Promise<number>;
}
