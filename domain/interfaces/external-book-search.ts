export interface BookSearchResult {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    pageCount?: number;
    publishedDate?: string;
    publisher?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    ratingsCount?: number;
    averageRating?: number;
    language?: string;
    categories?: string[];
  };
}

export interface IExternalBookSearch {
  search(query: string): Promise<BookSearchResult[]>;
}
