# Developer Quickstart: Book Information Search

**Feature**: 002-book-api-search
**Date**: 2025-10-29
**Estimated Setup Time**: 15-20 minutes

This guide walks you through setting up the book search feature locally, running tests, and debugging common issues.

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 20+ LTS installed (`node --version`)
- ✅ Docker and Docker Compose installed (`docker --version`, `docker-compose --version`)
- ✅ PostgreSQL database running (via existing BookBuddy setup)
- ✅ Git repository cloned and on `001-book-api-search` branch

---

## Quick Start (5 minutes)

### 1. Start Redis via Docker Compose

```bash
# Start Redis service
docker-compose up -d redis

# Verify Redis is running
docker ps | grep redis
docker-compose ps redis
```

**Expected Output**:
```
bookbuddy-redis   redis:7-alpine   Up 5 seconds   6379/tcp
```

### 2. Install Dependencies

```bash
# Install new dependencies (ioredis, opossum, axios, fuzzball)
cd backend
npm install

# Or from repo root
npm install --workspace=backend
```

**New Dependencies**:
- `ioredis` - Redis client for L1 caching
- `opossum` - Circuit breaker for resilience
- `axios` - HTTP client for external APIs
- `fuzzball` - Fuzzy string matching for duplicate detection
- `@pollyjs/core` - HTTP recording for tests (dev dependency)

### 3. Run Database Migration

```bash
# Run migration 003 to create new tables
cd backend
npm run migrate:up

# Or manually with psql
DATABASE_URL=postgresql://bookbuddy:bookbuddy_dev_password@localhost:5432/bookbuddy_dev \
  psql -f migrations/003_book_search_tables.sql
```

**Migration Creates**:
- Extended `books` table with new columns (normalized_title, primary_author, etc.)
- New `book_editions` table
- New `book_metadata_sources` table
- New `reading_entry_overrides` table
- New `book_search_cache` table
- Indexes for fuzzy search (pg_trgm)

**Verify Migration**:
```sql
-- Check new tables exist
\dt book_editions
\dt book_metadata_sources
\dt reading_entry_overrides
\dt book_search_cache

-- Check pg_trgm extension
\dx pg_trgm
```

### 4. Set Environment Variables (Optional)

Create or update `.env` file:

```bash
# backend/.env

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Google Books API (Optional - increases rate limit)
GOOGLE_BOOKS_API_KEY=

# Cache Configuration
REDIS_CACHE_TTL=43200  # 12 hours
PG_CACHE_TTL=2592000   # 30 days

# Circuit Breaker Configuration
CIRCUIT_BREAKER_TIMEOUT=2500           # 2.5 seconds
CIRCUIT_BREAKER_ERROR_THRESHOLD=50     # 50% failure rate
CIRCUIT_BREAKER_RESET_TIMEOUT=30000    # 30 seconds

# Rate Limiting
SEARCH_RATE_LIMIT_PER_USER=10          # 10 searches/minute per user
```

**Note**: Google Books API works without a key (lower rate limit: 1,000 req/day). Obtain a key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) for higher limits.

### 5. Start Development Servers

```bash
# Terminal 1: Start backend API
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

**Verify Services Running**:
- Backend: http://localhost:3000/health
- Frontend: http://localhost:5173

---

## Testing the Feature

### Manual Testing

#### 1. Search for a Book

```bash
# Using curl
curl -X GET "http://localhost:3000/api/books/search?q=1984%20George%20Orwell&type=combined&limit=5"

# Using httpie (more readable)
http GET "http://localhost:3000/api/books/search" q=="1984 George Orwell" type==combined limit==5
```

**Expected Response** (abbreviated):
```json
{
  "results": [
    {
      "id": "goog_IyMCtAEACAAJ",
      "title": "1984",
      "author": "George Orwell",
      "isbn": "9780451524935",
      "provider": "google_books"
    }
  ],
  "totalCount": 247,
  "cacheHit": false,
  "provider": "google_books"
}
```

#### 2. Create Book from Search Result

```bash
# Add book to library
curl -X POST "http://localhost:3000/api/books/from-search" \
  -H "Content-Type: application/json" \
  -d '{
    "resultId": "goog_IyMCtAEACAAJ",
    "provider": "google_books"
  }'
```

#### 3. Test Duplicate Detection

```bash
# Try to add the same book again
curl -X POST "http://localhost:3000/api/books/from-search" \
  -H "Content-Type: application/json" \
  -d '{
    "resultId": "goog_IyMCtAEACAAJ",
    "provider": "google_books"
  }'
