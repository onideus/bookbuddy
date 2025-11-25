import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getJWTSecret, config } from '../../../../lib/config';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

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

export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const expiresIn = parseExpiry(config.jwt.accessTokenExpiry);

  return jwt.sign(payload, getJWTSecret(), {
    expiresIn,
  });
}

export function generateRefreshToken(): string {
  return randomUUID();
}

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

export function calculateRefreshTokenExpiry(): Date {
  const expiresInSeconds = parseExpiry(config.jwt.refreshTokenExpiry);
  return new Date(Date.now() + expiresInSeconds * 1000);
}
