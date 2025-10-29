/**
 * Rating Routes (T104-T105)
 * API endpoints for rating finished books
 */

import { ReadingService } from '../../services/reading-service.js';
import { setRatingSchema, clearRatingSchema } from '../validators/rating-schemas.js';
import { requireReaderAccess } from '../middleware/auth.js';

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
    {
      schema: setRatingSchema,
      preHandler: [requireReaderAccess]
    },
    async (request, reply) => {
      const { entryId } = request.params;
      const { rating, reflectionNote } = request.body;

      // readerId comes from requireReaderAccess middleware
      const readerId = request.readerId;

      try {
        const result = await ReadingService.setRating(readerId, entryId, {
          rating,
          reflectionNote,
        });

        return reply.code(200).send({
          ...result,
          correlationId: request.correlationId,
        });
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
    {
      schema: clearRatingSchema,
      preHandler: [requireReaderAccess]
    },
    async (request, reply) => {
      const { entryId } = request.params;

      // readerId comes from requireReaderAccess middleware
      const readerId = request.readerId;

      try {
        const result = await ReadingService.clearRating(readerId, entryId);

        return reply.code(200).send({
          ...result,
          correlationId: request.correlationId,
        });
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
