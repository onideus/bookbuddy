'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Container } from '@/lib/di/container';
import { GetUserBooksUseCase } from '@/application/use-cases/books/get-user-books';
import { AddBookUseCase } from '@/application/use-cases/books/add-book';
import { UpdateBookUseCase } from '@/application/use-cases/books/update-book';
import { DeleteBookUseCase } from '@/application/use-cases/books/delete-book';
import { Book, BookStatus } from '@/domain/entities/book';
import {
  DuplicateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from '@/domain/errors/domain-errors';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getBooksAction(): Promise<ActionResult<Book[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookRepository = Container.getBookRepository();
    const useCase = new GetUserBooksUseCase(bookRepository);
    const books = await useCase.execute({ userId: session.user.id });

    return { success: true, data: books };
  } catch (error) {
    console.error('Error fetching books:', error);
    return { success: false, error: 'Failed to fetch books' };
  }
}

export async function addBookAction(bookData: {
  googleBooksId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  description?: string;
  pageCount?: number;
  status: BookStatus;
}): Promise<ActionResult<Book>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookRepository = Container.getBookRepository();
    const useCase = new AddBookUseCase(bookRepository);

    const book = await useCase.execute({
      userId: session.user.id,
      ...bookData,
    });

    revalidatePath('/books');
    revalidatePath('/dashboard');

    return { success: true, data: book };
  } catch (error) {
    console.error('Error adding book:', error);

    if (error instanceof DuplicateError) {
      return { success: false, error: 'This book is already in your library' };
    }

    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to add book' };
  }
}

export async function updateBookAction(
  bookId: string,
  updates: Partial<Book>
): Promise<ActionResult<Book>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookRepository = Container.getBookRepository();
    const useCase = new UpdateBookUseCase(bookRepository);

    const book = await useCase.execute({
      bookId,
      userId: session.user.id,
      updates,
    });

    revalidatePath('/books');
    revalidatePath('/dashboard');

    return { success: true, data: book };
  } catch (error) {
    console.error('Error updating book:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Book not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this book' };
    }

    return { success: false, error: 'Failed to update book' };
  }
}

export async function deleteBookAction(bookId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookRepository = Container.getBookRepository();
    const useCase = new DeleteBookUseCase(bookRepository);

    await useCase.execute({
      bookId,
      userId: session.user.id,
    });

    revalidatePath('/books');
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting book:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Book not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this book' };
    }

    return { success: false, error: 'Failed to delete book' };
  }
}

export async function updateReadingProgressAction(
  bookId: string,
  currentPage: number
): Promise<ActionResult<Book>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookService = Container.getBookService();
    const book = await bookService.updateReadingProgress(
      bookId,
      session.user.id,
      currentPage
    );

    revalidatePath('/books');
    revalidatePath('/dashboard');

    return { success: true, data: book };
  } catch (error) {
    console.error('Error updating reading progress:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Book not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this book' };
    }

    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to update reading progress' };
  }
}

export async function rateBookAction(
  bookId: string,
  rating: number
): Promise<ActionResult<Book>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookService = Container.getBookService();
    const book = await bookService.rateBook(bookId, session.user.id, rating);

    revalidatePath('/books');
    revalidatePath('/dashboard');

    return { success: true, data: book };
  } catch (error) {
    console.error('Error rating book:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Book not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this book' };
    }

    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to rate book' };
  }
}

export async function getReadingStatisticsAction(): Promise<ActionResult<{
  total: number;
  wantToRead: number;
  reading: number;
  read: number;
  totalPagesRead: number;
  averageRating: number;
  currentlyReading: Book[];
}>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookService = Container.getBookService();
    const stats = await bookService.getReadingStatistics(session.user.id);

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching reading statistics:', error);
    return { success: false, error: 'Failed to fetch reading statistics' };
  }
}
