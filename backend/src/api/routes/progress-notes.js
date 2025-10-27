/**
 * Progress Notes API Routes (T080-T082)
 * Endpoints for adding and retrieving reading progress notes
 */

import { ReadingService } from '../../services/reading-service.js';
import { requireReaderAccess } from '../middleware/auth.js';
import { progressNoteRateLimit } from '../middleware/rate-limit.js';
import {
  createProgressNoteSchema,
  getProgressNotesSchema,
} from '../validators/progress-note-schemas.js';

/**
 * Register progress notes routes
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Plugin options
 */
export default async function progressNotesRoutes(fastify, options) {
  /**
   * POST /api/reading-entries/:entryId/progress-notes (T080)
   * Add a new progress note to a reading entry
   */
  fastify.post(
    '/reading-entries/:entryId/progress-notes',
    {
      schema: createProgressNoteSchema,
      preHandler: [requireReaderAccess],
      config: progressNoteRateLimit,
    },
    async (request, reply) => {
      const { entryId } = request.params;
      const { content, progressMarker } = request.body;

      try {
        const result = await ReadingService.addProgressNote(entryId, {
          content,
          progressMarker,
        });

        // Add correlation ID to response
        const response = {
          ...result,
          correlationId: request.correlationId,
        };

        reply.code(201).send(response);
      } catch (error) {
        request.log.error({ err: error, entryId }, 'Failed to add progress note');

        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: error.message,
            correlationId: request.correlationId,
          });
        }

        if (error.message.includes('length') || error.message.includes('required')) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: error.message,
            correlationId: request.correlationId,
          });
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/reading-entries/:entryId/progress-notes (T081)
   * Get all progress notes for a reading entry
   */
  fastify.get(
    '/reading-entries/:entryId/progress-notes',
    {
      schema: getProgressNotesSchema,
      preHandler: [requireReaderAccess],
    },
    async (request, reply) => {
      const { entryId } = request.params;

      try {
        const notes = await ReadingService.getProgressNotes(entryId);

        reply.send(notes);
      } catch (error) {
        request.log.error({ err: error, entryId }, 'Failed to get progress notes');

        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: error.message,
            correlationId: request.correlationId,
          });
        }

        throw error;
      }
    }
  );
}
