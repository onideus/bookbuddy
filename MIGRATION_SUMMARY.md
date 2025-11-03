# Next.js to Fastify API Migration Summary

## Overview
This document summarizes the completed migration from a Next.js full-stack application to a standalone Fastify-based REST API with JWT authentication.

## Migration Date
January 2025

## What Was Removed
- Next.js web application (`app/`, `components/`, `public/`)
- Next.js configuration files (`next.config.ts`, `middleware.ts`, `next-env.d.ts`)
- React and React DOM dependencies
- Tailwind CSS and PostCSS configurations
- Playwright end-to-end tests
- NextAuth.js session management

## What Was Added

### API Infrastructure (`services/api/`)
- **Fastify Server** (`services/api/src/server.ts`)
  - HTTP server on port 4000 (configurable)
  - Health check endpoint
  - Structured logging

### Routes (`services/api/src/routes/`)
- **Authentication** (`auth.ts`)
  - `POST /auth/register` - User registration with JWT tokens
  - `POST /auth/login` - User login with JWT tokens
  - `POST /auth/refresh` - Refresh access token
  - `POST /auth/logout` - Revoke refresh token

- **Books** (`books.ts`)
  - `GET /books` - List user's books (requires JWT)
  - `POST /books` - Add a book (requires JWT)
  - `PATCH /books/:id` - Update book (requires JWT)
  - `DELETE /books/:id` - Delete book (requires JWT)

- **Goals** (`goals.ts`)
  - `GET /goals` - List user's reading goals (requires JWT)
  - `POST /goals` - Create a goal (requires JWT)
  - `PATCH /goals/:id` - Update goal (requires JWT)
  - `DELETE /goals/:id` - Delete goal (requires JWT)

- **Search** (`search.ts`)
  - `GET /search?q=<query>` - Search for books via Google Books API

### Authentication System
- **JWT Token Generation** (`services/api/src/utils/jwt.ts`)
  - Access tokens (15-minute expiry by default)
  - Refresh tokens (7-day expiry by default)
  - Token verification and validation

- **Auth Middleware** (`services/api/src/middleware/auth.ts`)
  - Bearer token verification
  - User context injection into requests
  - Automatic rejection of invalid/expired tokens

- **Refresh Token Storage** (Prisma)
  - Database-backed refresh token management
  - Token rotation on refresh
  - Revocation support

### Error Handling (`services/api/src/utils/error-handler.ts`)
- Centralized error mapping from domain errors to HTTP responses
- `ValidationError` → 400 Bad Request
- `UnauthorizedError` → 401 Unauthorized
- `ForbiddenError` → 403 Forbidden
- `NotFoundError` → 404 Not Found
- `DuplicateError` → 409 Conflict
- Other errors → 500 Internal Server Error

### Type Contracts (`types/contracts/`)
- Shared TypeScript interfaces for API requests/responses
- `auth.ts` - Authentication contracts
- `books.ts` - Book management contracts
- `goals.ts` - Goal management contracts
- `search.ts` - Search contracts

### Database Schema Updates
- **RefreshToken Model** (`prisma/schema.prisma`)
  - Stores refresh tokens with expiry and revocation tracking
  - Foreign key to User model
  - Indexes for performance

## Architecture Preserved

The migration preserved the existing Clean Architecture:

### Domain Layer (`domain/`)
- Entities: `User`, `Book`, `Goal`
- Value Objects: `ReadingStatus`, `GoalProgress`
- Interfaces: Repository patterns
- Domain Errors: Custom error types
- Services: Business logic (unchanged)

### Application Layer (`application/`)
- Use Cases: All 11 use cases maintained
  - Auth: `RegisterUserUseCase`
  - Books: `GetUserBooksUseCase`, `AddBookUseCase`, `UpdateBookUseCase`, `DeleteBookUseCase`
  - Goals: `GetUserGoalsUseCase`, `CreateGoalUseCase`, `UpdateGoalUseCase`, `DeleteGoalUseCase`
  - Search: `SearchBooksUseCase`

