# Codex (GPT-5) Architectural Review
## Book Information Search Feature

**Review Date**: 2025-10-29
**Model**: GPT-5 (OpenAI Codex)
**Session ID**: 019a3258-bb65-74f2-b575-ccd3e73a37a8

---

## Executive Summary

Codex identified **4 critical architectural issues** that would prevent the feature from meeting its success criteria without significant rework. The review also provided detailed recommendations across 8 key areas: API provider strategy, data model design, caching, resilience patterns, missing requirements, testing approach, monitoring, and next steps.

### Severity Rating: **HIGH**
- 2 showstopper issues (data model, rate limiting)
- 2 high-priority issues (duplicate detection, provenance tracking)
- Multiple missing requirements that impact GDPR compliance and operational readiness

---

## Critical Issues (Must Fix Before Implementation)

### 1. Data Model: Shared Books Table Causes Data Leakage ⚠️ SHOWSTOPPER

**Problem**: The current `books` table (`backend/migrations/001_create_tables.sql:10`) is shared across all users. When one user makes manual edits to auto-populated data (FR-006), those changes mutate the canonical record and leak to all other users who have the same book.

**Impact**:
- User A imports "The Great Gatsby" with auto-populated metadata
- User B adds manual notes or corrections to the same book
- User A's data is now corrupted with User B's changes
- Violates data isolation and user expectations

**Recommendation**:
- Keep `books` table as immutable canonical data
- Create `reading_entries_overrides` table (FK to `reading_entries`) for per-user field modifications
- Hydrate UI by overlaying user overrides atop canonical data
- Referenced in: `backend/src/models/book.js:15`

**Specification Update Required**: Add new functional requirements for per-user data isolation

---

### 2. Rate Limiting: Free Tier Cannot Meet SC-005 ⚠️ SHOWSTOPPER

**Problem**: Success Criterion SC-005 requires handling "100+ concurrent search requests" but free tier APIs have severe limits:
- Google Books API: 1,000 requests/day free tier
- With 100 concurrent users, quota exhausted in ~10 searches total
- No mitigation strategy specified (throttling, caching, quota monitoring)

**Impact**:
- Feature will fail immediately under realistic load
- 429 (Too Many Requests) errors with no fallback
- User experience degrades rapidly
- Cannot meet SC-002 (90% of searches within 3 seconds)

**Recommendation**:
- Implement Redis-backed query cache (6-hour TTL) for recent searches
- Add request throttling and coalescing (multiple users searching same term)
- Budget for paid API tier or implement multi-provider fallback
- Monitor quota usage in real-time with alerts at 70%/90% thresholds

**Specification Update Required**: Add caching requirements, rate limiting strategy, and cost considerations

---

### 3. Duplicate Detection: Current Strategy Insufficient

**Problem**: The current unique constraint (`backend/migrations/001_create_tables.sql:27`) uses `(title, author, edition)` which fails for:
- Multi-author books (order matters, partial matches)
- Books without editions
- ISBN variants (ISBN-10 vs ISBN-13)
- Same title by different authors

**Impact**:
- Users can add duplicate books unintentionally
- Poor data quality
- Confusing UX (multiple entries for same book)
- Cannot meet SC-007 (95% accurate auto-population)

**Recommendation**:
- Prefer ISBN-based deduplication (most accurate)
- Fall back to normalized (title + primary_author + publication_year) with trigram similarity
- Introduce `book_editions` table with unique ISBN constraint
- Implement fuzzy matching for title+author combinations
- Store provider-specific IDs for cross-reference

**Specification Update Required**: Add duplicate detection requirements with priority hierarchy

---

### 4. Provenance Tracking: No Audit Trail for Accuracy

**Problem**: Specification requires 95% accuracy (SC-007) but provides no mechanism to:
- Track which fields came from API vs. manual entry
- Audit data quality over time
- Refresh stale metadata
- Comply with QT-007 (document technical debt)

