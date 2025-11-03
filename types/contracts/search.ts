export interface ExternalBookDTO {
  googleBooksId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  description?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
}

export interface SearchBooksRequest {
  query: string;
}

export interface SearchBooksResponse {
  books: ExternalBookDTO[];
}
