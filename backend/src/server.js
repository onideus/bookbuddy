/**
 * Fastify server setup with all middleware, CORS, and logging
 * Entry point for the BookBuddy backend API
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config, validateConfig } from './lib/config.js';
import logger from './lib/logger.js';
import correlationIdPlugin from './api/middleware/correlation-id.js';
import { configureSession } from './api/middleware/session.js';
import { configureRateLimit } from './api/middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './api/middleware/error-handler.js';
import { closePool } from './db/connection.js';

// Validate configuration
validateConfig();

// Create Fastify instance
const fastify = Fastify({
  logger: logger,
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
  trustProxy: true, // For rate limiting by IP behind proxy
});

// Register plugins and middleware
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Correlation ID middleware (must be early in chain)
  await fastify.register(correlationIdPlugin);

  // Session middleware
  await configureSession(fastify);

  // Rate limiting
  await configureRateLimit(fastify);

  // Health check endpoint (no auth required)
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      correlationId: request.correlationId,
    };
  });

  // API routes
  const authRoutes = await import('./api/routes/auth.js');
  const readingEntriesRoutes = await import('./api/routes/reading-entries.js');

  await fastify.register(authRoutes.default, { prefix: '/api' });
  await fastify.register(readingEntriesRoutes.default, { prefix: '/api' });

  // 404 handler
  fastify.setNotFoundHandler(notFoundHandler);

  // Error handler
  fastify.setErrorHandler(errorHandler);
}

// Start server
async function start() {
  try {
    await registerPlugins();

    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Server listening on ${config.host}:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`CORS origin: ${config.corsOrigin}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    await fastify.close();
    await closePool();
    logger.info('Server and database connections closed');
    process.exit(0);
  } catch (err) {
    logger.error(err, 'Error during shutdown');
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
start();

export default fastify;