**Impact**:
- Cannot measure SC-007 objectively
- No way to refresh outdated book information
- Cannot debug accuracy issues
- Regulatory/compliance risk (GDPR data source tracking)

**Recommendation**:
- Create `book_metadata_sources` table capturing:
  - `book_edition_id` (FK)
  - Provider name (google_books, open_library, etc.)
  - `fetched_at` timestamp
  - `etag/hash` for change detection
  - JSONB `raw_payload` for forensics
- Track field-level provenance in overrides table
- Implement "refresh metadata" user action

**Specification Update Required**: Add provenance tracking requirements and data retention policies

---

## Detailed Recommendations

### API Provider Strategy

**Primary Provider**: Google Books API
- **Why**: Richest metadata, strong ISBN coverage, multilingual support
- **SLA**: Predictable, low latency
- **Cost**: Free tier 1,000 requests/day, then $0.50/1,000 requests
- **Pros**: Best overall data quality, well-documented, stable
- **Cons**: Rate limits on free tier

**Fallback Provider**: Open Library API
- **Why**: No rate limits, open data, fills gaps for older editions
- **Usage**: Non-blocking fallback for cache misses and rate-limit scenarios
- **Pros**: Free, comprehensive historical coverage
- **Cons**: Less reliable uptime, slower response times

**Architecture**: Provider-agnostic abstraction
- Define interface: `query() + normalize() + hydrate()`
- Allow future providers (ISBN DB, national catalogues) without rewiring
- Persist provider identification and quota counters
- Log provider performance metrics for decision-making

**Implementation Priority**:
1. Google Books integration (P1)
2. Provider abstraction layer (P1)
3. Open Library fallback (P2)
4. Additional providers as needed (P3)

---

### Data Model Design

**Recommended Schema**:

```sql
-- Canonical book metadata (immutable)
CREATE TABLE books (
  id UUID PRIMARY KEY,
  normalized_title VARCHAR(500) NOT NULL, -- For fuzzy matching
  primary_author VARCHAR(200) NOT NULL,
  subtitle VARCHAR(500),
  language VARCHAR(10), -- ISO 639-1
  publisher VARCHAR(200),
  publication_date DATE,
  page_count INTEGER,
  description TEXT,
  categories TEXT[], -- Genre tags
  fingerprint VARCHAR(64), -- For deduplication
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book editions (one-to-many from books)
CREATE TABLE book_editions (
  id UUID PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  isbn_10 VARCHAR(10),
  isbn_13 VARCHAR(13),
  edition VARCHAR(100),
  format VARCHAR(50), -- hardcover, paperback, ebook
  cover_image_url TEXT,
  provider_id VARCHAR(100), -- External API identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(isbn_13), -- Prevent duplicate ISBNs
  UNIQUE(isbn_10)
);

-- External API metadata provenance
CREATE TABLE book_metadata_sources (
  id UUID PRIMARY KEY,
  book_edition_id UUID REFERENCES book_editions(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google_books', 'open_library'
  provider_request_id VARCHAR(200), -- For API support debugging
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  etag VARCHAR(100), -- For cache invalidation
  payload_hash VARCHAR(64), -- Detect changes
  raw_payload JSONB, -- Full API response for forensics
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user field overrides (replaces direct book mutations)
CREATE TABLE reading_entries_overrides (
  id UUID PRIMARY KEY,
  reading_entry_id UUID REFERENCES reading_entries(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL, -- 'title', 'author', 'page_count', etc.
  override_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reading_entry_id, field_name)
);

-- Search cache (PostgreSQL-backed, survives restarts)
CREATE TABLE book_search_cache (
  id UUID PRIMARY KEY,
  search_key VARCHAR(200) NOT NULL, -- Normalized search params
  provider VARCHAR(50) NOT NULL,
  result_count INTEGER NOT NULL,
  results JSONB NOT NULL, -- Cached search results
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(search_key, provider)
);
CREATE INDEX idx_search_cache_expiry ON book_search_cache(expires_at);
```

