/**
 * Reading Entries API Routes (T051-T054)
 * Endpoints for managing reading entries and status transitions
 */

import { ReadingService } from '../../services/reading-service.js';
import { StatusTransition } from '../../models/status-transition.js';
import { requireReaderAccess } from '../middleware/auth.js';
import { bookAdditionRateLimit } from '../middleware/rate-limit.js';
import {
  createReadingEntrySchema,
  getReadingEntriesSchema,
  updateStatusSchema,
} from '../validators/reading-entry-schemas.js';

/**
 * Register reading entries routes
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Plugin options
 */
export default async function readingEntriesRoutes(fastify, options) {
  /**
   * POST /api/readers/:readerId/reading-entries (T051)
   * Add a new book to reader's library
   */
  fastify.post(
    '/readers/:readerId/reading-entries',
    {
      schema: createReadingEntrySchema,
      preHandler: [requireReaderAccess],
      config: bookAdditionRateLimit,
    },
    async (request, reply) => {
      const { readerId } = request.params;
      const bookData = request.body;

      try {
        const result = await ReadingService.addBook(readerId, bookData);

        reply.code(201).send(result.readingEntry);
      } catch (error) {
        request.log.error({ err: error, readerId }, 'Failed to add book');

        if (error.statusCode === 409) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: error.message,
            correlationId: request.correlationId,
          });
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/readers/:readerId/reading-entries (T052)
   * Get reading entries for a reader with optional status filter
   */
  fastify.get(
    '/readers/:readerId/reading-entries',
    {
      schema: getReadingEntriesSchema,
      preHandler: [requireReaderAccess],
    },
    async (request, reply) => {
      const { readerId } = request.params;
      const { status, page, pageSize } = request.query;

      const result = await ReadingService.getReadingEntries(readerId, {
        status,
        page,
        pageSize,
      });

      reply.send(result);
    }
  );

  /**
   * PATCH /api/reading-entries/:entryId (T053)
   * Update reading entry status
   */
  fastify.patch(
    '/reading-entries/:entryId',
    {
      schema: updateStatusSchema,
      preHandler: [requireReaderAccess],
    },
    async (request, reply) => {
      const { entryId } = request.params;
      const { status: newStatus, updatedAt } = request.body;
      const readerId = request.readerId;

      try {
        const result = await ReadingService.updateStatus(readerId, entryId, {
          newStatus,
          updatedAt,
        });

        reply.send(result.readingEntry);
      } catch (error) {
        request.log.error({ err: error, entryId }, 'Failed to update status');

        if (error.statusCode === 404) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: error.message,
            correlationId: request.correlationId,
          });
        }

        if (error.statusCode === 403) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: error.message,
            correlationId: request.correlationId,
          });
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/reading-entries/:entryId/transitions
   * Get status transition history for an entry
   */
  fastify.get('/reading-entries/:entryId/transitions', async (request, reply) => {
    const { entryId } = request.params;

    const transitions = await StatusTransition.findByEntry(entryId);

    reply.send(transitions);
  });
}
