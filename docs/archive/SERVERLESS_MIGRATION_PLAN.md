# Serverless Migration Plan: BookBuddy API

## Executive Summary

This document outlines the migration of the BookBuddy backend from a Fastify long-running server to Vercel Serverless Functions. This migration will reduce hosting costs to $0/month at your usage level while teaching you serverless architecture patterns.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Current: Fastify Server                       │
├─────────────────────────────────────────────────────────────────┤
│  services/api/src/server.ts                                      │
│  └── Long-running Node.js process                                │
│      ├── In-memory rate limiting (@fastify/rate-limit)           │
│      ├── Request logging middleware                              │
│      ├── Centralized error handling                              │
│      └── Routes registered on single Fastify instance            │
│                                                                   │
│  Route Files:                                                     │
│  ├── auth.ts    (POST /auth/register, login, refresh, logout)    │
│  ├── books.ts   (GET, POST, PATCH, DELETE /books)                │
│  ├── goals.ts   (GET, POST, PATCH, DELETE /goals)                │
│  ├── streaks.ts (GET /streaks, POST /streaks/activity)           │
│  ├── search.ts  (GET /search)                                    │
│  └── export.ts  (GET /export/books, goals, all)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Target: Vercel Serverless                       │
├─────────────────────────────────────────────────────────────────┤
│  api/                                                            │
│  ├── _lib/                    (shared utilities - not endpoints) │
│  │   ├── auth.ts              (JWT verification)                 │
│  │   ├── prisma.ts            (singleton Prisma client)          │
│  │   ├── errors.ts            (error handling)                   │
│  │   ├── rate-limit.ts        (Upstash Redis rate limiting)      │
│  │   └── container.ts         (DI container for serverless)      │
│  │                                                               │
│  ├── health.ts                GET  /api/health                   │
│  │                                                               │
│  ├── auth/                                                       │
│  │   ├── register.ts          POST /api/auth/register            │
│  │   ├── login.ts             POST /api/auth/login               │
│  │   ├── refresh.ts           POST /api/auth/refresh             │
│  │   └── logout.ts            POST /api/auth/logout              │
│  │                                                               │
│  ├── books/                                                      │
│  │   ├── index.ts             GET, POST /api/books               │
│  │   ├── [id].ts              GET, PATCH, DELETE /api/books/:id  │
│  │   └── genres.ts            GET /api/books/genres              │
│  │                                                               │
│  ├── goals/                                                      │
│  │   ├── index.ts             GET, POST /api/goals               │
│  │   └── [id].ts              GET, PATCH, DELETE /api/goals/:id  │
│  │                                                               │
│  ├── streaks/                                                    │
│  │   ├── index.ts             GET /api/streaks                   │
│  │   ├── activity.ts          POST /api/streaks/activity         │
│  │   └── history.ts           GET /api/streaks/history           │
│  │                                                               │
│  ├── search.ts                GET /api/search                    │
│  │                                                               │
│  └── export/                                                     │
│      ├── books.ts             GET /api/export/books              │
│      ├── goals.ts             GET /api/export/goals              │
│      └── all.ts               GET /api/export/all                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Setup

### 1.1 Install Vercel CLI and Dependencies

```bash
# Install Vercel CLI globally
npm install -g vercel

# Install serverless-specific dependencies
npm install @vercel/node @upstash/ratelimit @upstash/redis

# Install development dependency
npm install -D vercel
```

### 1.2 Create vercel.json Configuration

Create `vercel.json` in project root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

### 1.3 Create API Directory Structure

```bash
mkdir -p api/_lib api/auth api/books api/goals api/streaks api/export
```

---

## Phase 2: Shared Utilities

### 2.1 Prisma Client for Serverless

Create `api/_lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma instances in serverless environment
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

### 2.2 Authentication Middleware

Create `api/_lib/auth.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends VercelRequest {
  user?: AuthPayload;
}

export function verifyAuth(req: VercelRequest): AuthPayload {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const payload = jwt.verify(token, secret) as AuthPayload;
  return payload;
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      req.user = verifyAuth(req);
      await handler(req, res);
    } catch (error) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  };
}
```

### 2.3 Error Handler

Create `api/_lib/errors.ts`:

```typescript
import type { VercelResponse } from '@vercel/node';
import {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  DuplicateError,
} from '../../domain/errors/domain-errors';

