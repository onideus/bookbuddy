import { vi } from 'vitest';
import type { ExternalBookSearch } from '@/domain/interfaces/external-book-search';
import type { PasswordHasher } from '@/domain/interfaces/password-hasher';

export const createMockExternalBookSearch = (): ExternalBookSearch => ({
  searchBooks: vi.fn().mockResolvedValue([
    {
      googleBooksId: 'mock-google-id-1',
      title: 'Mock Book 1',
      authors: ['Mock Author 1'],
      description: 'Mock description 1',
      pageCount: 300,
      coverImage: 'https://example.com/cover1.jpg',
      publishedDate: '2024-01-01',
      categories: ['Fiction'],
    },
    {
      googleBooksId: 'mock-google-id-2',
      title: 'Mock Book 2',
      authors: ['Mock Author 2', 'Co-Author'],
      description: 'Mock description 2',
      pageCount: 250,
      coverImage: 'https://example.com/cover2.jpg',
      publishedDate: '2023-06-15',
      categories: ['Science'],
    },
  ]),
});

export const createMockPasswordHasher = (): PasswordHasher => ({
  hash: vi.fn().mockImplementation(async (password: string) =>
    `hashed_${password}_${Date.now()}`
  ),
  verify: vi.fn().mockImplementation(async (password: string, hash: string) =>
    hash.startsWith(`hashed_${password}`)
  ),
});

export const setupExternalBookSearchMocks = (
  service: ExternalBookSearch,
  searchResults: any[] = []
) => {
  vi.mocked(service.searchBooks).mockImplementation(async (query: string) => {
    if (searchResults.length > 0) {
      return searchResults;
    }

    // Default mock behavior based on query
    if (query.toLowerCase().includes('javascript')) {
      return [
        {
          googleBooksId: 'js-book-1',
          title: 'JavaScript: The Good Parts',
          authors: ['Douglas Crockford'],
          description: 'Most programming languages contain good and bad parts...',
          pageCount: 176,
          coverImage: 'https://example.com/js-good-parts.jpg',
          publishedDate: '2008-05-01',
          categories: ['Computers', 'Programming'],
        },
        {
          googleBooksId: 'js-book-2',
          title: 'Eloquent JavaScript',
          authors: ['Marijn Haverbeke'],
          description: 'A modern introduction to programming',
          pageCount: 472,
          coverImage: 'https://example.com/eloquent-js.jpg',
          publishedDate: '2018-12-04',
          categories: ['Computers', 'Programming'],
        },
      ];
    }

    if (query.toLowerCase().includes('clean')) {
      return [
        {
          googleBooksId: 'clean-code-1',
          title: 'Clean Code',
          authors: ['Robert C. Martin'],
          description: 'A Handbook of Agile Software Craftsmanship',
          pageCount: 464,
          coverImage: 'https://example.com/clean-code.jpg',
          publishedDate: '2008-08-01',
          categories: ['Computers', 'Software Development'],
        },
        {
          googleBooksId: 'clean-arch-1',
          title: 'Clean Architecture',
          authors: ['Robert C. Martin'],
          description: 'A Craftsman\'s Guide to Software Structure and Design',
          pageCount: 432,
          coverImage: 'https://example.com/clean-architecture.jpg',
          publishedDate: '2017-09-12',
          categories: ['Computers', 'Software Architecture'],
        },
      ];
    }

    // Return empty array for unknown queries
    return [];
  });
};

export const setupPasswordHasherMocks = (
  hasher: PasswordHasher,
  customBehavior?: {
    hashPrefix?: string;
    shouldFailVerify?: boolean;
  }
) => {
  const prefix = customBehavior?.hashPrefix || 'hashed';

  vi.mocked(hasher.hash).mockImplementation(async (password: string) =>
    `${prefix}_${password}_salt_${Date.now()}`
  );

  vi.mocked(hasher.verify).mockImplementation(async (password: string, hash: string) => {
    if (customBehavior?.shouldFailVerify) {
      return false;
    }
    return hash.includes(`${prefix}_${password}_salt`);
  });
};