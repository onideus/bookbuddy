/**
 * Circuit Breaker (T024)
 * Wraps opossum circuit breaker with book search specific configuration
 * Prevents cascading failures when external APIs are down
 */

import CircuitBreaker from 'opossum';
import { recordCircuitBreakerOpen, recordError } from '../../lib/metrics.js';

// Circuit breaker configuration (per research.md)
const DEFAULT_OPTIONS = {
  timeout: 2500, // 2.5s timeout for API calls
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30s
  rollingCountTimeout: 10000, // 10s window for error percentage
  rollingCountBuckets: 10, // 10 buckets for rolling window
  name: 'BookSearchCircuitBreaker',
};

/**
 * Create a circuit breaker for a provider function
 * @param {Function} providerFn - Async function to wrap
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker} - Configured circuit breaker
 */
export function createCircuitBreaker(providerFn, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const breaker = new CircuitBreaker(providerFn, config);

  // Event: Circuit opened (too many failures)
  breaker.on('open', () => {
    console.warn(`[CircuitBreaker] ${config.name} opened - too many failures`);
    recordCircuitBreakerOpen();
  });

  // Event: Circuit half-opened (testing if service recovered)
  breaker.on('halfOpen', () => {
    console.log(`[CircuitBreaker] ${config.name} half-open - testing service`);
  });

  // Event: Circuit closed (service recovered)
  breaker.on('close', () => {
    console.log(`[CircuitBreaker] ${config.name} closed - service recovered`);
  });

  // Event: Request timed out
  breaker.on('timeout', () => {
    console.warn(`[CircuitBreaker] ${config.name} request timed out`);
    recordError('timeout');
  });

  // Event: Request failed
  breaker.on('failure', (error) => {
    console.error(`[CircuitBreaker] ${config.name} request failed:`, error.message);

    // Categorize errors
    if (error.message.includes('RATE_LIMIT')) {
      recordError('rateLimit');
    } else if (error.message.includes('SERVER_ERROR')) {
      recordError('serverError');
    } else {
      recordError('other');
    }
  });

  // Event: Fallback executed
  breaker.on('fallback', (result) => {
    console.log(`[CircuitBreaker] ${config.name} fallback executed`);
  });

  // Event: Request rejected (circuit open)
  breaker.on('reject', () => {
    console.warn(`[CircuitBreaker] ${config.name} request rejected - circuit open`);
  });

  return breaker;
}

/**
 * Create circuit breaker with fallback for book search
 * @param {Function} providerFn - Provider search function
 * @param {Function} fallbackFn - Fallback function (e.g., secondary provider or cache)
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker} - Configured circuit breaker with fallback
 */
export function createCircuitBreakerWithFallback(providerFn, fallbackFn, options = {}) {
  const breaker = createCircuitBreaker(providerFn, options);

  // Set fallback function
  breaker.fallback(fallbackFn);

  return breaker;
}

/**
 * Get circuit breaker statistics
 * @param {CircuitBreaker} breaker - Circuit breaker instance
 * @returns {Object} - Statistics
 */
export function getCircuitBreakerStats(breaker) {
  const stats = breaker.stats;

  return {
    state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
    failures: stats.failures,
    successes: stats.successes,
    timeouts: stats.timeouts,
    rejects: stats.rejects,
    fallbacks: stats.fallbacks,
    latencyMean: stats.latencyMean,
    percentiles: {
      p50: stats.percentiles['0.5'],
      p90: stats.percentiles['0.9'],
      p99: stats.percentiles['0.99'],
    },
  };
}

export default {
  createCircuitBreaker,
  createCircuitBreakerWithFallback,
  getCircuitBreakerStats,
};
