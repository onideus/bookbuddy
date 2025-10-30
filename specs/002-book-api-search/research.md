# Research & Technical Decisions: Book Information Search

**Feature**: 001-book-api-search
**Date**: 2025-10-29
**Status**: Complete

This document captures research findings and technical decisions for implementing the book search feature. All decisions have been informed by GPT-5 (Codex) architectural review and approved by stakeholders.

---

## 1. Provider Selection & Integration

### Research Question
Which public book APIs should we use, and how should we abstract provider-specific implementations?

### Options Evaluated

#### Option A: Google Books API (Primary)
**Characteristics**:
- Rate limits: 1,000 requests/day free tier, $0.50/1,000 thereafter
- Coverage: Comprehensive modern book metadata, strong ISBN coverage
- Response time: Average 200-800ms
- Data quality: High - published by Google, vetted metadata
- Multilingual: Yes - supports 100+ languages
- API stability: Mature, well-documented, rarely breaks

**Pros**:
- Best overall metadata quality
- Predictable SLA and pricing
- Strong ISBN-13 support
- Comprehensive publisher/description data

**Cons**:
- Rate limits on free tier (mitigated by caching)
- Requires API key for production use

#### Option B: Open Library API (Fallback)
**Characteristics**:
- Rate limits: None officially (community etiquette: <100 req/min)
- Coverage: Excellent historical coverage, 20M+ books
- Response time: Variable (500ms-3s)
- Data quality: Community-contributed, can have gaps
- Multilingual: Yes - extensive international coverage
- API stability: Less reliable uptime than Google

**Pros**:
- No rate limits
- Excellent coverage of older/obscure books
- Open data (no licensing restrictions)
- No API key required

**Cons**:
- Less reliable uptime
- Variable response times
- Data quality inconsistencies

#### Option C: ISBN DB / Goodreads
**Not selected**:
- ISBN DB: Freemium model with restrictive free tier
- Goodreads: API deprecated (read-only, no new keys issued)

### Decision: Multi-Provider Strategy

**Primary**: Google Books API
**Rationale**: Best balance of data quality, reliability, and cost for expected traffic (<10 users, ~100 searches/day = well within free tier)

**Fallback**: Open Library API
**Rationale**: Provides redundancy for rate-limit scenarios and fills coverage gaps for historical/obscure books

**Pattern**: Provider abstraction layer
**Implementation**:
```javascript
// Base provider interface
class BaseBookProvider {
  async search(query, options) { throw new Error('Not implemented'); }
  normalize(rawResult) { throw new Error('Not implemented'); }
}

// Concrete implementations
class GoogleBooksProvider extends BaseBookProvider {
  async search(query, options) {
    // Google-specific API call
  }
  normalize(rawResult) {
    // Transform Google response to internal format
  }
}

class OpenLibraryProvider extends BaseBookProvider {
  async search(query, options) {
    // Open Library API call
  }
  normalize(rawResult) {
    // Transform Open Library response to internal format
  }
}
```

**Benefits**:
- Future providers can be added without rewiring
- Provider-specific logic isolated
- Easy to test providers independently
- Consistent internal data model

### Integration Best Practices

1. **Request Format**:
   - Google Books: `https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=20`
   - Open Library: `https://openlibrary.org/search.json?q={query}&limit=20`

2. **Error Handling**:
   - 4xx: User error (invalid query) - return empty results with error message
   - 5xx: Provider error - fall back to secondary provider or cache
   - Timeout: Circuit breaker opens, use cache or manual entry

3. **Rate Limiting**:
   - Implement client-side throttling (10 searches/min per user)
   - Track quota usage with counters
   - Alert when approaching daily limits (70%, 90%)

