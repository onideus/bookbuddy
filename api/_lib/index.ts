/**
 * Shared utilities for serverless functions.
 * 
 * Import from here for a clean API:
 * import { withAuth, handleError, getContainer } from '../_lib';
 */

// Authentication
export {
  type JWTPayload,
  type AuthenticatedRequest,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  calculateRefreshTokenExpiry,
  verifyAuth,
  withAuth,
  withOptionalAuth,
} from './auth';

// Error handling
export {
  type ErrorResponse,
  mapDomainErrorToStatusCode,
  handleError,
  withErrorHandling,
} from './errors';

// Rate limiting
export {
  type RateLimitResult,
  checkRateLimit,
  withRateLimit,
} from './rate-limit';

// Dependency injection
export {
  type Container,
  getContainer,
  getUserRepository,
  getBookRepository,
  getGoalRepository,
  getRefreshTokenRepository,
  getReadingActivityRepository,
  getPasswordHasher,
  getExternalBookSearch,
} from './container';

// Prisma client
export { prisma } from './prisma';