**Migration Path**:
1. Add new tables in migration 003
2. Backfill existing books data
3. Update Book model to use new schema
4. Deploy with feature flag
5. Deprecate old mutation logic

---

### Caching Strategy

**Multi-Layer Caching**:

1. **Redis Query Cache** (L1):
   - Key: Normalized search params `sha256(provider:query:filters)`
   - TTL: 6 hours
   - Stampede protection: Lock key during fetch
   - Metrics: Hit rate, eviction count
   - **Purpose**: Meet SC-002 (90% under 3 seconds)

2. **PostgreSQL Search Cache** (L2):
   - Table: `book_search_cache` (see schema above)
   - TTL: 24 hours (longer than Redis)
   - **Purpose**: Survive process restarts, share across instances
   - Background job: Clean expired entries daily

3. **HTTP Cache Headers** (L3):
   - Respect `ETag`, `Cache-Control` from providers
   - Store ETags in `book_metadata_sources.etag`
   - Send `If-None-Match` on refresh requests
   - **Purpose**: Minimize bandwidth, detect changes

**Cache Invalidation**:
- User-triggered: "Refresh metadata" button (bypass cache)
- Time-based: Automatic expiration via TTL
- Provider-signaled: ETag mismatch triggers update
- Manual: Admin tool to flush specific entries

**Stampede Protection**:
```javascript
async function searchWithCache(query) {
  const key = `search:${hash(query)}`;
  const lockKey = `${key}:lock`;

  // Check L1 (Redis)
  let result = await redis.get(key);
  if (result) return JSON.parse(result);

  // Acquire lock
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  if (!acquired) {
    // Another request is fetching, wait and retry
    await sleep(100);
    return searchWithCache(query);
  }

  try {
    // Check L2 (PostgreSQL)
    result = await checkPostgreSQLCache(query);
    if (result) {
      await redis.set(key, JSON.stringify(result), 'EX', 21600);
      return result;
    }

    // Fetch from provider
    result = await fetchFromProvider(query);

    // Store in both caches
    await Promise.all([
      redis.set(key, JSON.stringify(result), 'EX', 21600),
      saveToPostgreSQLCache(query, result, 86400)
    ]);

    return result;
  } finally {
    await redis.del(lockKey);
  }
}
```

---

### Resilience Patterns (Priority Order)

1. **Timeout Reduction** (P0 - Critical):
   - **Current**: 10 seconds (FR-013)
   - **Recommended**: 2-3 seconds with graceful degradation
   - **Rationale**: 10s timeout violates SC-002 (3s response time)
   - **Fallback**: Cached results or manual entry flow

2. **Circuit Breaker** (P1 - High):
   - **Pattern**: Open on sustained 5xx/429 bursts (5 failures in 60s window)
   - **Half-open**: Test with single request after 30s
   - **Fallback**: Cached data → manual entry → error message
   - **UI**: Surface status ("Search temporarily offline, use manual entry")
   - **Library**: Use `opossum` or similar

3. **Retry Logic with Exponential Backoff** (P1 - High):
   - **Strategy**: Retry idempotent GETs only
   - **Max attempts**: 2 retries (total 3 attempts)
   - **Backoff**: 100ms, 200ms
   - **Jitter**: ±25% to prevent thundering herd
   - **Correlation IDs**: Log for observability

4. **Request Throttling** (P2 - Medium):
   - **Server-side**: Rate limit per user (10 searches/minute)
   - **Global**: Queue requests during high load
   - **Coalescing**: Dedupe identical in-flight queries
   - **Quota management**: Track daily/hourly limits per provider

5. **Fallback UX** (P2 - Medium):
   - **Explicit messaging**: "Search unavailable, add manually"
   - **Preserve user input**: Pre-fill manual form with search terms
   - **Retry option**: Allow manual retry when circuit reopens
   - **Maintain SC-003**: 85% first-attempt success via fallbacks

