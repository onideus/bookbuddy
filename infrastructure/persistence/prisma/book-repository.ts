import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { Book } from '../../../domain/entities/book';
import { prisma } from './client';

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

  async findById(id: string): Promise<Book | undefined> {
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) return undefined;

    return this.mapToBook(book);
  }

  async update(id: string, updates: Partial<Book>): Promise<Book | null> {
    try {
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
        },
      });

      return this.mapToBook(updated);
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.book.delete({
        where: { id },
      });
      return true;
    } catch (error) {
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

  private mapToBook(prismaBook: any): Book {
    return {
      id: prismaBook.id,
      userId: prismaBook.userId,
      googleBooksId: prismaBook.googleBooksId,
      title: prismaBook.title,
      authors: prismaBook.authors,
      thumbnail: prismaBook.thumbnail ?? undefined,
      description: prismaBook.description ?? undefined,
      pageCount: prismaBook.pageCount ?? undefined,
      status: prismaBook.status,
      currentPage: prismaBook.currentPage ?? undefined,
      rating: prismaBook.rating ?? undefined,
      addedAt: prismaBook.addedAt,
      finishedAt: prismaBook.finishedAt ?? undefined,
    };
  }
}
