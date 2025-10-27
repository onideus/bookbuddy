/**
 * Rating Routes (T104-T105)
 * API endpoints for rating finished books
 */

import { ReadingService } from '../../services/reading-service.js';
import { setRatingSchema, clearRatingSchema } from '../validators/rating-schemas.js';

/**
 * Register rating routes
 * @param {FastifyInstance} fastify - Fastify instance
 */
export default async function ratingRoutes(fastify) {
  /**
   * PUT /api/reading-entries/:entryId/rating
   * Set or update rating for a finished book (T104)
   */
  fastify.put(
    '/reading-entries/:entryId/rating',
    { schema: setRatingSchema },
    async (request, reply) => {
      const { entryId } = request.params;
      const { rating, reflectionNote } = request.body;

      // In production, extract readerId from authenticated session
      // For now, use mock reader ID from session storage
      const readerId = request.headers['x-reader-id'] || '00000000-0000-0000-0000-000000000001';

      try {
        const result = await ReadingService.setRating(readerId, entryId, {
          rating,
          reflectionNote,
        });

        return reply.code(200).send(result);
      } catch (error) {
        if (error.statusCode === 404) {
          return reply.code(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }

        if (error.statusCode === 403) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: error.message,
          });
        }

        if (error.statusCode === 400) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }

        // Log unexpected errors
        fastify.log.error({
          err: error,
          entryId,
          readerId,
        }, 'Failed to set rating');

        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to set rating',
        });
      }
    }
  );

  /**
   * DELETE /api/reading-entries/:entryId/rating
   * Clear rating for a reading entry (T105)
   */
  fastify.delete(
    '/reading-entries/:entryId/rating',
    { schema: clearRatingSchema },
    async (request, reply) => {
      const { entryId } = request.params;

      // In production, extract readerId from authenticated session
      const readerId = request.headers['x-reader-id'] || '00000000-0000-0000-0000-000000000001';

      try {
        const result = await ReadingService.clearRating(readerId, entryId);

        return reply.code(200).send(result);
      } catch (error) {
        if (error.statusCode === 404) {
          return reply.code(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }

        if (error.statusCode === 403) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: error.message,
          });
        }

        // Log unexpected errors
        fastify.log.error({
          err: error,
          entryId,
          readerId,
        }, 'Failed to clear rating');

        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to clear rating',
        });
      }
    }
  );
}
