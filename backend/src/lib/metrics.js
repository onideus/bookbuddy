/**
 * Metrics Collection Library (T016)
 * Tracks application metrics for monitoring and success criteria validation
 */

// In-memory metrics store (use Redis or Prometheus in production)
const metrics = {
  bookSearch: {
    totalSearches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    providerCalls: {
      google_books: 0,
      open_library: 0,
    },
    providerLatency: {
      google_books: [],
      open_library: [],
    },
    circuitBreakerOpens: 0,
    duplicateDetections: {
      isbn: 0,
      fuzzy: 0,
      total: 0,
    },
    errors: {
      timeout: 0,
      rateLimit: 0,
      serverError: 0,
      other: 0,
    },
  },
};

/**
 * Record a book search
 */
export function recordSearch() {
  metrics.bookSearch.totalSearches++;
}

/**
 * Record cache hit
 * @param {string} layer - Cache layer ('redis' or 'postgres')
 */
export function recordCacheHit(layer = 'redis') {
  metrics.bookSearch.cacheHits++;
}

/**
 * Record cache miss
 */
export function recordCacheMiss() {
  metrics.bookSearch.cacheMisses++;
}

/**
 * Record provider API call
 * @param {string} provider - Provider name
 * @param {number} latencyMs - Latency in milliseconds
 */
export function recordProviderCall(provider, latencyMs) {
  if (metrics.bookSearch.providerCalls[provider] !== undefined) {
    metrics.bookSearch.providerCalls[provider]++;
    metrics.bookSearch.providerLatency[provider].push(latencyMs);

    // Keep only last 100 latency measurements
    if (metrics.bookSearch.providerLatency[provider].length > 100) {
      metrics.bookSearch.providerLatency[provider].shift();
    }
  }
}

/**
 * Record circuit breaker opening
 */
export function recordCircuitBreakerOpen() {
  metrics.bookSearch.circuitBreakerOpens++;
}

/**
 * Record duplicate detection
 * @param {string} matchType - Type of match ('isbn' or 'fuzzy')
 */
export function recordDuplicateDetection(matchType) {
  metrics.bookSearch.duplicateDetections.total++;
  if (matchType === 'isbn' || matchType === 'fuzzy') {
    metrics.bookSearch.duplicateDetections[matchType]++;
  }
}

/**
 * Record error
 * @param {string} errorType - Error type ('timeout', 'rateLimit', 'serverError', 'other')
 */
export function recordError(errorType) {
  if (metrics.bookSearch.errors[errorType] !== undefined) {
    metrics.bookSearch.errors[errorType]++;
  } else {
    metrics.bookSearch.errors.other++;
  }
}

/**
 * Calculate cache hit rate
 * @returns {number} - Cache hit rate as percentage (0-100)
 */
export function getCacheHitRate() {
  const total = metrics.bookSearch.cacheHits + metrics.bookSearch.cacheMisses;
  if (total === 0) return 0;
  return ((metrics.bookSearch.cacheHits / total) * 100).toFixed(2);
}

/**
 * Calculate average provider latency
 * @param {string} provider - Provider name
 * @returns {number} - Average latency in ms
 */
export function getAverageProviderLatency(provider) {
  const latencies = metrics.bookSearch.providerLatency[provider];
  if (!latencies || latencies.length === 0) return 0;
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  return (sum / latencies.length).toFixed(2);
}

/**
 * Get duplicate detection accuracy
 * @returns {Object} - Duplicate detection stats
 */
export function getDuplicateDetectionStats() {
  const { isbn, fuzzy, total } = metrics.bookSearch.duplicateDetections;
  return {
    total,
    isbnMatches: isbn,
    fuzzyMatches: fuzzy,
    isbnAccuracy: total > 0 ? ((isbn / total) * 100).toFixed(2) : 0,
    fuzzyAccuracy: total > 0 ? ((fuzzy / total) * 100).toFixed(2) : 0,
  };
}

/**
 * Get circuit breaker state metrics
 * @returns {Object} - Circuit breaker stats
 */
export function getCircuitBreakerStats() {
  return {
    opens: metrics.bookSearch.circuitBreakerOpens,
    falsePositiveRate: 0, // Calculated separately based on subsequent successes
  };
}

/**
 * Get all metrics
 * @returns {Object} - All metrics
 */
export function getAllMetrics() {
  return {
    bookSearch: {
      ...metrics.bookSearch,
      cacheHitRate: getCacheHitRate(),
      averageLatency: {
        google_books: getAverageProviderLatency('google_books'),
        open_library: getAverageProviderLatency('open_library'),
      },
      duplicateDetectionStats: getDuplicateDetectionStats(),
      circuitBreakerStats: getCircuitBreakerStats(),
    },
  };
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics() {
  metrics.bookSearch = {
    totalSearches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    providerCalls: {
      google_books: 0,
      open_library: 0,
    },
    providerLatency: {
      google_books: [],
      open_library: [],
    },
    circuitBreakerOpens: 0,
    duplicateDetections: {
      isbn: 0,
      fuzzy: 0,
      total: 0,
    },
    errors: {
      timeout: 0,
      rateLimit: 0,
      serverError: 0,
      other: 0,
    },
  };
}

export default {
  recordSearch,
  recordCacheHit,
  recordCacheMiss,
  recordProviderCall,
  recordCircuitBreakerOpen,
  recordDuplicateDetection,
  recordError,
  getCacheHitRate,
  getAverageProviderLatency,
  getDuplicateDetectionStats,
  getCircuitBreakerStats,
  getAllMetrics,
  resetMetrics,
};
