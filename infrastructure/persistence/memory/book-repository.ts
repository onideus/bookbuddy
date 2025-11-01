import { IBookRepository } from '../../../domain/interfaces/book-repository';
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
}
