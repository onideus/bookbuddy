/**
 * BookSearchCache Model (T011)
 * Data access layer for book_search_cache table
 * PostgreSQL Layer 2 cache for search results
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class BookSearchCache {
  /**
   * Generate cache key from query parameters
   * @param {string} queryString - Search query
   * @param {string} provider - Provider name
   * @param {Object} filters - Additional filters
   * @returns {string} Cache key (SHA-256 hash)
   */
  static generateSearchKey(queryString, provider, filters = {}) {
    const normalized = {
      query: queryString.toLowerCase().trim(),
      provider,
      filters: this.sortObject(filters),
    };
    const json = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Sort object keys recursively for consistent hashing
   * @param {Object} obj - Object to sort
   * @returns {Object} Sorted object
   */
  static sortObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = this.sortObject(obj[key]);
        return result;
      }, {});
  }

  /**
   * Get cached search results
   * @param {string} searchKey - Cache key
   * @param {string} provider - Provider name
   * @returns {Promise<Object|null>} Cached results or null if expired/not found
   */
  static async get(searchKey, provider) {
    const result = await query(
      `SELECT * FROM book_search_cache
       WHERE search_key = $1 AND provider = $2 AND expires_at > NOW()`,
      [searchKey, provider]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Set cached search results
   * @param {string} searchKey - Cache key
   * @param {string} provider - Provider name
   * @param {Array} results - Search results array
   * @param {number} ttlDays - Time to live in days (default: 30)
   * @returns {Promise<Object>} Created cache entry
   */
  static async set(searchKey, provider, results, ttlDays = 30) {
    // Validate provider
    const validProviders = ['google_books', 'open_library'];
    if (!validProviders.includes(provider)) {
      throw new Error(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
    }

    const id = uuidv4();
    const resultCount = results.length;

    // Use INSERT ... ON CONFLICT to update existing cache
    const result = await query(
      `INSERT INTO book_search_cache (id, search_key, provider, result_count, results, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '${ttlDays} days', NOW())
       ON CONFLICT (search_key, provider)
       DO UPDATE SET
         result_count = EXCLUDED.result_count,
         results = EXCLUDED.results,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()
       RETURNING *`,
      [id, searchKey, provider, resultCount, JSON.stringify(results)]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete cache entry
   * @param {string} searchKey - Cache key
   * @param {string} provider - Provider name
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(searchKey, provider) {
    const result = await query(
      'DELETE FROM book_search_cache WHERE search_key = $1 AND provider = $2',
      [searchKey, provider]
    );
    return result.rowCount > 0;
  }

  /**
   * Clean up expired cache entries
   * @returns {Promise<number>} Number of entries deleted
   */
  static async cleanExpired() {
    const result = await query('DELETE FROM book_search_cache WHERE expires_at < NOW()');
    return result.rowCount;
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  static async getStats() {
    const result = await query(`
      SELECT
        COUNT(*) as total_entries,
        SUM(result_count) as total_results,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_entries
      FROM book_search_cache
    `);

    return {
      totalEntries: parseInt(result.rows[0].total_entries, 10),
      totalResults: parseInt(result.rows[0].total_results, 10),
      activeEntries: parseInt(result.rows[0].active_entries, 10),
      expiredEntries: parseInt(result.rows[0].expired_entries, 10),
    };
  }

  /**
   * Map database row to JavaScript object
   * @param {Object} row - Database row
   * @returns {Object} Mapped object
   */
  static mapRow(row) {
    return {
      id: row.id,
      searchKey: row.search_key,
      provider: row.provider,
      resultCount: row.result_count,
      results: row.results,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
}

export default BookSearchCache;
