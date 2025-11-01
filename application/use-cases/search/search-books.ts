import { IExternalBookSearch, BookSearchResult } from '../../../domain/interfaces/external-book-search';

export interface SearchBooksInput {
  query: string;
}

export class SearchBooksUseCase {
  constructor(private externalBookSearch: IExternalBookSearch) {}

  async execute(input: SearchBooksInput): Promise<BookSearchResult[]> {
    if (!input.query || input.query.trim().length === 0) {
      return [];
    }

    return this.externalBookSearch.search(input.query);
  }
}
