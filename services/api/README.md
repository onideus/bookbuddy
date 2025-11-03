# BookBuddy API Service

Standalone Fastify-based REST API for the BookBuddy platform. Provides JWT-authenticated endpoints for managing users, books, reading goals, and external book searches.

## Architecture

This service follows Clean Architecture principles:
- **Domain Layer**: Business entities, rules, and interfaces (`domain/`)
- **Application Layer**: Use cases and business workflows (`application/`)
- **Infrastructure Layer**: External integrations, database, security (`infrastructure/`)
- **Presentation Layer**: Fastify routes and HTTP handling (`services/api/src/`)

## Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL database
- npm or pnpm

### Installation

```bash
# From the project root
npm install

# Set up environment variables
cp services/api/.env.example services/api/.env
# Edit .env with your database credentials and secrets
```

### Database Setup

```bash
# Run Prisma migrations
npx prisma migrate dev

# Seed the database (optional)
npm run db:seed
```

### Running the Service

```bash
# Development mode (with hot reload)
npm run api:dev

# Build for production
npm run api:build

# Run production build
node services/api/dist/server.js
```

The API will be available at `http://localhost:4000` by default.

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and receive JWT tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Revoke refresh token

### Books
- `GET /books` - List user's books
- `POST /books` - Add a book to library
- `PATCH /books/:id` - Update book details
- `DELETE /books/:id` - Remove book from library

### Goals
- `GET /goals` - List user's reading goals
- `POST /goals` - Create a new reading goal
- `PATCH /goals/:id` - Update goal details
- `DELETE /goals/:id` - Delete a goal

### Search
- `GET /search` - Search for books via Google Books API

## Authentication

All endpoints (except `/health`, `/auth/register`, and `/auth/login`) require JWT authentication:

```bash
Authorization: Bearer <access_token>
```

Tokens are obtained via the `/auth/login` endpoint and must be refreshed using the `/auth/refresh` endpoint before expiry.

## Environment Variables

See `.env.example` for required configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 4000)
- `LOG_LEVEL` - Logging verbosity (info, debug, error)
- `JWT_SECRET` - Secret for signing JWT tokens
- `JWT_ACCESS_TOKEN_EXPIRY` - Access token lifetime (e.g., 15m)
- `JWT_REFRESH_TOKEN_EXPIRY` - Refresh token lifetime (e.g., 7d)
- `GOOGLE_BOOKS_API_KEY` - Optional Google Books API key

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Project Structure

```
services/api/
├── src/
│   ├── server.ts              # Fastify server setup
│   ├── routes/                # HTTP route handlers
│   │   ├── auth.ts
│   │   ├── books.ts
│   │   ├── goals.ts
│   │   └── search.ts
│   ├── middleware/            # JWT verification, error handling
│   └── utils/                 # Helpers (error mapping, validation)
├── dist/                      # Compiled JavaScript output
├── .env.example              # Environment template
├── .eslintrc.json            # ESLint configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Development

### Adding New Endpoints

1. Create a use case in `application/use-cases/`
2. Register the route in `src/routes/`
3. Apply JWT middleware for protected routes
4. Map domain errors to HTTP responses in route handler
5. Add integration tests

### Error Handling

Domain errors are mapped to HTTP responses:
- `ValidationError` → 400 Bad Request
- `UnauthorizedError` → 401 Unauthorized
- `ForbiddenError` → 403 Forbidden
- `NotFoundError` → 404 Not Found
- `DuplicateError` → 409 Conflict
- Other errors → 500 Internal Server Error

## Deployment

The service is stateless and can be deployed to any Node.js-compatible platform:
- Docker container
- Cloud platforms (AWS, GCP, Azure)
- Platform-as-a-Service (Heroku, Render, Railway)

Ensure environment variables are properly configured in production.

## Related Documentation

- [Architecture Overview](../../ARCHITECTURE.md)
- [Developer Guide](../../DEVELOPER_GUIDE.md)
- [Migration Plan](../../NEXT_REMOVAL.md)