```

**Expected Response**:
```json
{
  "duplicate": true,
  "matchType": "isbn",
  "confidence": 1.0,
  "existingBook": { /* existing book data */ },
  "message": "This book may already be in your library..."
}
```

#### 4. Test Cache Behavior

```bash
# First search (cache miss)
time curl "http://localhost:3000/api/books/search?q=test" -w "\nTime: %{time_total}s\n"

# Second search (cache hit - should be faster)
time curl "http://localhost:3000/api/books/search?q=test" -w "\nTime: %{time_total}s\n"
```

### Automated Tests

#### Unit Tests

```bash
cd backend

# Run all unit tests
npm run test:unit

# Run specific test suite
npm run test:unit -- services/book-search

# Watch mode
npm run test:unit -- --watch
```

**Test Coverage**:
```bash
npm run test:coverage
open coverage/index.html  # View coverage report
```

**Expected Coverage**: ≥90% for all modules

#### Integration Tests

```bash
# Run integration tests (uses Polly.js cassettes)
npm run test:integration

# Refresh HTTP cassettes (records new API responses)
npm run test:integration -- --refresh-cassettes
```

**Note**: Integration tests use pre-recorded HTTP responses (cassettes) so they don't consume API quota.

#### Contract Tests

```bash
# Run contract tests against live API (caution: uses quota)
RUN_CONTRACT_TESTS=true npm run test:contract

# Schedule these to run nightly, not on every test run
```

#### E2E Tests

```bash
# Run end-to-end tests with Playwright
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- book-search.spec.js
```

---

## Architecture Overview

### System Components

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────┐
│   Fastify API Server    │
│  /api/books/search      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  BookSearchService      │
│  (Orchestrates search)  │
└───────────┬─────────────┘
            │
            ├──► Check Redis Cache (L1, 12h TTL)
            │    └─► Cache Hit? Return results
            │
            ├──► Check PostgreSQL Cache (L2, 30d TTL)
            │    └─► Cache Hit? Store in Redis, return
            │
            ├──► Circuit Breaker (Opossum)
            │    └─► Open? Fallback to cache or error
            │
            ▼
┌─────────────────────────┐
│   Provider Abstraction  │
│  (Base + Concrete)      │
└───────────┬─────────────┘
            │
            ├──► GoogleBooksProvider
            │    └─► API Call with timeout (2.5s)
            │
            └──► OpenLibraryProvider (fallback)
                 └─► API Call with timeout (2.5s)
```

### Data Flow

**Search Flow**:
1. User enters search query in UI
2. Frontend calls `GET /api/books/search`
3. Backend checks Redis cache (L1)
4. On miss, checks PostgreSQL cache (L2)
5. On miss, circuit breaker protects external API call
6. Provider fetches from Google Books API
7. Results normalized to internal format
8. Stored in PostgreSQL (30d) and Redis (12h)
9. Returned to user

**Add Book Flow**:
1. User selects search result
2. Frontend calls `POST /api/books/from-search`
3. Backend checks for duplicates (ISBN → fuzzy)
4. If duplicate, prompts user for action
5. If new, creates Book, BookEdition, BookMetadataSource
6. Creates ReadingEntry for user
7. Applies any user overrides
8. Returns book data to frontend

### File Structure

```
backend/
├── src/
│   ├── services/
│   │   └── book-search/
│   │       ├── index.js                  # Main search service
│   │       ├── providers/
│   │       │   ├── base-provider.js      # Abstract interface
│   │       │   ├── google-books.js       # Google Books impl
│   │       │   └── open-library.js       # Open Library impl
│   │       ├── cache-manager.js          # Multi-layer cache
│   │       ├── circuit-breaker.js        # Opossum wrapper
│   │       ├── duplicate-detector.js     # ISBN + fuzzy
│   │       └── normalizer.js             # Response transform
│   ├── models/
│   │   ├── book-edition.js               # NEW
│   │   ├── book-metadata-source.js       # NEW
│   │   ├── reading-entry-override.js     # NEW
│   │   └── book-search-cache.js          # NEW
│   └── api/routes/
│       └── book-search.js                # API endpoints
└── tests/
    ├── unit/
    │   └── services/book-search/         # Unit tests
    ├── integration/
    │   └── book-search-flow.test.js      # Integration tests
    ├── contract/
    │   └── google-books-api.test.js      # Contract tests
    └── e2e/
        └── book-search.spec.js           # E2E tests
```

---

## Troubleshooting

### Redis Connection Issues

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
docker-compose up -d redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection
redis-cli ping
# Expected: PONG
```

### Migration Fails

**Problem**: `ERROR:  relation "book_editions" already exists`

**Solution**:
```bash
# Roll back migration
npm run migrate:down

