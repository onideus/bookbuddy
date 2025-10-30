/**
 * Cache Manager (T023)
 * Multi-layer caching: Redis (L1) + PostgreSQL (L2)
 * Implements stampede protection and graceful degradation
 */

import { getWithLock, isRedisConnected, getCache, setCache } from '../redis-client.js';
import { BookSearchCache } from '../../models/book-search-cache.js';
import { recordCacheHit, recordCacheMiss } from '../../lib/metrics.js';

// Cache TTLs
const REDIS_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const POSTGRES_TTL_DAYS = 30; // 30 days

export class CacheManager {
  constructor() {
    this.redisEnabled = true;
    this.postgresEnabled = true;
  }

  /**
   * Get cached search results
   * @param {string} query - Search query
   * @param {string} provider - Provider name
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object|null>} - Cached results or null
   */
  async get(query, provider, filters = {}) {
    const searchKey = BookSearchCache.generateSearchKey(query, provider, filters);

    // Try Redis (L1) first
    if (this.redisEnabled && isRedisConnected()) {
      try {
        const redisKey = `book:search:${searchKey}`;
        const cached = await getCache(redisKey);

        if (cached) {
          recordCacheHit('redis');
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('[CacheManager] Redis get error:', error.message);
        // Continue to L2
      }
    }

    // Try PostgreSQL (L2) if Redis miss or unavailable
    if (this.postgresEnabled) {
      try {
        const cached = await BookSearchCache.get(searchKey, provider);

        if (cached) {
          recordCacheHit('postgres');

          // Backfill Redis if available
          if (this.redisEnabled && isRedisConnected()) {
            const redisKey = `book:search:${searchKey}`;
            await setCache(redisKey, JSON.stringify(cached.results), REDIS_TTL_SECONDS).catch(
              (err) => console.error('[CacheManager] Redis backfill error:', err.message)
            );
          }

          return cached.results;
        }
      } catch (error) {
        console.error('[CacheManager] PostgreSQL get error:', error.message);
      }
    }

    recordCacheMiss();
    return null;
  }

  /**
   * Set cached search results
   * @param {string} query - Search query
   * @param {string} provider - Provider name
   * @param {Array} results - Search results
   * @param {Object} filters - Additional filters
   * @returns {Promise<void>}
   */
  async set(query, provider, results, filters = {}) {
    const searchKey = BookSearchCache.generateSearchKey(query, provider, filters);

    // Store in Redis (L1)
    if (this.redisEnabled && isRedisConnected()) {
      try {
        const redisKey = `book:search:${searchKey}`;
        await setCache(redisKey, JSON.stringify(results), REDIS_TTL_SECONDS);
      } catch (error) {
        console.error('[CacheManager] Redis set error:', error.message);
      }
    }

    // Store in PostgreSQL (L2)
    if (this.postgresEnabled) {
      try {
        await BookSearchCache.set(searchKey, provider, results, POSTGRES_TTL_DAYS);
      } catch (error) {
        console.error('[CacheManager] PostgreSQL set error:', error.message);
      }
    }
  }

  /**
   * Get with stampede protection (only for expensive operations)
   * @param {string} query - Search query
   * @param {string} provider - Provider name
   * @param {Function} fetchFn - Function to fetch data if cache miss
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} - Cached or fetched results
   */
  async getWithLock(query, provider, fetchFn, filters = {}) {
    const searchKey = BookSearchCache.generateSearchKey(query, provider, filters);
    const redisKey = `book:search:${searchKey}`;

    // Try regular get first
    const cached = await this.get(query, provider, filters);
    if (cached) {
      return cached;
    }

    // If Redis is available, use distributed lock
    if (this.redisEnabled && isRedisConnected()) {
      try {
        const results = await getWithLock(redisKey, fetchFn, REDIS_TTL_SECONDS);

        // Store in PostgreSQL L2 as well
        if (this.postgresEnabled) {
          await BookSearchCache.set(searchKey, provider, results, POSTGRES_TTL_DAYS).catch((err) =>
            console.error('[CacheManager] PostgreSQL backfill error:', err.message)
          );
        }

        return results;
      } catch (error) {
        console.error('[CacheManager] Stampede protection error:', error.message);
        // Fall back to direct fetch
        return await fetchFn();
      }
    }

    // No Redis, just fetch and cache
    const results = await fetchFn();
    await this.set(query, provider, results, filters);
    return results;
  }

  /**
   * Invalidate cache for a query
   * @param {string} query - Search query
   * @param {string} provider - Provider name
   * @param {Object} filters - Additional filters
   * @returns {Promise<void>}
   */
  async invalidate(query, provider, filters = {}) {
    const searchKey = BookSearchCache.generateSearchKey(query, provider, filters);

    // Clear Redis
    if (this.redisEnabled && isRedisConnected()) {
      const redisKey = `book:search:${searchKey}`;
      const { delCache } = await import('../redis-client.js');
      await delCache(redisKey).catch((err) =>
        console.error('[CacheManager] Redis invalidate error:', err.message)
      );
    }

    // Clear PostgreSQL
    if (this.postgresEnabled) {
      await BookSearchCache.delete(searchKey, provider).catch((err) =>
        console.error('[CacheManager] PostgreSQL invalidate error:', err.message)
      );
    }
  }

  /**
   * Clean expired entries from PostgreSQL
   * @returns {Promise<number>} - Number of entries deleted
   */
  async cleanExpired() {
    if (!this.postgresEnabled) {
      return 0;
    }

    try {
      return await BookSearchCache.cleanExpired();
    } catch (error) {
      console.error('[CacheManager] Clean expired error:', error.message);
      return 0;
    }
  }
}

export default CacheManager;
