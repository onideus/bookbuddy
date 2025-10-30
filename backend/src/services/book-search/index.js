/**
 * Book Search Service (T025)
 * Main orchestrator for book search functionality
 * Coordinates providers, caching, circuit breakers, and duplicate detection
 */

import GoogleBooksProvider from './providers/google-books.js';
import CacheManager from './cache-manager.js';
import { createCircuitBreaker } from './circuit-breaker.js';
import { normalizeSearchResults } from './normalizer.js';
import { recordSearch, recordProviderCall } from '../../lib/metrics.js';

export class BookSearchService {
  constructor(config = {}) {
    this.cacheManager = new CacheManager();
    this.googleBooksProvider = new GoogleBooksProvider(config.googleBooks || {});

    // Wrap provider search with circuit breaker
    this.googleBooksBreaker = createCircuitBreaker(
      async (query, options) => {
        return await this.googleBooksProvider.search(query, options);
      },
      { name: 'GoogleBooksSearch' }
    );
  }

  /**
   * Search for books across providers with caching
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results with metadata
   */
  async search(query, options = {}) {
    const {
      type = 'general',
      limit = 20,
      offset = 0,
      provider = 'google_books',
      useCache = true,
    } = options;

    recordSearch();

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      throw new Error('Query must be at least 2 characters');
    }

    const normalizedQuery = query.trim();

    // Try cache first if enabled
    if (useCache) {
      try {
        const cached = await this.cacheManager.get(normalizedQuery, provider, {
          type,
          limit,
          offset,
        });

        if (cached) {
          return {
            results: cached,
            totalCount: cached.length,
            provider,
            fromCache: true,
            query: normalizedQuery,
          };
        }
      } catch (error) {
        console.error('[BookSearchService] Cache error:', error.message);
        // Continue to provider fetch
      }
    }

    // Fetch from provider
    let providerResults;
    try {
      if (provider === 'google_books') {
        providerResults = await this.googleBooksBreaker.fire(normalizedQuery, {
          type,
          limit,
          offset,
        });
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Record provider metrics
      recordProviderCall(provider, providerResults.latency);

      // Normalize results
      const normalized = normalizeSearchResults(providerResults.results, provider);

      // Cache results
      if (useCache && normalized.length > 0) {
        await this.cacheManager
          .set(normalizedQuery, provider, normalized, { type, limit, offset })
          .catch((err) => console.error('[BookSearchService] Cache set error:', err.message));
      }

      return {
        results: normalized,
        totalCount: providerResults.totalCount,
        provider,
        fromCache: false,
        query: normalizedQuery,
        latency: providerResults.latency,
      };
    } catch (error) {
      // Check if circuit breaker is open
      if (error.message && error.message.includes('breaker is open')) {
        // Try to return stale cache if available
        const staleCache = await this.cacheManager
          .get(normalizedQuery, provider, { type, limit, offset })
          .catch(() => null);

        if (staleCache) {
          console.warn('[BookSearchService] Returning stale cache due to circuit breaker open');
          return {
            results: staleCache,
            totalCount: staleCache.length,
            provider,
            fromCache: true,
            stale: true,
            query: normalizedQuery,
            error: 'Service temporarily unavailable, showing cached results',
          };
        }
      }

      // Re-throw error with context
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get detailed information for a specific book
   * @param {string} providerId - Provider-specific book ID
   * @param {string} provider - Provider name
   * @returns {Promise<Object>} - Detailed book data
   */
  async hydrate(providerId, provider = 'google_books') {
    try {
      if (provider === 'google_books') {
        return await this.googleBooksProvider.hydrate(providerId);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      throw new Error(`Hydrate failed: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for a query
   * @param {string} query - Search query
   * @param {string} provider - Provider name
   * @returns {Promise<void>}
   */
  async invalidateCache(query, provider = 'google_books') {
    await this.cacheManager.invalidate(query, provider);
  }

  /**
   * Clean expired cache entries
   * @returns {Promise<number>} - Number of entries deleted
   */
  async cleanExpiredCache() {
    return await this.cacheManager.cleanExpired();
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} - Circuit breaker stats
   */
  getCircuitBreakerStats() {
    // Import at top of file already, just use the breaker stats directly
    const stats = this.googleBooksBreaker.stats;
    return {
      googleBooks: {
        state: this.googleBooksBreaker.opened ? 'open' : this.googleBooksBreaker.halfOpen ? 'half-open' : 'closed',
        failures: stats.failures,
        successes: stats.successes,
        timeouts: stats.timeouts,
        rejects: stats.rejects,
        fallbacks: stats.fallbacks,
        latencyMean: stats.latencyMean,
      },
    };
  }
}

// Export singleton instance
let bookSearchService = null;

export function getBookSearchService(config = {}) {
  if (!bookSearchService) {
    bookSearchService = new BookSearchService(config);
  }
  return bookSearchService;
}

export default {
  BookSearchService,
  getBookSearchService,
};
