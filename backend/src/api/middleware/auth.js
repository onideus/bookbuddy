/**
 * Authentication middleware (FR-009)
 * Session validation and RBAC
 */

// Development-only test reader ID
const DEV_TEST_READER_ID = '00000000-0000-0000-0000-000000000001';
const isDevelopment = process.env.NODE_ENV === 'development';

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

  // Development bypass for test reader (T066 manual testing)
  if (isDevelopment) {
    // If readerId is in params and matches test reader, allow
    if (requestedReaderId === DEV_TEST_READER_ID) {
      request.readerId = DEV_TEST_READER_ID;
      return;
    }

    // If no readerId in params (e.g., PATCH /reading-entries/:entryId) and no session, use test reader
    if (!requestedReaderId && !sessionReaderId) {
      request.readerId = DEV_TEST_READER_ID;
      return;
    }
  }

  if (!sessionReaderId) {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
      correlationId: request.correlationId,
    });
  }

  if (requestedReaderId && sessionReaderId !== requestedReaderId) {
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
