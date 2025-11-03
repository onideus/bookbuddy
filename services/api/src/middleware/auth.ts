import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../../../../domain/errors/domain-errors';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
  };
}

export async function authenticate(
  request: AuthenticatedRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyAccessToken(token);

    // Attach user info to request
    request.user = {
      userId: payload.userId,
      email: payload.email,
    };
  } catch (error) {
    throw new UnauthorizedError(
      error instanceof Error ? error.message : 'Authentication failed'
    );
  }
}
