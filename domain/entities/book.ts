export type BookStatus = 'want-to-read' | 'reading' | 'read';

export interface Book {
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
  rating?: number;
  addedAt: Date;
  finishedAt?: Date;
  genres: string[];
}
