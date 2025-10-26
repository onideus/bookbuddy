/**
 * Authentication middleware (FR-009)
 * Session validation and RBAC
 */

/**
 * Require authenticated session
 * Attach this to routes that need authentication
 */
export async function requireAuth(request, reply) {
  const readerId = request.session?.readerId;

  if (!readerId) {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
      correlationId: request.correlationId,
    });
  }

  // Attach readerId to request for easy access in handlers
  request.readerId = readerId;
}

/**
 * Require specific reader access
 * Use this to ensure users can only access their own data
 */
export async function requireReaderAccess(request, reply) {
  const sessionReaderId = request.session?.readerId;
  const requestedReaderId = request.params.readerId;

  if (!sessionReaderId) {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
      correlationId: request.correlationId,
    });
  }

  if (sessionReaderId !== requestedReaderId) {
    return reply.code(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Access denied to this resource',
      correlationId: request.correlationId,
    });
  }

  request.readerId = sessionReaderId;
}

/**
 * Optional authentication
 * Attach readerId if session exists, but don't reject if missing
 */
export async function optionalAuth(request, reply) {
  const readerId = request.session?.readerId;

  if (readerId) {
    request.readerId = readerId;
  }
}

export default { requireAuth, requireReaderAccess, optionalAuth };
