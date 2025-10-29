/**
 * Test helper for building Fastify server instance
 * Used across all test types (unit, integration, contract)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import { config } from '../../src/lib/config.js';
import logger from '../../src/lib/logger.js';
import correlationIdPlugin from '../../src/api/middleware/correlation-id.js';
import { configureSession } from '../../src/api/middleware/session.js';
import { configureRateLimit } from '../../src/api/middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from '../../src/api/middleware/error-handler.js';

/**
 * Build a Fastify server instance for testing
 * @param {Object} opts - Options to pass to Fastify
 * @returns {Promise<Object>} Fastify instance
 */
export async function build(opts = {}) {
  const fastify = Fastify({
    logger: false, // Disable logging in tests
    ...opts,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(correlationIdPlugin);

  // Register cookie support (required by @fastify/session)
  await fastify.register(fastifyCookie);

  await configureSession(fastify);

  // Disable rate limiting in tests or use lenient limits
  if (process.env.NODE_ENV !== 'test-rate-limit') {
    // Skip rate limiting in most tests
  } else {
    await configureRateLimit(fastify);
  }

  // Health check endpoint
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Register API routes
  const authRoutes = await import('../../src/api/routes/auth.js');
  const readingEntriesRoutes = await import('../../src/api/routes/reading-entries.js');
  const progressNotesRoutes = await import('../../src/api/routes/progress-notes.js');
  const ratingsRoutes = await import('../../src/api/routes/ratings.js');

  await fastify.register(authRoutes.default, { prefix: '/api' });
  await fastify.register(readingEntriesRoutes.default, { prefix: '/api' });
  await fastify.register(progressNotesRoutes.default, { prefix: '/api' });
  await fastify.register(ratingsRoutes.default, { prefix: '/api' });

  fastify.setNotFoundHandler(notFoundHandler);
  fastify.setErrorHandler(errorHandler);

  return fastify;
}
