/**
 * Authentication routes
 * Simple session management for development and testing
 */

import { ReaderProfile } from '../../models/reader-profile.js';

export default async function authRoutes(fastify, options) {
  /**
   * POST /api/auth/session
   * Create a session for testing (development only)
   */
  fastify.post('/auth/session', async (request, reply) => {
    const { readerId } = request.body;

    if (!readerId) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'readerId is required',
      });
    }

    // Create reader profile if it doesn't exist
    let profile = await ReaderProfile.findById(readerId);
    if (!profile) {
      profile = await ReaderProfile.create({ id: readerId });
    }

    // Set session
    request.session.readerId = readerId;

    reply.send({
      message: 'Session created',
      readerId,
    });
  });

  /**
   * DELETE /api/auth/session
   * Logout
   */
  fastify.delete('/auth/session', async (request, reply) => {
    request.session.destroy((err) => {
      if (err) {
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to destroy session',
        });
      }

      reply.send({ message: 'Session destroyed' });
    });
  });

  /**
   * GET /api/auth/session
   * Get current session
   */
  fastify.get('/auth/session', async (request, reply) => {
    const readerId = request.session?.readerId;

    if (!readerId) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'No active session',
      });
    }

    reply.send({ readerId });
  });
}
