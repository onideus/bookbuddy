/**
 * BaseProvider (T013)
 * Abstract base class for book search providers
 * Defines interface that all providers must implement
 */

export class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.providerName = 'base';
  }

  /**
   * Search for books
   * @param {string} query - Search query
   * @param {Object} options - Search options (limit, offset, filters)
   * @returns {Promise<Object>} - Search results with metadata
   * @throws {Error} - Must be implemented by subclass
   */
  async search(query, options = {}) {
    throw new Error(`search() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Normalize provider-specific response to internal format
   * @param {Object} rawResult - Raw API response
   * @returns {Object} - Normalized book data
   * @throws {Error} - Must be implemented by subclass
   */
  normalize(rawResult) {
    throw new Error(`normalize() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Hydrate book details (fetch additional data for a specific book)
   * @param {string} providerId - Provider-specific book ID
   * @returns {Promise<Object>} - Detailed book data
   * @throws {Error} - Must be implemented by subclass
   */
  async hydrate(providerId) {
    throw new Error(`hydrate() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Get provider name
   * @returns {string} - Provider name
   */
  getName() {
    return this.providerName;
  }

  /**
   * Validate search query
   * @param {string} query - Search query
   * @throws {Error} - If query is invalid
   */
  validateQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    if (query.trim().length < 2) {
      throw new Error('Query must be at least 2 characters');
    }
    if (query.length > 500) {
      throw new Error('Query must not exceed 500 characters');
    }
  }

  /**
   * Build query string from parameters
   * @param {Object} params - Query parameters
   * @returns {string} - URL query string
   */
  buildQueryString(params) {
    return Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
}

export default BaseProvider;