# Re-run migration
npm run migrate:up

# Or manually drop and recreate
DATABASE_URL=... psql -c "DROP TABLE IF EXISTS book_editions CASCADE;"
npm run migrate:up
```

### API Key Issues

**Problem**: `Google Books API returns 403 Forbidden`

**Solutions**:
1. **No API key**: Works with lower rate limit (1,000 req/day). Should be sufficient for development.
2. **Need higher limit**: Get API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. **Key not working**: Ensure key has "Books API" enabled in Google Cloud Console

### Cache Not Working

**Problem**: Searches always hit external API (slow, consumes quota)

**Debug Steps**:
```bash
# Check Redis is accessible
redis-cli
> KEYS book:search:*
> GET book:search:{some-key}:google_books

# Check PostgreSQL cache
psql $DATABASE_URL -c "SELECT COUNT(*) FROM book_search_cache;"

# Enable debug logging
DEBUG=bookbuddy:cache npm run dev
```

### Duplicate Detection Not Working

**Problem**: Same book added multiple times

**Debug Steps**:
```sql
-- Check for duplicates by ISBN
SELECT * FROM book_editions WHERE isbn_13 = '9780451524935';

-- Check fingerprint index
SELECT fingerprint, COUNT(*)
FROM books
GROUP BY fingerprint
HAVING COUNT(*) > 1;

-- Check pg_trgm extension
\dx pg_trgm

-- Test fuzzy matching
SELECT similarity('1984', '1984') AS sim;  -- Should be 1.0
SELECT similarity('1984', 'Nineteen Eighty-Four') AS sim;  -- Should be ~0.3
```

### Circuit Breaker Always Open

**Problem**: `Error: Circuit breaker is open`

**Debug Steps**:
```bash
# Check circuit breaker metrics
curl http://localhost:3000/metrics | grep circuit_breaker

# Check provider health
curl https://www.googleapis.com/books/v1/volumes?q=test

# Reset circuit breaker (restart server)
npm run dev
```

### Tests Failing

**Problem**: Tests fail with `TypeError: Cannot read property 'search' of undefined`

**Solutions**:
```bash
# Ensure dependencies installed
npm install

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests in verbose mode
npm run test -- --verbose

# Update test cassettes
npm run test:integration -- --refresh-cassettes
```

---

## Performance Tuning

### Cache Hit Rate Monitoring

```javascript
// Add to backend/src/services/book-search/cache-manager.js
const cacheHits = { redis: 0, postgres: 0, miss: 0 };

setInterval(() => {
  const total = cacheHits.redis + cacheHits.postgres + cacheHits.miss;
  const hitRate = ((cacheHits.redis + cacheHits.postgres) / total * 100).toFixed(2);
  console.log(`Cache hit rate: ${hitRate}% (Redis: ${cacheHits.redis}, PG: ${cacheHits.postgres}, Miss: ${cacheHits.miss})`);
}, 60000); // Log every minute
```

**Target**: >70% cache hit rate (per SC-008)

### Response Time Monitoring

```bash
# Add response time logging
DEBUG=express:* npm run dev

# Use `time` to measure
time curl "http://localhost:3000/api/books/search?q=test"

# Expected:
# - Cache hit: <100ms
# - Cache miss (API call): <3s (per SC-002)
```

### Database Query Optimization

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%book%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

---

## Next Steps

1. ✅ **Setup Complete**: Redis running, migration applied, tests passing
2. **Implement Feature**: Run `/speckit.tasks` to generate implementation tasks
3. **Follow TDD**: Write tests first (red), implement (green), refactor
4. **Monitor Metrics**: Track cache hit rate, response times, circuit breaker state
5. **Deploy**: Update docker-compose.yml for production Redis configuration

---

## Additional Resources

- [API Contract](./contracts/book-search-api.yaml) - OpenAPI specification
- [Data Model](./data-model.md) - Complete entity definitions
- [Research Document](./research.md) - Technical decisions and rationale
- [Implementation Plan](./plan.md) - Full feature plan
- [Google Books API Docs](https://developers.google.com/books/docs/v1/using)
- [Open Library API Docs](https://openlibrary.org/dev/docs/api/search)

---

## Getting Help

**Common Issues**: Check troubleshooting section above

**Questions**: Ask in team chat or create GitHub issue

**Bugs**: Report with:
1. Error message
2. Steps to reproduce
3. Expected vs. actual behavior
4. Environment details (Node version, OS, etc.)

---

**Quickstart Status**: ✅ **COMPLETE**
**Next**: Run `/speckit.tasks` to generate implementation tasks
**Date**: 2025-10-29
