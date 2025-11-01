import {
  IExternalBookSearch,
  BookSearchResult,
} from '../../domain/interfaces/external-book-search';

export class GoogleBooksClient implements IExternalBookSearch {
  private readonly apiUrl = 'https://www.googleapis.com/books/v1/volumes';

  async search(query: string): Promise<BookSearchResult[]> {
    try {
      const response = await fetch(
        `${this.apiUrl}?q=${encodeURIComponent(query)}&maxResults=20`
      );

      if (!response.ok) {
        throw new Error('Failed to search books');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Google Books API error:', error);
      return [];
    }
  }
}
