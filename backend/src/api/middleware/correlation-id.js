/**
 * Correlation ID middleware using uuid v4 (FR-017)
 * Generates unique ID for each request to enable tracing
 */

import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger } from '../../lib/logger.js';

/**
 * Fastify plugin for correlation ID generation
 * Adds correlationId to request object and response headers
 */
export default async function correlationIdPlugin(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    // Use existing correlation ID from header or generate new one
    const correlationId = request.headers['x-correlation-id'] || uuidv4();

    // Attach to request for use in handlers
    request.correlationId = correlationId;

    // Create request-scoped logger
    request.log = createRequestLogger(correlationId, {
      reqId: request.id,
    });

    // Add to response headers for client-side debugging
    reply.header('x-correlation-id', correlationId);
  });
}
