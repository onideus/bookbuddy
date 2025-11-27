export interface ImageLinksDTO {
  thumbnail?: string;
}

export interface VolumeInfoDTO {
  title: string;
  authors?: string[];
  description?: string;
  imageLinks?: ImageLinksDTO;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
}

// Matches Google Books item shape returned by the proxy
export interface ExternalBookDTO {
  id: string;
  volumeInfo: VolumeInfoDTO;
}

export interface SearchBooksRequest {
  query: string;
}

export interface SearchBooksResponse {
  books: ExternalBookDTO[];
}
