/**
 * Standardized Error Handler Middleware
 *
 * Provides consistent error responses across all API endpoints with:
 * - Structured error format
 * - Error code mapping
 * - User-friendly messages
 * - Detail information when applicable
 */

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  DuplicateError,
} from '../../../../domain/errors/domain-errors';
import { logger } from '../../../../infrastructure/logging';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Error code mapping for different error types
 */
const ERROR_CODES: Record<string, string> = {
  NotFoundError: 'NOT_FOUND',
  UnauthorizedError: 'UNAUTHORIZED',
  ForbiddenError: 'FORBIDDEN',
  ValidationError: 'VALIDATION_ERROR',
  DuplicateError: 'DUPLICATE_ERROR',
  DomainError: 'DOMAIN_ERROR',
};

/**
 * HTTP status code mapping for different error types
 */
const HTTP_STATUS_CODES: Record<string, number> = {
  NotFoundError: 404,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  ValidationError: 400,
  DuplicateError: 409,
  DomainError: 400,
};

/**
 * Format a domain error into a standardized response
 */
function formatDomainError(error: DomainError): ErrorResponse {
  const errorCode = ERROR_CODES[error.name] || 'INTERNAL_ERROR';

  return {
    error: {
      code: errorCode,
      message: error.message,
    },
  };
}

/**
 * Format a Fastify validation error (from JSON schema validation)
 */
function formatValidationError(error: FastifyError): ErrorResponse {
  const details: Record<string, unknown> = {};

  // Extract validation details from Fastify error
  if (error.validation) {
    details.validation = error.validation.map((v) => ({
      field: v.instancePath || v.params?.missingProperty || 'unknown',
      message: v.message,
      keyword: v.keyword,
    }));
  }

  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      ...(Object.keys(details).length > 0 && { details }),
    },
  };
}

/**
 * Format a generic error
 */
function formatGenericError(error: Error, includeStack: boolean): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  // Include more details in development
  if (includeStack && error.stack) {
    response.error.details = {
      originalMessage: error.message,
      stack: error.stack,
    };
  }

  return response;
}

/**
 * Registers the error handler with the Fastify instance
 */
export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(
    async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = (request as { requestId?: string }).requestId || 'unknown';
      const isDevelopment = process.env.NODE_ENV !== 'production';

      // Log the error
      logger.error('Request error occurred', {
        requestId,
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
        path: request.url,
        method: request.method,
      });

      // Handle Fastify validation errors (from JSON schema validation)
      if (error.validation) {
        const response = formatValidationError(error);
        return reply.status(400).send(response);
      }

      // Handle domain errors
      if (error instanceof DomainError) {
        const statusCode = HTTP_STATUS_CODES[error.name] || 400;
        const response = formatDomainError(error);
        return reply.status(statusCode).send(response);
      }

      // Handle rate limit errors
      if (error.statusCode === 429) {
        return reply.status(429).send({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        });
      }

      // Handle JWT errors
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return reply.status(401).send({
          error: {
            code: 'INVALID_TOKEN',
            message: error.name === 'TokenExpiredError' 
              ? 'Your session has expired. Please log in again.'
              : 'Invalid authentication token.',
          },
        });
      }

      // Handle generic errors
      const response = formatGenericError(error, isDevelopment);
      return reply.status(error.statusCode || 500).send(response);
    }
  );

  // Handle 404 Not Found for undefined routes
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}

export default registerErrorHandler;