---

### Missing Requirements

1. **Cover Image Policy** (P1):
   - **Decision needed**: Proxy, cache, or hot-link?
   - **Hot-linking**: Simple but URLs break, no control
   - **Caching**: Better UX but storage costs, licensing concerns
   - **Proxy**: Best UX, adds complexity (resize, CDN)
   - **Recommendation**: Start with hot-linking, migrate to proxy later
   - **Add to spec**: FR-014 for image handling strategy

2. **Access Control & Data Scoping** (P1):
   - **Issue**: Current `books` table is globally shared
   - **Decision needed**: Is book metadata tenant-scoped or global?
   - **Options**:
     - Global books + per-user overrides (recommended)
     - Per-tenant books (data duplication, higher accuracy)
   - **Add to spec**: FR-015 for data access boundaries

3. **GDPR & Data Retention** (P1):
   - **Missing**: Retention periods for raw API payloads
   - **Missing**: User data deletion workflow (right to erasure)
   - **Missing**: Data export capability (right to portability)
   - **Recommendation**:
     - Raw payloads: 90 days retention
     - User overrides: Tied to reading entry lifecycle
     - Audit logs: 1 year retention
   - **Add to spec**: FR-016 for data retention and privacy

4. **Admin Tooling** (P2):
   - **Missing**: Re-sync metadata for all users
   - **Missing**: Purge bad/spam book entries
   - **Missing**: Inspect provider payload diffs
   - **Missing**: Manage blocked editions
   - **Recommendation**: Build admin dashboard in phase 2
   - **Add to spec**: Future enhancement section

5. **Internationalization Specifics** (P2):
   - **Missing**: RTL layout support (Arabic, Hebrew)
   - **Missing**: Mixed-language search tokens
   - **Missing**: Localized metadata fields
   - **Edge case**: Right-to-left text already mentioned but not specified
   - **Recommendation**: UTF-8 everywhere, RTL CSS, language detection
   - **Add to spec**: FR-017 for i18n requirements

6. **Operational Playbooks** (P2):
   - **Missing**: Quota exhaustion response procedure
   - **Missing**: API key rotation process
   - **Missing**: Manual failover to alternate providers
   - **Missing**: Incident response for provider outages
   - **Recommendation**: Document as part of operational runbook
   - **Add to spec**: Operations and maintenance section

---

### Testing Approach

1. **Unit Tests** (Coverage ≥90%):
   - Normalization logic (title/author sanitization)
   - Provider response parsing (Google Books, Open Library)
   - Duplicate detection algorithms
   - Cache key generation
   - Fixtures: Multilingual data, multi-author books

2. **Integration Tests with VCR/Polly**:
   - **Library**: `polly-js` or `nock` for HTTP recording
   - **Strategy**: Record real API responses, replay in tests
   - **Refresh**: Update cassettes weekly to detect schema drift
   - **Pros**: Deterministic, fast, no quota usage
   - **Cons**: Can become outdated

3. **Contract Tests** (Nightly):
   - **Purpose**: Detect breaking API changes early
   - **Strategy**: Run against live API with quota guardrails
   - **Schedule**: Nightly at 2 AM UTC
   - **Alerts**: Notify on schema changes or failures
   - **Cost**: ~30 requests/night = negligible

4. **End-to-End Tests** (Critical Paths):
   - **Framework**: Playwright or Cypress
   - **Scenarios**:
     - Search → select → save (happy path)
     - Search → no results → manual entry
     - Search → select → edit fields → save
     - Cache hit path (no API call)
     - Circuit breaker open path (manual entry fallback)
   - **Frequency**: On every PR

5. **Load Tests** (Performance Validation):
   - **Tool**: k6 or Artillery
   - **Scenarios**:
     - 100 concurrent users (SC-005)
     - Search same term simultaneously (coalescing)
     - Rate limit enforcement (429 handling)
   - **Metrics**: p95 latency, cache hit rate, error rate
   - **Frequency**: Weekly or before releases

