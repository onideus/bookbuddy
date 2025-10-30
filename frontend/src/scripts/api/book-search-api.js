/**
 * API client for book search endpoints (T030)
 * Provides interface to search for books and create entries from search results
 */

import { get, post, retryWithBackoff } from './client.js';

/**
 * Search for books
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchBooks(query, options = {}) {
  const { type = 'general', limit = 20, offset = 0, provider = 'google_books' } = options;

  const params = {
    q: query,
    type,
    limit,
    offset,
    provider,
  };

  return await get('/api/books/search', params);
}

/**
 * Create book and reading entry from search result
 * @param {Object} searchResult - Selected search result
 * @param {string} status - Initial reading status
 * @param {Object} overrides - Optional field overrides
 * @returns {Promise<Object>} Created book and reading entry
 */
export async function createFromSearch(searchResult, status, overrides = {}) {
  return await retryWithBackoff(() =>
    post('/api/books/from-search', {
      searchResult,
      status,
      overrides,
    })
  );
}

/**
 * Search with debouncing helper
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} delay - Debounce delay in ms
 * @returns {Promise<Object>} Search results
 */
export function searchBooksDebounced(query, options = {}, delay = 300) {
  if (searchBooksDebounced.timeoutId) {
    clearTimeout(searchBooksDebounced.timeoutId);
  }

  return new Promise((resolve, reject) => {
    searchBooksDebounced.timeoutId = setTimeout(async () => {
      try {
        const results = await searchBooks(query, options);
        resolve(results);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

export default {
  searchBooks,
  createFromSearch,
  searchBooksDebounced,
};