export function handleError(error: unknown, res: VercelResponse): void {
  console.error('API Error:', error);
  
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: 'NotFoundError', message: error.message });
    return;
  }
  if (error instanceof UnauthorizedError) {
    res.status(401).json({ error: 'UnauthorizedError', message: error.message });
    return;
  }
  if (error instanceof ForbiddenError) {
    res.status(403).json({ error: 'ForbiddenError', message: error.message });
    return;
  }
  if (error instanceof ValidationError) {
    res.status(400).json({ error: 'ValidationError', message: error.message });
    return;
  }
  if (error instanceof DuplicateError) {
    res.status(409).json({ error: 'DuplicateError', message: error.message });
    return;
  }
  if (error instanceof DomainError) {
    res.status(400).json({ error: 'DomainError', message: error.message });
    return;
  }
  
  res.status(500).json({
    error: 'InternalServerError',
    message: error instanceof Error ? error.message : 'An unexpected error occurred'
  });
}
```

### 2.4 Rate Limiting with Upstash Redis

Create `api/_lib/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create rate limiter (lazy initialization)
let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis credentials not configured');
    }
    
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
      analytics: true,
    });
  }
  return ratelimit;
}

// Stricter rate limiter for auth endpoints
let authRatelimit: Ratelimit | null = null;

function getAuthRatelimit(): Ratelimit {
  if (!authRatelimit) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis credentials not configured');
    }
    
    authRatelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute for auth
      analytics: true,
    });
  }
  return authRatelimit;
}

export async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  isAuth: boolean = false
): Promise<boolean> {
  try {
    const ip = req.headers['x-forwarded-for'] as string || 'anonymous';
    const limiter = isAuth ? getAuthRatelimit() : getRatelimit();
    const { success, limit, reset, remaining } = await limiter.limit(ip);
    
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);
    
    if (!success) {
      res.status(429).json({
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Please try again later.'
      });
      return false;
    }
    
    return true;
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    console.error('Rate limit check failed:', error);
    return true;
  }
}
```

### 2.5 Container for Serverless

Create `api/_lib/container.ts`:

```typescript
import { prisma } from './prisma';
import { PrismaUserRepository } from '../../infrastructure/persistence/prisma/user-repository';
import { PrismaBookRepository } from '../../infrastructure/persistence/prisma/book-repository';
import { PrismaGoalRepository } from '../../infrastructure/persistence/prisma/goal-repository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/persistence/prisma/refresh-token-repository';
import { PrismaReadingActivityRepository } from '../../infrastructure/persistence/prisma/reading-activity-repository';
import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt-password-hasher';
import { GoogleBooksClient } from '../../infrastructure/external/google-books-client';

