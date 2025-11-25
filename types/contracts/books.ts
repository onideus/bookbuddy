import type { BookStatus } from '../../domain/entities/book';

export interface BookDTO {
  id: string;
  userId: string;
  googleBooksId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  description?: string;
  pageCount?: number;
  status: BookStatus;
  currentPage?: number;
  genres: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GetBooksRequest {
  userId: string;
}

export interface GetBooksResponse {
  books: BookDTO[];
}

export interface AddBookRequest {
  googleBooksId: string;
  title: string;
  authors?: string[];
  thumbnail?: string;
  description?: string;
  pageCount?: number;
  status: BookStatus;
  genres?: string[];
}

export interface AddBookResponse {
  book: BookDTO;
}

export interface UpdateBookRequest {
  status?: BookStatus;
  currentPage?: number;
  rating?: number;
  genres?: string[];
}

export interface UpdateBookResponse {
  book: BookDTO;
}

export interface DeleteBookResponse {
  message: string;
}
