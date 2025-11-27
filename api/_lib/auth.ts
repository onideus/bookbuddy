import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

/**
 * JWT and Authentication utilities for serverless functions.
 */

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends VercelRequest {
  user?: JWTPayload;
}

/**
 * Get JWT secret from environment, with validation
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  if (process.env.NODE_ENV === 'production' && secret === 'development-secret-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production');
  }
  return secret;
}

/**
 * Parse expiry string (e.g., "15m", "7d") to seconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  };

  return value * multipliers[unit];
}

/**
 * Generate an access token (JWT)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const expiresIn = parseExpiry(process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m');
  return jwt.sign(payload, getJWTSecret(), { expiresIn });
}

/**
 * Generate a refresh token (UUID)
 */
export function generateRefreshToken(): string {
  return randomUUID();
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Calculate refresh token expiry date
 */
export function calculateRefreshTokenExpiry(): Date {
  const expiresInSeconds = parseExpiry(process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d');
  return new Date(Date.now() + expiresInSeconds * 1000);
}

/**
 * Verify authentication from request headers
 */
export function verifyAuth(req: VercelRequest): JWTPayload {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  return verifyAccessToken(token);
}

/**
 * Higher-order function to wrap handlers with authentication
 * 
 * Usage:
 * export default withAuth(async (req, res) => {
 *   const userId = req.user!.userId;
 *   // ... handle authenticated request
 * });
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      req.user = verifyAuth(req);
      await handler(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      res.status(401).json({
        error: 'UnauthorizedError',
        message,
        statusCode: 401,
      });
    }
  };
}

/**
 * Optional auth - doesn't fail if no token, but adds user if valid
 */
export function withOptionalAuth(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        req.user = verifyAuth(req);
      }
    } catch {
      // Ignore auth errors for optional auth
    }
    await handler(req, res);
  };
}