// Serverless-friendly container (creates instances per invocation)
export function getContainer() {
  return {
    userRepository: new PrismaUserRepository(),
    bookRepository: new PrismaBookRepository(),
    goalRepository: new PrismaGoalRepository(),
    refreshTokenRepository: new PrismaRefreshTokenRepository(prisma),
    readingActivityRepository: new PrismaReadingActivityRepository(),
    passwordHasher: new BcryptPasswordHasher(),
    externalBookSearch: new GoogleBooksClient(),
  };
}
```

---

## Phase 3: Migrate Auth Routes

### 3.1 POST /api/auth/register

Create `api/auth/register.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleError } from '../_lib/errors';
import { checkRateLimit } from '../_lib/rate-limit';
import { getContainer } from '../_lib/container';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user';
import { generateAccessToken, generateRefreshToken, calculateRefreshTokenExpiry } from '../../services/api/src/utils/jwt';
import { sanitizeEmail, sanitizeString } from '../../lib/utils/sanitize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Rate limiting for auth endpoints
  if (!(await checkRateLimit(req, res, true))) {
    return;
  }
  
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email, password, and name are required'
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Password must be at least 8 characters'
      });
    }
    
    const container = getContainer();
    const useCase = new RegisterUserUseCase(
      container.userRepository,
      container.passwordHasher
    );
    
    const user = await useCase.execute({
      email: sanitizeEmail(email),
      password,
      name: sanitizeString(name),
    });
    
    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    
    const refreshTokenString = generateRefreshToken();
    
    await container.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenString,
      expiresAt: calculateRefreshTokenExpiry(),
    });
    
    res.status(201).json({
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    handleError(error, res);
  }
}
```

### 3.2 Similar Pattern for Other Auth Routes

The same pattern applies to:
- `api/auth/login.ts` - POST /api/auth/login
- `api/auth/refresh.ts` - POST /api/auth/refresh
- `api/auth/logout.ts` - POST /api/auth/logout

---

## Phase 4: Migrate Books Routes

### 4.1 GET & POST /api/books

Create `api/books/index.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../_lib/auth';
import { handleError } from '../_lib/errors';
import { checkRateLimit } from '../_lib/rate-limit';
import { getContainer } from '../_lib/container';
import { AddBookUseCase } from '../../application/use-cases/books/add-book';
import { sanitizeString } from '../../lib/utils/sanitize';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (!(await checkRateLimit(req, res))) {
    return;
  }
  
  try {
    const userId = req.user!.userId;
    const container = getContainer();
    
    if (req.method === 'GET') {
      // GET /api/books - List books
      const { status, genre, cursor, limit: limitStr } = req.query;
      const limit = limitStr ? Math.min(parseInt(limitStr as string, 10) || 20, 100) : 20;
      
      if (status) {
        const books = await container.bookRepository.findByStatus(userId, status as string);
        return res.json({ books });
      }
      
      if (genre) {
        const books = await container.bookRepository.findByGenre(userId, genre as string);
        return res.json({ books });
      }
      
      const result = await container.bookRepository.findByUserIdPaginated(userId, {
        cursor: cursor as string,
        limit
      });
      
      return res.json({
        books: result.books,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
        },
      });
    }
    
    if (req.method === 'POST') {
      // POST /api/books - Add book
      const { googleBooksId, title, authors, thumbnail, description, pageCount, status, genres } = req.body;
      
      if (!title) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'Title is required'
        });
      }
      
      const useCase = new AddBookUseCase(container.bookRepository);
      
      const book = await useCase.execute({
        userId,
        googleBooksId,
        title: sanitizeString(title),
        authors: authors ? authors.map((a: string) => sanitizeString(a)) : [],
        thumbnail: thumbnail ? sanitizeString(thumbnail) : thumbnail,
        description: description ? sanitizeString(description) : description,
        pageCount,
        status,
        genres: genres ? genres.map((g: string) => sanitizeString(g)) : genres,
      });
      
      return res.status(201).json({ book });
    }
    
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    handleError(error, res);
  }
}

export default withAuth(handler);
```

### 4.2 Dynamic Routes with [id].ts

Create `api/books/[id].ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../_lib/auth';
import { handleError } from '../_lib/errors';
import { checkRateLimit } from '../_lib/rate-limit';
import { getContainer } from '../_lib/container';
import { UpdateBookUseCase } from '../../application/use-cases/books/update-book';
import { DeleteBookUseCase } from '../../application/use-cases/books/delete-book';
import { sanitizeString } from '../../lib/utils/sanitize';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (!(await checkRateLimit(req, res))) {
    return;
  }
  
  try {
    const userId = req.user!.userId;
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Book ID is required'
      });
    }
    
    const container = getContainer();
    
    if (req.method === 'PATCH') {
      const updates = req.body;
      
      const sanitizedUpdates = {
        ...updates,
        ...(updates.genres !== undefined && {
          genres: updates.genres.map((g: string) => sanitizeString(g))
        }),
      };
      
      const useCase = new UpdateBookUseCase(
        container.bookRepository,
        container.goalRepository
      );
      
      const book = await useCase.execute({
        bookId: id,
        userId,
        updates: sanitizedUpdates,
      });
      
      return res.json({ book });
    }
    
    if (req.method === 'DELETE') {
      const useCase = new DeleteBookUseCase(container.bookRepository);
      
      await useCase.execute({
        bookId: id,
        userId,
      });
      
      return res.json({ message: 'Book deleted successfully' });
    }
    
    res.setHeader('Allow', ['PATCH', 'DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    handleError(error, res);
  }
}

