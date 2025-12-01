import type { VercelResponse } from '@vercel/node';

/**
 * Error handling utilities for serverless functions.
 * Maps domain errors to appropriate HTTP status codes and responses.
 */

// Import domain errors - these paths work from the api/ directory
import {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  OwnershipMismatchError,
  ConflictError,
  ValidationError,
  DuplicateError,
  InfrastructureError,
} from '../../domain/errors/domain-errors';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Map domain errors to HTTP status codes
 */
export function mapDomainErrorToStatusCode(error: Error): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof OwnershipMismatchError) return 403;
  if (error instanceof ConflictError) return 409;
  if (error instanceof ValidationError) return 400;
  if (error instanceof DuplicateError) return 409;
  if (error instanceof InfrastructureError) return 500;
  if (error instanceof DomainError) return 400;
  return 500;
}

/**
 * Handle errors in serverless functions
 * 
 * Usage:
 * try {
 *   // ... handler logic
 * } catch (error) {
 *   return handleError(error, res);
 * }
 */
export function handleError(error: unknown, res: VercelResponse): void {
  console.error('API Error:', error);

  if (error instanceof NotFoundError) {
    res.status(404).json({
      error: 'NotFoundError',
      message: error.message,
      statusCode: 404,
    });
    return;
  }

  if (error instanceof UnauthorizedError) {
    res.status(401).json({
      error: 'UnauthorizedError',
      message: error.message,
      statusCode: 401,
    });
    return;
  }

  if (error instanceof ForbiddenError) {
    res.status(403).json({
      error: 'ForbiddenError',
      message: error.message,
      statusCode: 403,
    });
    return;
  }

  if (error instanceof OwnershipMismatchError) {
    res.status(403).json({
      error: 'OwnershipMismatchError',
      message: error.message,
      code: error.code,
      statusCode: 403,
    });
    return;
  }

  if (error instanceof ConflictError) {
    res.status(409).json({
      error: 'ConflictError',
      message: error.message,
      code: error.code,
      statusCode: 409,
    });
    return;
  }

  if (error instanceof ValidationError) {
    res.status(400).json({
      error: 'ValidationError',
      message: error.message,
      statusCode: 400,
    });
    return;
  }

  if (error instanceof DuplicateError) {
    res.status(409).json({
      error: 'DuplicateError',
      message: error.message,
      statusCode: 409,
    });
    return;
  }

  if (error instanceof InfrastructureError) {
    console.error('Infrastructure Error (underlying cause):', error.cause);
    res.status(500).json({
      error: 'InfrastructureError',
      message: 'A system error occurred. Please try again later.',
      code: error.code,
      statusCode: 500,
    });
    return;
  }

  if (error instanceof DomainError) {
    res.status(400).json({
      error: 'DomainError',
      message: error.message,
      code: error.code,
      statusCode: 400,
    });
    return;
  }

  // Generic error handling
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  res.status(500).json({
    error: 'InternalServerError',
    message,
    statusCode: 500,
  });
}

/**
 * Wrapper to ensure consistent error handling
 */
export function withErrorHandling(
  handler: (req: any, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: any, res: VercelResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleError(error, res);
    }
  };
}