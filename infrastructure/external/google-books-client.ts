import {
  IExternalBookSearch,
  BookSearchResult,
} from '@/domain/interfaces/external-book-search';

/**
 * Google Books API client with enhanced filtering and sorting
 * 
 * Improvements:
 * - Filters out series summaries and low-quality entries
 * - Requires minimum page count (50+ pages)
 * - Prioritizes books with ISBNs
 * - Sorts by relevance: exact title match → page count → ratings
 * - Uses printType=books to exclude magazines
 */
export class GoogleBooksClient implements IExternalBookSearch {
  private readonly apiUrl = 'https://www.googleapis.com/books/v1/volumes';
  private readonly MIN_PAGE_COUNT = 50;

  async search(query: string): Promise<BookSearchResult[]> {
    try {
      // Build query parameters for better results
      const params = new URLSearchParams({
        q: query,
        maxResults: '40', // Get more results to filter down
        printType: 'books', // Exclude magazines and other non-books
        orderBy: 'relevance',
        langRestrict: 'en', // Only return English language books
      });

      const response = await fetch(`${this.apiUrl}?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to search books');
      }

      const data = (await response.json()) as { items?: BookSearchResult[] };
      const items: BookSearchResult[] = data.items || [];

      // Apply filtering
      const filteredItems = this.filterResults(items);

      // Sort by relevance
      const sortedItems = this.sortByRelevance(filteredItems, query);

      // Return top 20 results after filtering and sorting
      return sortedItems.slice(0, 20);
    } catch (error) {
      // Log error only in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('Google Books API error:', error);
      }
      return [];
    }
  }

  /**
   * Filter out low-quality search results
   * - Requires minimum page count (filters out series summaries)
   * - Prioritizes books with ISBNs
   * - Filters out books without essential metadata
   */
  private filterResults(items: BookSearchResult[]): BookSearchResult[] {
    return items.filter((item) => {
      const volumeInfo = item.volumeInfo;

      // Must have a title
      if (!volumeInfo?.title) {
        return false;
      }

      // Must have page count above minimum (filters out series summaries)
      const pageCount = volumeInfo.pageCount;
      if (!pageCount || pageCount < this.MIN_PAGE_COUNT) {
        return false;
      }

      // Must have at least one author
      if (!volumeInfo.authors || volumeInfo.authors.length === 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort results by relevance to prioritize main editions
   * 
   * Scoring factors (higher is better):
   * 1. Exact title match with query
   * 2. Has ISBN (indicates real published book)
   * 3. Has publisher (legitimate edition)
   * 4. Higher page count (main book vs summary)
   * 5. More ratings (popular edition)
   * 6. Has cover image
   */
  private sortByRelevance(items: BookSearchResult[], query: string): BookSearchResult[] {
    const queryLower = query.toLowerCase().trim();

    return items.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, queryLower);
      const scoreB = this.calculateRelevanceScore(b, queryLower);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate relevance score for a book
   */
  private calculateRelevanceScore(item: BookSearchResult, queryLower: string): number {
    const volumeInfo = item.volumeInfo;
    let score = 0;

    const titleLower = volumeInfo.title?.toLowerCase() || '';

    // Exact title match (highest priority)
    if (titleLower === queryLower) {
      score += 100;
    } else if (titleLower.startsWith(queryLower)) {
      // Title starts with query (e.g., "Harry Potter and the...")
      score += 80;
    } else if (titleLower.includes(queryLower)) {
      // Title contains query
      score += 50;
    }

    // Has ISBN (indicates real published book)
    const identifiers = volumeInfo.industryIdentifiers;
    if (identifiers?.some((id) => id.type === 'ISBN_13' || id.type === 'ISBN_10')) {
      score += 30;
    }

    // Has publisher (legitimate edition)
    if (volumeInfo.publisher) {
      score += 20;
    }

    // Page count bonus (prefer substantial books)
    const pageCount = volumeInfo.pageCount || 0;
    if (pageCount >= 200) {
      score += 15;
    } else if (pageCount >= 100) {
      score += 10;
    }

    // Ratings count (popular editions)
    const ratingsCount = volumeInfo.ratingsCount || 0;
    if (ratingsCount >= 1000) {
      score += 25;
    } else if (ratingsCount >= 100) {
      score += 15;
    } else if (ratingsCount >= 10) {
      score += 5;
    }

    // Average rating bonus
    const avgRating = volumeInfo.averageRating || 0;
    if (avgRating >= 4.0) {
      score += 10;
    } else if (avgRating >= 3.5) {
      score += 5;
    }

    // Has cover image
    if (volumeInfo.imageLinks?.thumbnail) {
      score += 10;
    }

    // Has description
    if (volumeInfo.description && volumeInfo.description.length > 100) {
      score += 5;
    }

    // Penalize books with very long titles (often compilations or special editions)
    if (volumeInfo.title && volumeInfo.title.length > 100) {
      score -= 10;
    }

    return score;
  }
}
