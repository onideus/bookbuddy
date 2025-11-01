export interface BookSearchResult {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
    };
    pageCount?: number;
  };
}

export interface IExternalBookSearch {
  search(query: string): Promise<BookSearchResult[]>;
}