### Infrastructure Layer (`infrastructure/`)
- Persistence: Prisma repositories (unchanged)
- External: Google Books API client (unchanged)
- Security: Bcrypt password hasher (unchanged)

### Dependency Injection (`lib/di/container.ts`)
- Container pattern maintained
- Added `RefreshTokenRepository` to DI container

## Environment Variables

### Required Variables (`.env`)
```bash
# Database
DATABASE_URL="postgresql://..."

# JWT Configuration (NEW)
JWT_SECRET="your-secret-key"
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"

# Server Configuration (NEW)
PORT=4000
LOG_LEVEL=info

# Google Books API (Optional)
GOOGLE_BOOKS_API_KEY="your-api-key"

# Node Environment
NODE_ENV=development
```

### Removed Variables
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY` (now `GOOGLE_BOOKS_API_KEY`)

## Running the Application

### Development
```bash
npm run dev
# or
npm run api:dev
```
API runs on `http://localhost:4000`

### Production
```bash
# Build
npm run build

# Start
npm start
```

### Database Migrations
```bash
# Run pending migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

## Testing
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## API Authentication Flow

### Registration/Login
1. Client sends credentials to `/auth/register` or `/auth/login`
2. Server validates credentials
3. Server generates:
   - Short-lived access token (JWT)
   - Long-lived refresh token (UUID stored in DB)
4. Client receives both tokens and user data

### Authenticated Requests
1. Client includes access token in request header:
   ```
   Authorization: Bearer <access_token>
   ```
2. Server validates token via middleware
3. Server injects user context into request
4. Route handler processes request with user data

### Token Refresh
1. When access token expires, client sends refresh token to `/auth/refresh`
2. Server validates refresh token (not revoked, not expired)
3. Server revokes old refresh token
4. Server generates new access token and refresh token
5. Client receives new token pair

### Logout
1. Client sends refresh token to `/auth/logout`
2. Server revokes the refresh token
3. Access token expires naturally (short-lived)

## iOS Client Integration

The iOS client must be updated to:
1. Authenticate via `/auth/login` or `/auth/register`
2. Store access/refresh tokens in Keychain
3. Attach bearer token to all API requests
4. Handle 401 responses by refreshing tokens
5. Implement automatic token refresh before expiry

See `ios/README.md` for detailed integration instructions.

## Breaking Changes

### For Web Clients
- **Complete removal**: The web UI no longer exists
- **New authentication**: Must implement JWT-based auth flow
- **New base URL**: API runs on port 4000 (not 3000)

### For iOS Clients
- **Authentication change**: Replace any existing auth mechanism with JWT
- **Header change**: Must include `Authorization: Bearer <token>` header
- **Remove temporary auth**: No longer use `x-user-id` header/query param

## Benefits of Migration

1. **Separation of Concerns**: API is now platform-agnostic
2. **Stateless Authentication**: JWT tokens enable horizontal scaling
3. **Improved Security**: Token-based auth with rotation and revocation
4. **Reduced Dependencies**: Removed 291 npm packages
5. **Clearer Architecture**: API surface explicitly defined
6. **Better Performance**: Fastify is faster than Next.js API routes
7. **Flexible Deployment**: API can be deployed independently

## Next Steps

1. ✅ Complete migration (Phase 1-3)
2. ⏳ Add API integration tests (Phase 4)
3. ⏳ Update iOS client for JWT authentication
4. ⏳ Deploy API to production environment
5. ⏳ Set up API monitoring and logging
6. ⏳ Implement rate limiting
7. ⏳ Add API documentation (OpenAPI/Swagger)

## Rollback Plan

If rollback is necessary:
1. Restore from git commit `984cf63` (before migration)
2. Run `npm install` to restore dependencies
3. Run database migration to remove `refresh_tokens` table
4. Restart Next.js dev server

## Support

For questions or issues related to this migration:
- Review this document and `NEXT_REMOVAL.md`
- Check `services/api/README.md` for API-specific documentation
- Review architecture documentation in `ARCHITECTURE.md`
- Consult developer guide in `DEVELOPER_GUIDE.md`