export default withAuth(handler);
```

---

## Phase 5-8: Remaining Routes

Follow the same pattern for:

| Current Route | Serverless File | Methods |
|--------------|-----------------|---------|
| `/goals` | `api/goals/index.ts` | GET, POST |
| `/goals/:id` | `api/goals/[id].ts` | PATCH, DELETE |
| `/streaks` | `api/streaks/index.ts` | GET |
| `/streaks/activity` | `api/streaks/activity.ts` | POST |
| `/streaks/history` | `api/streaks/history.ts` | GET |
| `/search` | `api/search.ts` | GET |
| `/export/books` | `api/export/books.ts` | GET |
| `/export/goals` | `api/export/goals.ts` | GET |
| `/export/all` | `api/export/all.ts` | GET |

---

## Phase 9: Rate Limiting Setup

### 9.1 Create Upstash Redis Database

Upstash provides a serverless-friendly Redis that works perfectly with Vercel because it uses HTTP/REST instead of persistent connections.

**Step-by-step setup:**

1. **Sign up at [console.upstash.com](https://console.upstash.com/)**
   - You can sign up with GitHub, Google, or email
   - No credit card required for free tier

2. **Create a new Redis database:**
   - Click "Create Database"
   - Name: `bookbuddy-rate-limit` (or any name you prefer)
   - Region: Choose the closest to your users (e.g., `us-east-1` for US East)
   - Type: Keep "Regional" selected (free tier)
   - Enable TLS: Yes (recommended)

3. **Get your credentials:**
   - After creation, go to the "REST API" section
   - Copy the `UPSTASH_REDIS_REST_URL` (looks like `https://xxx.upstash.io`)
   - Copy the `UPSTASH_REDIS_REST_TOKEN` (long string starting with `AX...`)

4. **Free tier limits:**
   - 10,000 commands/day
   - 256 MB storage
   - More than enough for a personal app!

### 9.2 Add Environment Variables to Vercel

```bash
# Using Vercel CLI
vercel env add UPSTASH_REDIS_REST_URL
# Paste: https://your-database.upstash.io

vercel env add UPSTASH_REDIS_REST_TOKEN
# Paste: AXxxxx...
```

Or add via Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add `UPSTASH_REDIS_REST_URL` with your REST URL
3. Add `UPSTASH_REDIS_REST_TOKEN` with your REST Token
4. Select all environments (Production, Preview, Development)

### 9.3 Rate Limiting Configuration

The rate limiting is already configured in `api/_lib/rate-limit.ts`:

| Endpoint Type | Limit | Window | Purpose |
|---------------|-------|--------|---------|
| Global API | 100 requests | 1 minute | Prevent abuse |
| Auth endpoints | 5 requests | 1 minute | Prevent brute-force |

The implementation:
- Uses sliding window algorithm (smoother than fixed window)
- Fails open (if Redis is unavailable, requests are allowed)
- Sets standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Returns 429 status code when rate limited

### 9.4 Testing Rate Limiting Locally

For local development, rate limiting is **optional**. If the environment variables aren't set, requests will be allowed through with a warning in the console.

To test rate limiting locally:
```bash
# Add to .env.local
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx...

# Start local dev server
vercel dev

# Test rate limiting
for i in {1..10}; do curl -s http://localhost:3000/api/health | head -1; done
```

---

## Phase 10: iOS Configuration Update

Update `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/Network/NetworkClient.swift`:

```swift
@available(iOS 15.0, macOS 12.0, *)
public extension NetworkClient {
    /// Create a NetworkClient with the production configuration
    static func production() -> NetworkClient {
        let baseURL = URL(string: "https://your-app-name.vercel.app/api")!
        return NetworkClient(baseURL: baseURL)
    }
    
    /// Create a NetworkClient for development/testing
    static func development() -> NetworkClient {
        let baseURL = URL(string: "http://127.0.0.1:3000/api")!
        return NetworkClient(baseURL: baseURL)
    }
}
```

