import {
  IBookRepository,
  PaginationOptions,
  PaginatedBooks,
} from '../../../domain/interfaces/book-repository';
import { Book, BookStatus } from '../../../domain/entities/book';
import { prisma } from './client';
import type { Book as PrismaBook } from '@prisma/client';
import { createLogger } from '../../logging';

const log = createLogger('BookRepository');
const DEFAULT_PAGE_SIZE = 20;

export class PrismaBookRepository implements IBookRepository {
  async create(book: Book): Promise<Book> {
    const created = await prisma.book.create({
      data: {
        id: book.id,
        userId: book.userId,
        googleBooksId: book.googleBooksId,
        title: book.title,
        authors: book.authors,
        thumbnail: book.thumbnail,
        description: book.description,
        pageCount: book.pageCount,
        status: book.status,
        currentPage: book.currentPage ?? 0,
        rating: book.rating,
        addedAt: book.addedAt,
        finishedAt: book.finishedAt,
        genres: book.genres ?? [],
      },
    });

    return this.mapToBook(created);
  }

  async findByUserId(userId: string): Promise<Book[]> {
    const books = await prisma.book.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });

    return books.map(this.mapToBook);
  }

  async findByUserIdPaginated(
    userId: string,
    options: PaginationOptions
  ): Promise<PaginatedBooks> {
    const limit = options.limit ?? DEFAULT_PAGE_SIZE;

    // Get total count
    const totalCount = await prisma.book.count({ where: { userId } });

    let books;
    if (options.cursor) {
      books = await prisma.book.findMany({
        where: { userId },
        orderBy: { addedAt: 'desc' },
        take: limit + 1,
        cursor: { id: options.cursor },
        skip: 1,
      });
    } else {
      books = await prisma.book.findMany({
        where: { userId },
        orderBy: { addedAt: 'desc' },
        take: limit + 1,
      });
    }

    const hasMore = books.length > limit;
    const resultBooks = hasMore ? books.slice(0, limit) : books;
    const nextCursor = hasMore ? resultBooks[resultBooks.length - 1]?.id ?? null : null;

    return {
      books: resultBooks.map(this.mapToBook),
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  async countByUserId(userId: string): Promise<number> {
    return prisma.book.count({ where: { userId } });
  }

  async findById(id: string): Promise<Book | undefined> {
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) return undefined;

    return this.mapToBook(book);
  }

  async update(id: string, updates: Partial<Book>): Promise<Book | null> {
    try {
      log.debug('Updating book', { bookId: id, fields: Object.keys(updates) });
      const updated = await prisma.book.update({
        where: { id },
        data: {
          ...(updates.status !== undefined && { status: updates.status }),
          ...(updates.currentPage !== undefined && { currentPage: updates.currentPage }),
          ...(updates.rating !== undefined && { rating: updates.rating }),
          ...(updates.finishedAt !== undefined && { finishedAt: updates.finishedAt }),
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.authors !== undefined && { authors: updates.authors }),
          ...(updates.thumbnail !== undefined && { thumbnail: updates.thumbnail }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.pageCount !== undefined && { pageCount: updates.pageCount }),
          ...(updates.genres !== undefined && { genres: updates.genres }),
        },
      });

      log.info('Book updated successfully', { bookId: updated.id });
      return this.mapToBook(updated);
    } catch (error) {
      log.error('Failed to update book', { bookId: id, error: (error as Error).message });
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.book.delete({
        where: { id },
      });
      return true;
    } catch (_error) {
      return false;
    }
  }

  async findByStatus(userId: string, status: string): Promise<Book[]> {
    const books = await prisma.book.findMany({
      where: {
        userId,
        status,
      },
      orderBy: { addedAt: 'desc' },
    });

    return books.map(this.mapToBook);
  }

  async findByGenre(userId: string, genre: string): Promise<Book[]> {
    const books = await prisma.book.findMany({
      where: {
        userId,
        genres: { has: genre },
      },
      orderBy: { addedAt: 'desc' },
    });

    return books.map(this.mapToBook);
  }

  async getUniqueGenres(userId: string): Promise<string[]> {
    const books = await prisma.book.findMany({
      where: { userId },
      select: { genres: true },
    });

    const allGenres = books.flatMap((book) => book.genres);
    const uniqueGenres = [...new Set(allGenres)].sort();
    return uniqueGenres;
  }

  async existsByGoogleBooksId(userId: string, googleBooksId: string): Promise<boolean> {
    const count = await prisma.book.count({
      where: {
        userId,
        googleBooksId,
      },
    });
    return count > 0;
  }

  async findByISBN(userId: string, isbn: string): Promise<Book | null> {
    // Since ISBN fields don't exist in the schema, search by description or googleBooksId
    // For now, we'll use a simple description search as a fallback
    // Note: This is a workaround until ISBN fields are added to the schema
    const books = await prisma.book.findMany({
      where: {
        userId,
        OR: [
          {
            description: {
              contains: isbn,
              mode: 'insensitive',
            },
          },
          {
            googleBooksId: {
              contains: isbn,
            },
          },
        ],
      },
    });

    // Return first match or null
    return books.length > 0 ? this.mapToBook(books[0]) : null;
  }

  async findByTitleAndAuthor(userId: string, title: string, author: string): Promise<Book | null> {
    // Normalize for comparison
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedAuthor = author.toLowerCase().trim();

    const books = await prisma.book.findMany({
      where: {
        userId,
        title: {
          contains: normalizedTitle,
          mode: 'insensitive',
        },
      },
    });

    // Filter books where any author matches (case-insensitive)
    for (const book of books) {
      const hasMatchingAuthor = book.authors.some(
        a => a.toLowerCase().includes(normalizedAuthor) || normalizedAuthor.includes(a.toLowerCase())
      );
      if (hasMatchingAuthor) {
        return this.mapToBook(book);
      }
    }

    return null;
  }

  async findByGoodreadsId(userId: string, goodreadsId: string): Promise<Book | null> {
    const book = await prisma.book.findFirst({
      where: {
        userId,
        googleBooksId: `goodreads-${goodreadsId}`,
      },
    });

    return book ? this.mapToBook(book) : null;
  }

  private mapToBook(prismaBook: PrismaBook): Book {
    return {
      id: prismaBook.id,
      userId: prismaBook.userId,
      googleBooksId: prismaBook.googleBooksId,
      title: prismaBook.title,
      authors: prismaBook.authors,
      thumbnail: prismaBook.thumbnail ?? undefined,
      description: prismaBook.description ?? undefined,
      pageCount: prismaBook.pageCount ?? undefined,
      status: prismaBook.status as BookStatus,
      currentPage: prismaBook.currentPage ?? undefined,
      rating: prismaBook.rating ?? undefined,
      addedAt: prismaBook.addedAt,
      finishedAt: prismaBook.finishedAt ?? undefined,
      genres: prismaBook.genres ?? [],
    };
  }
}
