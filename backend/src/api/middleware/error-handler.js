/**
 * Error handler middleware (FR-017)
 * Includes correlation IDs in error responses for debugging
 */

/**
 * Custom error handler for Fastify
 * Formats errors with correlation IDs and appropriate status codes
 */
export function errorHandler(error, request, reply) {
  const statusCode = error.statusCode || 500;
  const correlationId = request.correlationId;

  // Log error with context
  request.log.error({
    err: error,
    correlationId,
    reqId: request.id,
    url: request.url,
    method: request.method,
  }, 'Request error');

  // Format error response
  const response = {
    statusCode,
    error: error.name || 'Error',
    message: error.message || 'An error occurred',
    correlationId,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // Include validation errors if present
  if (error.validation) {
    response.validation = error.validation;
  }

  reply.code(statusCode).send(response);
}

/**
 * Not found handler for unknown routes
 */
export function notFoundHandler(request, reply) {
  reply.code(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    correlationId: request.correlationId,
  });
}

export default { errorHandler, notFoundHandler };