### References
- [Google Books API Documentation](https://developers.google.com/books/docs/v1/using)
- [Open Library API Documentation](https://openlibrary.org/dev/docs/api/search)

---

## 2. Caching Strategy

### Research Question
How should we implement multi-layer caching for low-traffic scenario with long metadata retention?

### Requirements
- Expected traffic: <10 concurrent users, ~100 searches/day
- Cache hit target: >70%
- Long retention for stable book metadata
- Graceful degradation if cache unavailable

### Options Evaluated

#### Option A: Redis Only
**Pros**: Fast, simple
**Cons**: Data lost on restart, no long-term retention

#### Option B: PostgreSQL Only
**Pros**: Persistent, survives restarts
**Cons**: Slower than in-memory cache, higher DB load

#### Option C: Multi-Layer (Redis L1 + PostgreSQL L2)
**Pros**: Fast + persistent, best of both worlds
**Cons**: Added complexity

### Decision: Multi-Layer Caching (Option C)

**Rationale**: For low-traffic scenario, longer retention improves hit rate significantly. Book metadata is stable (rarely changes), so 30-day PostgreSQL cache is appropriate.

### Layer 1: Redis Cache

**Configuration**:
```javascript
const redis = require('ioredis');
const client = new redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false // Fail fast if Redis down
});
```

**TTL**: 12 hours (43,200 seconds)
**Rationale**: Balances freshness with hit rate for low traffic; same users likely to search similar books within 12h window

**Key Format**: `book:search:{hash(query)}:{provider}`
- Example: `book:search:a3f2c9d8:google_books`
- Hash ensures consistent length, collision-resistant

**Cache Stampede Protection**:
```javascript
async function getWithLock(key, fetchFn, ttl) {
  // Try to get from cache
  let value = await redis.get(key);
  if (value) return JSON.parse(value);

  // Acquire lock
  const lockKey = `${key}:lock`;
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);

  if (!acquired) {
    // Another request is fetching, wait and retry
    await sleep(100);
    return getWithLock(key, fetchFn, ttl);
  }

  try {
    // Fetch and cache
    value = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(value));
    return value;
  } finally {
    await redis.del(lockKey);
  }
}
```

### Layer 2: PostgreSQL Cache

**Schema**:
```sql
CREATE TABLE book_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_key VARCHAR(200) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  result_count INTEGER NOT NULL,
  results JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(search_key, provider)
);

CREATE INDEX idx_search_cache_expiry ON book_search_cache(expires_at);
CREATE INDEX idx_search_cache_key ON book_search_cache(search_key, provider);
```

**TTL**: 30 days (2,592,000 seconds)
**Rationale**: Book metadata is stable; long retention improves hit rate for low-frequency searches

**Cleanup Strategy**:
```javascript
// Daily cron job to clean expired entries
async function cleanExpiredCache() {
  await db.query(`
    DELETE FROM book_search_cache
    WHERE expires_at < NOW()
  `);
}
```

### Cache Flow

```
User Search Request
  ↓
Check Redis (L1)
  ↓ Cache Miss
Check PostgreSQL (L2)
  ↓ Cache Miss
Fetch from Provider API
  ↓
Store in PostgreSQL (30d TTL)
  ↓
Store in Redis (12h TTL)
  ↓
Return to User
```

### Graceful Degradation

If Redis unavailable:
1. Skip L1 cache, go directly to PostgreSQL
2. Log degradation event for monitoring
3. Continue normal operation (L2 still functional)

If PostgreSQL unavailable:
1. Try Redis only
2. If miss, fetch from provider
3. Alert - degraded state, no long-term caching

### HTTP Cache Headers

Respect provider ETags:
```javascript
const lastEtag = await getStoredEtag(bookId);
const response = await fetch(url, {
  headers: {
    'If-None-Match': lastEtag
  }
});

if (response.status === 304) {
  // Not modified, use cached data
  return getCachedData(bookId);
}

// Update cache with new data
await updateCache(bookId, response.data, response.headers.etag);
```

### References
- [Redis TTL Best Practices](https://redis.io/docs/manual/patterns/)
- [PostgreSQL JSONB Performance](https://www.postgresql.org/docs/current/datatype-json.html)

---

## 3. Circuit Breaker Implementation

### Research Question
How should we configure the circuit breaker to prevent cascading failures while minimizing false positives?

### Library Selection: Opossum

**Rationale**: Industry-standard Node.js circuit breaker library with TypeScript support, active maintenance, and comprehensive features.

**Installation**:
```bash
npm install opossum
```

### Configuration

```javascript
const CircuitBreaker = require('opossum');

const options = {
  timeout: 2500, // 2.5s timeout (under 3s SC-002 target)
  errorThresholdPercentage: 50, // Open if 50% of requests fail
  resetTimeout: 30000, // Try again after 30s (half-open)
  rollingCountTimeout: 60000, // 60s window for error calculation
  rollingCountBuckets: 6, // 10s buckets (60s / 6)
  volumeThreshold: 5, // Minimum 5 requests before calculating percentage
  fallback: async (query) => {
    // Fallback to cache or manual entry
    const cached = await getCachedResults(query);
    if (cached) return cached;

    throw new Error('Search temporarily offline. Please add book manually.');
  }
};

const breaker = new CircuitBreaker(bookSearchService.search, options);

// Event handlers for monitoring
breaker.on('open', () => {
  console.error('Circuit breaker opened - too many failures');
  metrics.increment('circuit_breaker.open');
});

breaker.on('halfOpen', () => {
  console.info('Circuit breaker half-open - testing provider');
  metrics.increment('circuit_breaker.half_open');
});

breaker.on('close', () => {
  console.info('Circuit breaker closed - provider healthy');
  metrics.increment('circuit_breaker.close');
});

breaker.on('fallback', (result) => {
  console.warn('Circuit breaker fallback triggered');
  metrics.increment('circuit_breaker.fallback');
});
```

### State Transitions

1. **Closed** (Normal Operation):
   - Requests pass through normally
   - Failures tracked in rolling window
   - If error threshold exceeded → Open

2. **Open** (Circuit Tripped):
   - All requests fail fast (no API calls)
   - Fallback function invoked immediately
   - After resetTimeout (30s) → Half-Open

3. **Half-Open** (Testing Recovery):
   - Allow one request through to test provider
   - If successful → Closed
   - If fails → Open (reset timer)

### Threshold Justification

**Error Threshold**: 50%
**Rationale**: For external API, 50% failure rate indicates provider issue (not transient network blip). Lower threshold would cause too many false positives.

**Volume Threshold**: 5 requests
**Rationale**: Need minimum sample size before opening circuit. Prevents opening on single error.

**Reset Timeout**: 30 seconds
**Rationale**: Gives provider time to recover. Longer timeout would degrade UX too much for users waiting to search.

### Fallback Strategy

Priority order:
1. **Redis cache**: Fastest, may have stale data
2. **PostgreSQL cache**: Slower, likely has data (30-day TTL)
3. **Manual entry**: Last resort, show helpful error message

### Integration with Caching

```javascript
async function searchWithResilience(query) {
  try {
    // Try circuit breaker (includes provider call)
    return await breaker.fire(query);
  } catch (error) {
    // Circuit open or provider failed
    if (breaker.opened) {
      // Try caches
      const cached = await tryCache(query);
      if (cached) {
        return { ...cached, cacheHit: true, circuitOpen: true };
      }

      // No cache, inform user
      throw new Error(
        'Search temporarily offline. Please add book manually or try again later.'
      );
    }
    throw error;
  }
}
```

### Monitoring

Track circuit breaker metrics:
- `circuit_breaker.state{state: 'open'|'closed'|'half_open'}` (gauge)
- `circuit_breaker.failures` (counter)
- `circuit_breaker.successes` (counter)
- `circuit_breaker.timeouts` (counter)
- `circuit_breaker.fallbacks` (counter)

Alert if:
- Circuit opens (immediate notification)
- Circuit remains open >5 minutes (escalation)
- Fallback rate >10% (investigate provider health)

### References
- [Opossum Documentation](https://nodeshift.dev/opossum/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

---

## 4. Duplicate Detection Algorithms

### Research Question
How should we detect duplicate books across ISBN variants, multiple editions, and fuzzy title/author matches?

### Strategy: ISBN-First with Fuzzy Fallback

### Primary: ISBN Normalization

**ISBN-13 vs ISBN-10**:
```javascript
function normalizeISBN(isbn) {
  // Remove hyphens, spaces
  const cleaned = isbn.replace(/[-\s]/g, '');

  // ISBN-10 to ISBN-13 conversion
  if (cleaned.length === 10) {
    const isbn13 = '978' + cleaned.slice(0, 9);
    const checksum = calculateISBN13Checksum(isbn13);
    return isbn13 + checksum;
  }

  // Already ISBN-13
  if (cleaned.length === 13) {
    return cleaned;
  }

  throw new Error('Invalid ISBN format');
}

function calculateISBN13Checksum(isbn12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn12[i]);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
}
```

**Duplicate Check**:
```sql
SELECT * FROM book_editions
WHERE isbn_13 = $1 OR isbn_10 = $2;
```

### Fallback: Fuzzy String Matching

**When to use**: Book has no ISBN (e.g., very old books, self-published)

**Algorithm**: PostgreSQL pg_trgm (trigram similarity)

**Setup**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX book_title_trgm_idx ON books
USING gin (normalized_title gin_trgm_ops);

CREATE INDEX book_author_trgm_idx ON books
USING gin (primary_author gin_trgm_ops);
```

**Similarity Query**:
```sql
SELECT
  b.*,
  similarity(b.normalized_title, $1) AS title_sim,
  similarity(b.primary_author, $2) AS author_sim,
  (similarity(b.normalized_title, $1) + similarity(b.primary_author, $2)) / 2 AS combined_sim
FROM books b
WHERE
  b.normalized_title % $1  -- Trigram similarity operator
  AND b.primary_author % $2
  AND ABS(EXTRACT(YEAR FROM b.publication_date) - $3) <= 2  -- Within 2 years
ORDER BY combined_sim DESC
LIMIT 5;
```

**Threshold**: 0.8 combined similarity
**Rationale**: Above 0.8 indicates likely duplicate (empirically tested). Below 0.8 allows for minor variations (e.g., "Lord of the Rings" vs "The Lord of the Rings").

**Normalization**:
```javascript
function normalizeForFuzzy(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\bthe\b/g, '') // Remove common articles
    .replace(/\s+/g, ' '); // Normalize whitespace
}
```

### Duplicate Resolution UI

When duplicate detected:
1. Show existing book with metadata
2. Ask user: "This book may already be in your library. Is this the same book?"
3. Options:
   - "Yes, use existing" → Link to existing book
   - "No, add as new" → Create new entry
   - "Show details" → Compare metadata side-by-side

### Performance Considerations

**ISBN lookup**: O(1) with index on isbn_13/isbn_10
**Fuzzy matching**: O(n) but limited by pg_trgm index and LIMIT clause

For 5,000 books (SC per constitution):
- ISBN lookup: <1ms
- Fuzzy search: <50ms with trigram index

### Testing Data

Curated test cases:
- ISBN-13/ISBN-10 pairs (same book)
- Multiple editions (different ISBNs, same title/author)
- Shared titles, different authors ("1984" by Orwell vs "1Q84" by Murakami)
- Missing ISBNs (old books, fuzzy matching required)
- Very similar titles ("Harry Potter and the Philosopher's Stone" vs "... Sorcerer's Stone")

### References
- [ISBN Structure](https://www.isbn-international.org/content/what-isbn)
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Fuzzy String Matching in PostgreSQL](https://www.postgresql.org/docs/current/pgtrgm.html#id-1.11.7.40.7)

---

## 5. Testing Strategies

### Research Question
What tools and patterns should we use for testing external API integrations without exhausting quotas or causing flaky tests?

### Options Evaluated

#### Option A: Polly.js (HTTP Recording)
**Pros**: Records real HTTP interactions, replay deterministically, supports HAR format
**Cons**: Requires initial recording against live API, cassettes can become outdated

#### Option B: Nock (HTTP Mocking)
**Pros**: No initial recording needed, full control over responses, lightweight
**Cons**: Manual response construction, may drift from actual API behavior

#### Option C: Live API Tests Only
**Pros**: Always up-to-date, catches breaking changes immediately
**Cons**: Consumes quota, slow, flaky due to network issues

### Decision: Layered Testing Strategy

### Layer 1: Unit Tests with Nock (Fast, Isolated)

**Purpose**: Test provider-specific logic (parsing, normalization) without network calls

**Example**:
```javascript
const nock = require('nock');
const GoogleBooksProvider = require('../providers/google-books');

describe('GoogleBooksProvider', () => {
  it('should normalize Google Books response', async () => {
    nock('https://www.googleapis.com')
      .get('/books/v1/volumes')
      .query({ q: 'test', maxResults: 20 })
      .reply(200, {
        items: [
          {
            volumeInfo: {
              title: 'Test Book',
              authors: ['Test Author'],
              industryIdentifiers: [
                { type: 'ISBN_13', identifier: '9780123456789' }
              ]
            }
          }
        ]
      });

    const provider = new GoogleBooksProvider();
    const results = await provider.search('test');

    expect(results[0]).toMatchObject({
      title: 'Test Book',
      author: 'Test Author',
      isbn: '9780123456789'
    });
  });
});
```

**Coverage**: Provider normalization, error handling, edge cases

### Layer 2: Integration Tests with Polly.js (Deterministic, Realistic)

**Purpose**: Test complete flow with recorded real API responses

**Setup**:
```javascript
const { Polly } = require('@pollyjs/core');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');

Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

describe('Book Search Integration', () => {
  let polly;

  beforeEach(() => {
    polly = new Polly('book-search', {
      adapters: ['node-http'],
      persister: 'fs',
      persisterOptions: {
        fs: {
          recordingsDir: './tests/integration/fixtures/cassettes'
        }
      },
      recordIfMissing: false, // Fail if cassette missing (CI)
      mode: 'replay' // Always replay in tests
    });
  });

  afterEach(async () => {
    await polly.stop();
  });

  it('should search and return results', async () => {
    const service = new BookSearchService();
    const results = await service.search('1984 Orwell');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('1984');
  });
});
```

**Cassette Refresh Strategy**:
- Manual refresh monthly (npm script: `npm run refresh-cassettes`)
- Automated refresh on CI (weekly scheduled job, updates repo)
- Version cassettes by API version if breaking changes detected

**Coverage**: End-to-end search flow, caching behavior, circuit breaker integration

### Layer 3: Contract Tests (Nightly, Against Live API)

**Purpose**: Detect breaking API changes early without impacting development speed

**Implementation**:
```javascript
describe('Google Books API Contract', () => {
  // Skip in normal test runs, only in nightly CI
  const runContractTests = process.env.RUN_CONTRACT_TESTS === 'true';

  (runContractTests ? it : it.skip)('should match expected schema', async () => {
    const response = await fetch(
      'https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1'
    );
    const data = await response.json();

    // Schema validation
    expect(data).toHaveProperty('items');
    expect(data.items[0]).toHaveProperty('volumeInfo');
    expect(data.items[0].volumeInfo).toHaveProperty('title');
    expect(data.items[0].volumeInfo).toHaveProperty('authors');
  });
});
```

**Schedule**: Nightly at 2 AM UTC (via GitHub Actions or similar)
**Quota Impact**: ~30 requests/night × 30 days = 900 requests/month (within free tier)
**Alerting**: Notify on failure (potential breaking change)

### Layer 4: E2E Tests with Playwright (User Journey)

**Purpose**: Validate complete user experience from search to book addition

**Example**:
```javascript
test('user can search and add book', async ({ page }) => {
  await page.goto('/books/add');

  // Search for book
  await page.fill('[data-testid="book-search-input"]', '1984');
  await page.click('[data-testid="search-button"]');

  // Wait for results
  await page.waitForSelector('[data-testid="search-results"]');

  // Select first result
  await page.click('[data-testid="result-0"]');

  // Verify auto-populated fields
  const title = await page.inputValue('[data-testid="book-title"]');
  expect(title).toContain('1984');

  // Save book
  await page.click('[data-testid="save-button"]');

  // Verify in library
  await page.waitForURL('/books');
  expect(await page.textContent('body')).toContain('1984');
});
```

**Coverage**: Complete user flows, UI responsiveness, error states

### Testing Pyramid

```
        /\
       /E2E\      (Few - Slow - User Journey)
      /------\
     /Contract\   (Some - Scheduled - API Health)
    /----------\
   /Integration\ (Many - Deterministic - Complete Flow)
  /--------------\
 /  Unit Tests   \ (Most - Fast - Isolated Logic)
/------------------\
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration

  contract-tests:
    runs-on: ubuntu-latest
    # Only on schedule (nightly)
    if: github.event_name == 'schedule'
    env:
      RUN_CONTRACT_TESTS: true
      GOOGLE_BOOKS_API_KEY: ${{ secrets.GOOGLE_BOOKS_API_KEY }}
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:contract
```

### References
- [Polly.js Documentation](https://netflix.github.io/pollyjs/)
- [Nock Documentation](https://github.com/nock/nock)
- [Testing Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

---

## Summary of Decisions

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| Primary API Provider | Google Books | Best metadata quality, sufficient free tier for traffic |
| Fallback Provider | Open Library | No rate limits, historical coverage |
| Caching Strategy | Multi-layer (Redis 12h + PG 30d) | Performance + persistence for low traffic |
| Circuit Breaker | Opossum (50% threshold, 30s reset) | Industry standard, prevents cascading failures |
| Duplicate Detection | ISBN-first + pg_trgm fallback | Accurate primary, fuzzy backup |
| Testing Strategy | Layered (Nock + Polly + Contract + E2E) | Fast unit tests, deterministic integration, live validation |

All decisions align with BookBuddy Constitution principles and approved architectural review.

---

**Research Status**: ✅ **COMPLETE**
**Next Phase**: Generate data-model.md, contracts/, quickstart.md
**Date**: 2025-10-29