6. **Duplicate Detection Tests** (Data Quality):
   - **Fixtures**: Curated list of edge cases
     - Shared titles (1984, Foundation)
     - Missing ISBNs
     - Multi-author variations
     - ISBN-10/13 pairs
   - **Assertions**: Verify correct deduplication behavior
   - **Regression**: Lock fixtures to prevent backsliding

---

### Monitoring Plan

**1. Provider Health Metrics** (Critical):
- `api.provider.latency{provider, p50/p95/p99}`: Response time percentiles
- `api.provider.errors{provider, status_code}`: Count of 4xx/5xx errors
- `api.provider.timeouts{provider}`: Request timeout count
- `api.provider.retries{provider}`: Retry attempt count
- **Alert**: p95 > 2.5s OR timeout rate > 5% OR error rate > 1%

**2. Quota Management** (Critical):
- `api.provider.quota_used{provider}`: Current quota consumption
- `api.provider.quota_limit{provider}`: Daily/hourly limit
- `api.provider.quota_remaining{provider}`: Remaining requests
- **Alert**: remaining < 30% OR < 20% OR exhausted

**3. Cache Performance** (High Priority):
- `cache.hit_ratio{layer}`: L1 (Redis) and L2 (PostgreSQL) hit rates
- `cache.evictions{layer}`: Eviction count per layer
- `cache.size{layer}`: Current cache size/memory usage
- `cache.stampede_locks{layer}`: Lock contention count
- **Alert**: hit_ratio < 70% OR evictions spike > 2σ

**4. Circuit Breaker State** (High Priority):
- `circuit_breaker.state{provider}`: open/closed/half_open
- `circuit_breaker.transitions{provider, from, to}`: State change count
- `circuit_breaker.rejected_requests{provider}`: Blocked request count
- **Alert**: state=open for > 5 minutes

**5. User Journey Metrics** (Medium Priority):
- `search.initiated{user}`: Search requests started
- `search.results_returned{user, result_count}`: Successful searches
- `search.no_results{user}`: Zero-result searches
- `search.result_selected{user}`: Book selection from results
- `search.manual_override{user, field}`: User edits auto-populated field
- `search.manual_entry{user}`: Fallback to full manual entry
- `search.failures{user, reason}`: Failed search attempts
- **Metrics**: Conversion funnel, drop-off analysis

**6. Data Quality Metrics** (SC-007 Validation):
- `metadata.accuracy{provider, field}`: Override rate per field per provider
- `metadata.completeness{provider}`: % of fields populated
- `metadata.staleness{provider}`: Age of cached metadata
- **Weekly Report**: Which fields/providers have highest override rates

**7. Synthetic Monitoring** (Proactive):
- **Frequency**: Hourly synthetic searches
- **Queries**: Mix of ISBN, title, and author searches
- **Assertions**: Response time, result quality, API availability
- **Alert**: 2 consecutive failures

---

## Specification Updates Required

### New Functional Requirements to Add:

- **FR-014**: System MUST define cover image handling strategy (hot-link vs. proxy vs. cache)
- **FR-015**: System MUST isolate user-specific book metadata modifications from canonical book records
- **FR-016**: System MUST implement data retention policies: raw API payloads (90 days), user overrides (tied to reading entry lifecycle)
- **FR-017**: System MUST support internationalization including UTF-8 encoding, RTL layouts, and multi-language search
- **FR-018**: System MUST implement request caching with 6-hour TTL to meet performance targets within rate limits
- **FR-019**: System MUST deduplicate books using ISBN-first strategy, falling back to normalized title+author+year with fuzzy matching
- **FR-020**: System MUST track metadata provenance (provider, fetch time, raw payload) for audit and refresh capabilities
- **FR-021**: System MUST implement circuit breaker pattern with 2-3 second timeouts (not 10 seconds)

### Modified Requirements:

- **FR-013** (Timeout): Change from 10 seconds to 2-3 seconds with graceful degradation
- **SC-002**: Clarify that caching is essential to meet this criterion within free-tier quotas

### New Edge Cases to Add:

- How does the system handle quota exhaustion (429 errors)?
- What happens when Redis cache is unavailable?
- How are user overrides preserved when book metadata is refreshed?
- How does duplicate detection handle ISBN-10 vs ISBN-13 variants?

### New Success Criteria:

- **SC-008**: Cache hit rate exceeds 70% for repeat searches
- **SC-009**: Circuit breaker successfully prevents cascading failures with <1% false positives
- **SC-010**: Duplicate detection accuracy exceeds 95% (measured against curated test set)

---

## Next Steps (Codex Recommendations)

1. **Prototype Provider Abstraction** (Week 1):
   - Create design document for provider interface
   - Define normalization mappings (Google Books → internal schema)
   - Spike Open Library fallback integration
   - **Deliverable**: Technical design doc + proof-of-concept code

2. **Data Model Migration Plan** (Week 1-2):
   - Design migration 003 for new tables
   - Plan backfill strategy for existing books
   - Update Book model to support overrides
   - **Deliverable**: Migration SQL + rollback plan

3. **Spike Redis Caching + Circuit Breaker** (Week 2):
   - Integrate `ioredis` and `opossum` libraries
   - Implement cache stampede protection
   - Validate latency targets with load tests
   - **Deliverable**: Performance test results + recommendation

4. **Define Acceptance Criteria** (Week 2):
   - Cover image handling policy decision
   - Internationalization scope and priorities
   - GDPR compliance requirements
   - **Deliverable**: Updated specification with clarifications

5. **Update Project Estimates** (Week 3):
   - Re-estimate implementation timeline with new requirements
   - Identify technical debt and mitigation strategies
   - Define MVP vs. full feature scope
   - **Deliverable**: Revised project plan

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Data leakage from shared books table | **Critical** | High (100% if not fixed) | Implement per-user overrides table (FR-015) |
| Rate limit exhaustion fails SC-005 | **Critical** | High (80% probability) | Multi-layer caching + throttling + paid tier budget |
| Duplicate detection allows duplicates | **High** | Medium (40% for edge cases) | ISBN-first strategy + fuzzy matching (FR-019) |
| No metadata provenance for accuracy audit | **High** | Low (needed for SC-007 validation) | Implement metadata_sources table (FR-020) |
| 10s timeout violates SC-002 (3s target) | **High** | High (50% based on typical API latency) | Reduce to 2-3s + cache + circuit breaker |
| Cover image URLs break over time | **Medium** | Medium (30% annual breakage rate) | Decide on proxy/cache strategy (FR-014) |
| GDPR non-compliance for raw payloads | **Medium** | Low (if EU users present) | Define retention policies (FR-016) |
| Provider API changes break integration | **Medium** | Low (15% annual rate) | Contract tests + provider abstraction |
| Internationalization gaps for RTL languages | **Low** | Low (depends on user base) | UTF-8 + RTL CSS + language detection (FR-017) |

---

## Summary

This architectural review identified **critical showstoppers** that require addressing before implementation:

1. **Data model redesign** to prevent user data leakage
2. **Caching strategy** to operate within rate limits
3. **Duplicate detection** improvements for data quality
4. **Provenance tracking** for accuracy measurement

Codex recommends a **phased approach**:
- **Phase 1 (MVP)**: Google Books + Redis caching + basic overrides + circuit breaker
- **Phase 2**: Open Library fallback + advanced duplicate detection + admin tools
- **Phase 3**: Additional providers + image caching + i18n enhancements

**Estimated complexity increase**: 40% over initial specification due to:
- New tables and migrations
- Caching infrastructure
- Resilience patterns
- Observability requirements

**Recommendation**: Proceed with updated specification and prototype key components (provider abstraction, caching, data model) before full implementation commit.