Also update the iOS endpoint paths to include `/api` prefix, OR use Vercel rewrites in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/auth/:path*", "destination": "/api/auth/:path*" },
    { "source": "/books/:path*", "destination": "/api/books/:path*" },
    { "source": "/goals/:path*", "destination": "/api/goals/:path*" },
    { "source": "/streaks/:path*", "destination": "/api/streaks/:path*" },
    { "source": "/search", "destination": "/api/search" },
    { "source": "/export/:path*", "destination": "/api/export/:path*" },
    { "source": "/health", "destination": "/api/health" }
  ]
}
```

This approach means NO changes needed to the iOS app!

---

## Phase 11: Deployment

### 11.1 Set Up Vercel Project

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add GOOGLE_BOOKS_API_KEY
```

### 11.2 Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### 11.3 Run Prisma Migrations

After deployment, you'll need to run migrations against your Supabase database:

```bash
# Set DATABASE_URL to Supabase connection string
export DATABASE_URL="postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres"

# Run migrations
npx prisma migrate deploy
```

---

## File Inventory: What Changes

### New Files to Create

```
api/
├── _lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── errors.ts
│   ├── rate-limit.ts
│   └── container.ts
├── health.ts
├── auth/
│   ├── register.ts
│   ├── login.ts
│   ├── refresh.ts
│   └── logout.ts
├── books/
│   ├── index.ts
│   ├── [id].ts
│   └── genres.ts
├── goals/
│   ├── index.ts
│   └── [id].ts
├── streaks/
│   ├── index.ts
│   ├── activity.ts
│   └── history.ts
├── search.ts
└── export/
    ├── books.ts
    ├── goals.ts
    └── all.ts

vercel.json
```

### Files to Keep (No Changes)

All of these remain useful:
- `domain/` - All domain entities, errors, interfaces ✅
- `application/` - All use cases ✅
- `infrastructure/` - All repositories and services ✅
- `lib/` - Utilities (config, sanitize, DI) ✅
- `prisma/` - Schema and migrations ✅
- `ios/` - iOS app (minor URL config change) ✅

### Files That Become Obsolete

After migration is complete and tested:
- `services/api/src/server.ts`
- `services/api/src/routes/*.ts`
- `services/api/src/middleware/*.ts`
- `services/api/src/utils/error-handler.ts`

These can be archived or deleted once serverless is working.

---

## Key Serverless Concepts to Understand

### 1. Cold Starts
The first request after inactivity takes ~100-300ms longer because the function needs to initialize. This is normal and acceptable for mobile apps.

### 2. Stateless Functions
Each request may hit a different function instance. No shared in-memory state between requests. That's why rate limiting needs Redis.

### 3. Execution Limits
Vercel functions have a 10-second default timeout (can be increased to 60s). Your API operations are fast, so this is fine.

### 4. Prisma in Serverless
The singleton pattern in `api/_lib/prisma.ts` prevents creating too many database connections.

### 5. Cost Model
- Vercel Free Tier: 100GB bandwidth, 100,000 function invocations/month
- Your usage: Likely <1% of these limits

---

## Testing Strategy

### Local Development

```bash
# Install Vercel CLI
npm i -g vercel

# Run locally (simulates serverless)
vercel dev
```

### Testing Endpoints

```bash
# Test health
curl http://localhost:3000/api/health

# Test auth
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

---

## Migration Checklist

- [x] Phase 1: Create `vercel.json` and install dependencies ✅
- [x] Phase 2: Create `api/_lib/` shared utilities ✅
- [x] Phase 3: Create `api/auth/*.ts` endpoints ✅
- [x] Phase 4: Create `api/books/*.ts` endpoints ✅
- [x] Phase 5: Create `api/goals/*.ts` endpoints ✅
- [x] Phase 6: Create `api/streaks/*.ts` endpoints ✅
- [x] Phase 7: Create `api/search.ts` endpoint ✅
- [x] Phase 8: Create `api/export/*.ts` endpoints ✅
- [x] Phase 9: Set up Upstash Redis and configure rate limiting ✅ (code complete, needs Upstash account setup)
- [ ] Phase 10: Update iOS app configuration
- [ ] Phase 11: Deploy to Vercel and test
- [ ] Phase 12: Update iOS app to point to production URL
- [ ] Phase 13: Test via TestFlight
- [ ] Phase 14: Archive old Fastify server code

---

## Questions?

This plan is designed to be executed incrementally. You can migrate one route group at a time, test it, then move to the next. The Vercel rewrites allow the iOS app to work unchanged throughout the migration.

Would you like me to start implementing any specific phase?