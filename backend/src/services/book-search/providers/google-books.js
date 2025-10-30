/**
 * Google Books Provider (T022)
 * Implements BaseProvider for Google Books API v1
 */

import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import { normalizeGoogleBooks } from '../normalizer.js';

export class GoogleBooksProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.providerName = 'google_books';
    this.baseUrl = 'https://www.googleapis.com/books/v1';
    this.apiKey = config.apiKey || process.env.GOOGLE_BOOKS_API_KEY || null;
    this.timeout = config.timeout || 5000; // 5 seconds
  }

  /**
   * Search for books using Google Books API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async search(query, options = {}) {
    this.validateQuery(query);

    const { limit = 20, offset = 0, type = 'general' } = options;

    // Build query based on type
    let searchQuery = query;
    if (type === 'isbn') {
      searchQuery = `isbn:${query.replace(/[^0-9X]/g, '')}`;
    } else if (type === 'title') {
      searchQuery = `intitle:${query}`;
    } else if (type === 'author') {
      searchQuery = `inauthor:${query}`;
    }

    // Build API URL
    const params = {
      q: searchQuery,
      maxResults: Math.min(limit, 40), // Google Books max is 40
      startIndex: offset,
      printType: 'books',
      orderBy: 'relevance',
    };

    if (this.apiKey) {
      params.key = this.apiKey;
    }

    const url = `${this.baseUrl}/volumes?${this.buildQueryString(params)}`;

    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'BookBuddy/1.0',
        },
      });
      const latency = Date.now() - startTime;

      const items = response.data.items || [];
      const totalItems = response.data.totalItems || 0;

      return {
        results: items,
        totalCount: totalItems,
        provider: this.providerName,
        query: searchQuery,
        latency,
      };
    } catch (error) {
      if (error.response) {
        // HTTP error from API
        const status = error.response.status;
        if (status === 429) {
          throw new Error('RATE_LIMIT: Google Books API rate limit exceeded');
        } else if (status >= 500) {
          throw new Error(`SERVER_ERROR: Google Books API server error (${status})`);
        } else if (status === 400) {
          throw new Error(`BAD_REQUEST: Invalid query - ${error.response.data.error?.message || 'Unknown error'}`);
        }
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('TIMEOUT: Google Books API request timed out');
      }
      throw new Error(`PROVIDER_ERROR: ${error.message}`);
    }
  }

  /**
   * Normalize Google Books result
   * @param {Object} rawResult - Raw Google Books item
   * @returns {Object} - Normalized book data
   */
  normalize(rawResult) {
    return normalizeGoogleBooks(rawResult);
  }

  /**
   * Hydrate (get detailed info) for a specific book
   * @param {string} providerId - Google Books volume ID
   * @returns {Promise<Object>} - Detailed book data
   */
  async hydrate(providerId) {
    const url = `${this.baseUrl}/volumes/${providerId}`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'BookBuddy/1.0',
        },
        params: this.apiKey ? { key: this.apiKey } : {},
      });

      return this.normalize(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`NOT_FOUND: Book with ID ${providerId} not found`);
      }
      throw new Error(`HYDRATE_ERROR: ${error.message}`);
    }
  }
}

export default GoogleBooksProvider;
