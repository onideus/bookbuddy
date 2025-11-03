import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  DuplicateError,
} from '../../../../domain/errors/domain-errors';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export function mapDomainErrorToStatusCode(error: Error): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof ValidationError) return 400;
  if (error instanceof DuplicateError) return 409;
  if (error instanceof DomainError) return 400;
  return 500;
}

export function handleError(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = mapDomainErrorToStatusCode(error);

  if (statusCode >= 500) {
    request.log.error({ err: error }, 'Internal server error');
  } else {
    request.log.warn({ err: error }, 'Request failed');
  }

  const response: ErrorResponse = {
    error: error.name,
    message: error.message,
    statusCode,
  };

  reply.code(statusCode).send(response);
}

export function wrapHandler<T = unknown>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await handler(request, reply);
    } catch (error) {
      handleError(error as Error, request, reply);
    }
  };
}
