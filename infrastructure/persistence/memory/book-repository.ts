import { IBookRepository, PaginationOptions, PaginatedBooks } from '../../../domain/interfaces/book-repository';
import { Book } from '../../../domain/entities/book';
import { memoryDatabase } from './database';

export class MemoryBookRepository implements IBookRepository {
  async create(book: Book): Promise<Book> {
    memoryDatabase.books.set(book.id, book);
    return book;
  }

  async findByUserId(userId: string): Promise<Book[]> {
    return Array.from(memoryDatabase.books.values()).filter(
      b => b.userId === userId
    );
  }

  async findByUserIdPaginated(userId: string, options: PaginationOptions): Promise<PaginatedBooks> {
    const allBooks = await this.findByUserId(userId);
    const limit = options.limit ?? 20;
    
    let startIndex = 0;
    if (options.cursor) {
      const cursorIndex = allBooks.findIndex(b => b.id === options.cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }
    
    const paginatedBooks = allBooks.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedBooks.length > limit;
    const resultBooks = hasMore ? paginatedBooks.slice(0, limit) : paginatedBooks;
    
    return {
      books: resultBooks,
      nextCursor: hasMore ? resultBooks[resultBooks.length - 1]?.id ?? null : null,
      hasMore,
      totalCount: allBooks.length,
    };
  }

  async findById(id: string): Promise<Book | undefined> {
    return memoryDatabase.books.get(id);
  }

  async update(id: string, updates: Partial<Book>): Promise<Book | null> {
    const book = memoryDatabase.books.get(id);
    if (!book) return null;

    const updated = { ...book, ...updates };
    memoryDatabase.books.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return memoryDatabase.books.delete(id);
  }

  async findByStatus(userId: string, status: string): Promise<Book[]> {
    return Array.from(memoryDatabase.books.values()).filter(
      b => b.userId === userId && b.status === status
    );
  }

  async findByGenre(userId: string, genre: string): Promise<Book[]> {
    return Array.from(memoryDatabase.books.values()).filter(
      b => b.userId === userId && b.genres?.includes(genre)
    );
  }

  async getUniqueGenres(userId: string): Promise<string[]> {
    const userBooks = await this.findByUserId(userId);
    const allGenres = userBooks.flatMap(book => book.genres ?? []);
    return [...new Set(allGenres)].sort();
  }

  async countByUserId(userId: string): Promise<number> {
    const userBooks = await this.findByUserId(userId);
    return userBooks.length;
  }

  async existsByGoogleBooksId(userId: string, googleBooksId: string): Promise<boolean> {
    return Array.from(memoryDatabase.books.values()).some(
      b => b.userId === userId && b.googleBooksId === googleBooksId
    );
  }
}
