/**
 * Redis client service with connection management and error handling
 * Provides resilient caching layer with graceful degradation
 */

import Redis from 'ioredis';
import { config } from '../lib/config.js';

let redisClient = null;
let isRedisAvailable = false;

/**
 * Retry strategy with exponential backoff
 * @param {number} times - Number of retry attempts
 * @returns {number|null} - Delay in ms or null to stop retrying
 */
function retryStrategy(times) {
  if (times > 10) {
    // Stop retrying after 10 attempts
    console.error('[Redis] Max retry attempts reached, giving up');
    return null;
  }
  // Exponential backoff: 50ms, 100ms, 150ms, ..., up to 2000ms
  const delay = Math.min(times * 50, 2000);
  console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
  return delay;
}

/**
 * Initialize Redis client with connection handling
 * @returns {Redis} - Redis client instance
 */
export function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: 3,
    retryStrategy,
    enableOfflineQueue: false, // Fail fast if Redis is down
    lazyConnect: true, // Don't connect immediately, we'll handle it manually
  };

  redisClient = new Redis(redisConfig);

  // Connection event handlers
  redisClient.on('connect', () => {
    console.log('[Redis] Connected successfully');
    isRedisAvailable = true;
  });

  redisClient.on('ready', () => {
    console.log('[Redis] Client ready');
    isRedisAvailable = true;
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
    isRedisAvailable = false;
  });

  redisClient.on('close', () => {
    console.warn('[Redis] Connection closed');
    isRedisAvailable = false;
  });

  redisClient.on('reconnecting', () => {
    console.log('[Redis] Attempting to reconnect...');
    isRedisAvailable = false;
  });

  return redisClient;
}

/**
 * Get the Redis client instance
 * @returns {Redis|null} - Redis client or null if not initialized
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Check if Redis is available
 * @returns {boolean} - True if Redis is connected and ready
 */
export function isRedisConnected() {
  return isRedisAvailable && redisClient && redisClient.status === 'ready';
}

/**
 * Connect to Redis
 * @returns {Promise<void>}
 */
export async function connectRedis() {
  if (!redisClient) {
    createRedisClient();
  }

  try {
    await redisClient.connect();
    console.log('[Redis] Connection established');
  } catch (error) {
    console.error('[Redis] Failed to connect:', error.message);
    console.warn('[Redis] Application will continue without cache');
  }
}

/**
 * Disconnect from Redis
 * @returns {Promise<void>}
 */
export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('[Redis] Disconnected');
    isRedisAvailable = false;
    redisClient = null;
  }
}

/**
 * Get value from Redis with error handling
 * @param {string} key - Cache key
 * @returns {Promise<string|null>} - Cached value or null if not found/error
 */
export async function getCache(key) {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error(`[Redis] Error getting key "${key}":`, error.message);
    return null;
  }
}

/**
 * Set value in Redis with TTL
 * @param {string} key - Cache key
 * @param {string} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function setCache(key, value, ttlSeconds) {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    await redisClient.setex(key, ttlSeconds, value);
    return true;
  } catch (error) {
    console.error(`[Redis] Error setting key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete key from Redis
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function delCache(key) {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error(`[Redis] Error deleting key "${key}":`, error.message);
    return false;
  }
}

/**
 * Get cached value with stampede protection (distributed lock)
 * Prevents multiple concurrent requests from fetching the same data
 *
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if cache miss
 * @param {number} ttlSeconds - Time to live for cached value
 * @param {number} lockTimeoutSeconds - Lock timeout (default: 10s)
 * @returns {Promise<any>} - Cached or fetched data
 */
export async function getWithLock(key, fetchFn, ttlSeconds, lockTimeoutSeconds = 10) {
  // Try to get from cache first
  const cached = await getCache(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // If Redis not available, fetch directly
  if (!isRedisConnected()) {
    return await fetchFn();
  }

  const lockKey = `${key}:lock`;

  try {
    // Try to acquire lock
    const acquired = await redisClient.set(lockKey, '1', 'NX', 'EX', lockTimeoutSeconds);

    if (!acquired) {
      // Another request is fetching, wait briefly and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Retry getting from cache (the other request may have populated it)
      const retryCache = await getCache(key);
      if (retryCache) {
        return JSON.parse(retryCache);
      }
      // If still not cached, fetch ourselves (lock may have expired)
      return await fetchFn();
    }

    // We acquired the lock, fetch the data
    const data = await fetchFn();
    await setCache(key, JSON.stringify(data), ttlSeconds);
    return data;
  } finally {
    // Always release the lock
    await delCache(lockKey);
  }
}

/**
 * Ping Redis to check health
 * @returns {Promise<boolean>} - True if Redis responds to ping
 */
export async function pingRedis() {
  if (!redisClient) {
    return false;
  }

  try {
    const response = await redisClient.ping();
    return response === 'PONG';
  } catch (error) {
    console.error('[Redis] Ping failed:', error.message);
    return false;
  }
}

// Export singleton instance
export default {
  createRedisClient,
  getRedisClient,
  isRedisConnected,
  connectRedis,
  disconnectRedis,
  getCache,
  setCache,
  delCache,
  getWithLock,
  pingRedis,
};
