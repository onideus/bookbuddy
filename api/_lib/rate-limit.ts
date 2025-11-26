import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rate limiting utilities using Upstash Redis.
 * 
 * Upstash provides a serverless-friendly Redis that works perfectly with
 * Vercel functions since it uses HTTP/REST instead of persistent connections.
 * 
 * Free tier: 10,000 requests/day - more than enough for a personal app.
 */

// Lazy initialization to avoid errors when env vars aren't set
let globalRatelimit: Ratelimit | null = null;
let authRatelimit: Ratelimit | null = null;

/**
 * Check if rate limiting is configured
 */
function isRateLimitConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Get or create the global rate limiter (100 requests per minute)
 */
function getGlobalRatelimit(): Ratelimit {
  if (!globalRatelimit) {
    if (!isRateLimitConfigured()) {
      throw new Error('Upstash Redis credentials not configured');
    }

    globalRatelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
      analytics: true,
      prefix: 'ratelimit:global',
    });
  }
  return globalRatelimit;
}

/**
 * Get or create the auth rate limiter (5 requests per minute - stricter for security)
 */
function getAuthRatelimit(): Ratelimit {
  if (!authRatelimit) {
    if (!isRateLimitConfigured()) {
      throw new Error('Upstash Redis credentials not configured');
    }

    authRatelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute for auth
      analytics: true,
      prefix: 'ratelimit:auth',
    });
  }
  return authRatelimit;
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: VercelRequest): string {
  // Try to get real IP from various headers (Vercel sets x-forwarded-for)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
    return ips.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  // Fallback - shouldn't happen on Vercel
  return 'anonymous';
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit and add headers to response.
 * Returns true if request should proceed, false if rate limited.
 * 
 * @param req - Vercel request object
 * @param res - Vercel response object
 * @param isAuth - Whether this is an auth endpoint (stricter limits)
 * @returns Promise<boolean> - true if allowed, false if rate limited
 */
export async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  isAuth: boolean = false
): Promise<boolean> {
  // Skip rate limiting if not configured (for local development)
  if (!isRateLimitConfigured()) {
    console.warn('Rate limiting not configured - skipping');
    return true;
  }

  try {
    const identifier = getClientIdentifier(req);
    const limiter = isAuth ? getAuthRatelimit() : getGlobalRatelimit();
    
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    res.setHeader('X-RateLimit-Reset', reset);

    if (!success) {
      res.status(429).json({
        error: 'TooManyRequests',
        message: isAuth 
          ? 'Too many authentication attempts. Please wait before trying again.'
          : 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
      });
      return false;
    }

    return true;
  } catch (error) {
    // Fail open - if rate limiting fails, allow the request
    console.error('Rate limit check failed:', error);
    return true;
  }
}

/**
 * Higher-order function to add rate limiting to a handler
 */
export function withRateLimit(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>,
  isAuth: boolean = false
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (!(await checkRateLimit(req, res, isAuth))) {
      return; // Rate limited - response already sent
    }
    await handler(req, res);
  };
}