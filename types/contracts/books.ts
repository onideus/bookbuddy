import type { ReadingStatus } from '../../domain/value-objects/reading-status';

export interface BookDTO {
  id: string;
  userId: string;
  googleBooksId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  description?: string;
  pageCount?: number;
  status: ReadingStatus;
  currentPage?: number;
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
  status: ReadingStatus;
}

export interface AddBookResponse {
  book: BookDTO;
}

export interface UpdateBookRequest {
  status?: ReadingStatus;
  currentPage?: number;
}

export interface UpdateBookResponse {
  book: BookDTO;
}

export interface DeleteBookResponse {
  message: string;
}
