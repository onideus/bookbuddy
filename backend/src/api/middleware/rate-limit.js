/**
 * Rate limiting middleware using @fastify/rate-limit (FR-019)
 * Per-reader limits: 100 book additions/hour, 500 progress updates/hour
 */

import rateLimit from '@fastify/rate-limit';
import { RateLimits } from '../../../../shared/constants.js';

/**
 * Configure rate limiting plugin
 * @param {Object} fastify - Fastify instance
 */
export async function configureRateLimit(fastify) {
  await fastify.register(rateLimit, {
    global: true,
    max: 1000, // Default global limit (per IP)
    timeWindow: '1 hour',
    skipOnError: false,
    // Key by reader ID if authenticated, otherwise by IP
    keyGenerator: (request) => {
      const readerId = request.session?.readerId;
      return readerId || request.ip;
    },
    // Add rate limit headers to response
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.after / 1000)} seconds.`,
        correlationId: request.correlationId,
      };
    },
  });
}

/**
 * Rate limit options for book additions (100/hour per reader)
 */
export const bookAdditionRateLimit = {
  max: RateLimits.BOOK_ADDITIONS_PER_HOUR,
  timeWindow: '1 hour',
};

/**
 * Rate limit options for progress notes (500/hour per reader)
 */
export const progressNoteRateLimit = {
  max: RateLimits.PROGRESS_NOTES_PER_HOUR,
  timeWindow: '1 hour',
};

export default configureRateLimit;
