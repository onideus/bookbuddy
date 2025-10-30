# Feature Specification: Book Information Search

**Feature Branch**: `002-book-api-search`
**Created**: 2025-10-29
**Updated**: 2025-10-29 (Codex Review + Decisions Approved)
**Status**: Ready for Planning
**Input**: User description: "Create a new feature that hooks into a publically available api that contains information about books and uses it to search for the book based on the information that the user has provided when adding a new book to their library."

## ✅ Architectural Review Completed & Decisions Approved

**GPT-5 (Codex) architectural review identified 4 critical issues - ALL RESOLVED:**

1. **Data Model**: ✅ **APPROVED** - Per-user overrides architecture to prevent data leakage
2. **Rate Limiting**: ✅ **RESOLVED** - Free tier sufficient for <10 concurrent users; caching provides UX benefits
3. **Duplicate Detection**: ✅ **APPROVED** - ISBN-first strategy with fuzzy matching fallback
4. **Provenance Tracking**: ✅ **APPROVED** - Metadata sources table for audit and accuracy measurement

**Infrastructure**: Docker Compose for Redis orchestration
**API Tier**: Google Books free tier (1,000 req/day sufficient for expected traffic)
**Cache TTLs**: Redis 12h, PostgreSQL 30 days (optimized for low-traffic, long retention)
**Backfill**: Not required (database will be reset before production)

**See**: [CODEX_ARCHITECTURAL_REVIEW.md](./CODEX_ARCHITECTURAL_REVIEW.md) for full analysis and recommendations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Book Addition via Search (Priority: P1)

Users want to quickly add books to their library by searching with minimal information (title, author, or ISBN) rather than manually entering all book details. The system searches an external book database and presents matching results for the user to select.

**Why this priority**: This is the core MVP functionality that delivers immediate value by reducing data entry time and improving data accuracy. Without this, the feature has no value.

**Independent Test**: Can be fully tested by entering a book title/author/ISBN, receiving search results, selecting a book, and verifying it appears in the user's library with complete metadata populated.

**Acceptance Scenarios**:

1. **Given** a user is adding a new book to their library, **When** they enter a book title "The Great Gatsby" and initiate a search, **Then** the system displays a list of matching books with key information (title, author, publication year, cover image)
2. **Given** search results are displayed, **When** the user selects a specific book from the results, **Then** the system automatically populates all available book details (title, author, ISBN, publisher, publication date, page count, description, cover image) into the add book form
3. **Given** a user enters an ISBN "978-0-7475-3269-9", **When** they initiate a search, **Then** the system returns the exact matching book if found
4. **Given** a user enters partial author information "J.K. Row", **When** they initiate a search, **Then** the system returns books by authors matching that partial name

---

### User Story 2 - Search Refinement and Manual Override (Priority: P2)

Users need the ability to refine search results when too many matches are returned, and the option to manually edit or supplement auto-populated information if the external data is incomplete or incorrect.

**Why this priority**: Handles common edge cases where initial search returns too many results or external data needs correction, improving user experience and data quality.

**Independent Test**: Can be tested by performing a broad search (e.g., "Smith"), applying filters to narrow results, and manually editing auto-populated fields before saving.

**Acceptance Scenarios**:

1. **Given** a search returns more than 20 results, **When** the user applies additional filters (publication year range, author name), **Then** the result set is refined to show only matching books
2. **Given** a book has been selected from search results, **When** the user reviews the auto-populated information, **Then** they can edit any field before saving to their library
3. **Given** auto-populated information is incomplete, **When** the user manually fills in missing fields, **Then** the system saves both the auto-populated and manually-entered information

---

### User Story 3 - Handling No Results and Manual Entry (Priority: P3)

Users should have a clear path forward when their book search returns no results, allowing them to add the book manually with all necessary details.

**Why this priority**: Ensures the system doesn't become a blocker for adding obscure or very new books that might not be in the external database. This is a fallback scenario.

**Independent Test**: Can be tested by searching for a nonexistent book, receiving a "no results" message, and successfully adding the book through manual entry.

**Acceptance Scenarios**:

1. **Given** a user searches for a book that doesn't exist in the external database, **When** the search returns no results, **Then** the system displays a clear message and offers an option to add the book manually
2. **Given** a user chooses to add a book manually, **When** they fill in the required fields (title and author minimum), **Then** the book is successfully added to their library without external data
3. **Given** a manual entry is created, **When** the user later edits the book, **Then** they have the option to retry the external search to populate missing information

---

### Edge Cases

- What happens when the external book service is unavailable or returns an error?
- How does the system handle books with multiple editions (same title/author but different ISBN, publication dates)?
- What happens when a search returns identical titles by different authors?
- How does the system handle very long search result lists (100+ books)?
- What happens when external data contains special characters or non-Latin scripts?
- How does the system handle books with multiple authors or authors with similar names?
- What happens when a user's internet connection is slow or intermittent during search?
- **How does the system handle quota exhaustion (429 Too Many Requests errors)?** (Critical - Codex)
- **What happens when the caching layer (Redis) is unavailable?** (Codex)
- **How are user overrides preserved when book metadata is refreshed from the API?** (Critical - Codex)
- **How does duplicate detection handle ISBN-10 vs ISBN-13 variants of the same book?** (Codex)
- What happens when one user's manual edits to a book affect other users with the same book? (Critical - Codex)
- How does the system handle circuit breaker state transitions during active user sessions?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to initiate a book search using at least one of the following: book title, author name, or ISBN
- **FR-002**: System MUST query an external book information service when a search is initiated
- **FR-003**: System MUST display search results showing book title, author(s), publication year, and cover image (if available)
- **FR-004**: System MUST allow users to select a book from search results to auto-populate book details
- **FR-005**: System MUST auto-populate the following fields when available: title, author(s), ISBN, publisher, publication date, page count, description, and cover image URL
- **FR-006**: System MUST allow users to manually edit any auto-populated field before saving
- **FR-007**: System MUST provide a manual book entry option when search returns no results
- **FR-008**: System MUST limit initial search results display to a reasonable number (e.g., 20 books) with option to load more
- **FR-009**: System MUST provide clear feedback when the external book service is unavailable
- **FR-010**: System MUST handle search requests with minimum 2 characters to prevent excessive API calls
- **FR-011**: System MUST save both auto-populated and user-modified information to the user's library
- **FR-012**: System MUST allow users to retry external search for manually-entered books
- **FR-013**: System MUST handle timeout scenarios gracefully when external service responds slowly (timeout threshold: 2-3 seconds with fallback to cache or manual entry) *(Updated per Codex: 10s violates SC-002)*
- **FR-014**: System MUST define and implement cover image handling strategy (hot-link, proxy, or cache) with consideration for URL stability and licensing
- **FR-015**: System MUST isolate user-specific book metadata modifications from canonical book records to prevent cross-user data leakage *(Critical - Codex)*
- **FR-016**: System MUST implement data retention policies: raw API payloads (90 days), user overrides (tied to reading entry lifecycle), audit logs (1 year)
- **FR-017**: System MUST support internationalization including UTF-8 encoding, RTL layouts for Arabic/Hebrew, and multi-language search queries
- **FR-018**: System MUST implement multi-layer request caching (Redis L1: 6-hour TTL, PostgreSQL L2: 24-hour TTL) to meet performance targets within API rate limits *(Critical - Codex)*
- **FR-019**: System MUST deduplicate books using ISBN-first strategy, falling back to normalized (title + primary_author + publication_year) with fuzzy matching for books without ISBN *(Critical - Codex)*
- **FR-020**: System MUST track metadata provenance including provider name, fetch timestamp, request ID, ETag, and raw payload for audit, refresh, and accuracy measurement capabilities *(Critical - Codex)*
- **FR-021**: System MUST implement circuit breaker pattern to prevent cascading failures, with automatic fallback to cached results or manual entry when external API is degraded

### Key Entities *(include if feature involves data)*

**Core Entities**:
- **Book Search Query**: User input containing search terms (title, author, ISBN), used to query external service
- **Book Search Result**: Individual book record returned from external service, containing metadata such as title, author(s), ISBN, publisher, publication date, page count, description, and cover image URL
- **Book**: Canonical, immutable book metadata (work-level) including normalized title, primary author, language, publisher, publication date, page count, description, and categories; serves as shared reference for all users
- **Book Edition**: Specific edition/format of a book with unique ISBN-10/13, edition string, format (hardcover/paperback/ebook), cover image URL, and provider identifiers; one-to-many relationship with Book
- **User Book Entry**: Link between user's reading_entry and canonical Book, combining references to auto-populated external data with user-specific overrides

**Provenance & Caching** *(Codex recommendations)*:
- **Book Metadata Source**: Audit trail for external API data including provider name, fetch timestamp, request ID, ETag/hash, and raw JSON payload; enables accuracy measurement, data refresh, and compliance
- **Reading Entry Override**: Per-user field-level modifications to book metadata (e.g., user corrects page count or adds subtitle); preserves canonical data integrity while allowing personalization
- **Book Search Cache**: Cached search results with normalized query key, provider, result count, JSON results, and TTL; supports both Redis (L1) and PostgreSQL (L2) layers

### Quality, Testing, and UX Standards *(mandatory)*

- **QT-001**: Automated unit tests MUST target ≥90% statement coverage for search query construction, result parsing, and data mapping modules.
- **QT-002**: Contract tests MUST verify the integration with the external book service API, including successful queries, error responses, and timeout handling.
- **QT-003**: Integration tests MUST verify the complete flow from search initiation through result selection to book entry creation.
- **QT-004**: Document updates REQUIRED for user-facing search feature documentation, API integration configuration, and changelog entries.
- **QT-005**: UX validation MUST confirm search interface is accessible (keyboard navigation, screen reader compatible, WCAG 2.1 AA compliant) and provides clear loading states and error messages.
- **QT-006**: Performance tests MUST verify search response time meets user expectations (<3 seconds for typical queries).
- **QT-007**: Note any intentional technical debt (e.g., single API provider with no fallback), assign owner, and include planned remediation date (≤1 release cycle).

## Success Criteria *(mandatory)*

### Measurable Outcomes

**User Experience**:
- **SC-001**: Users can find and add a book to their library in under 30 seconds when the book exists in the external database
- **SC-002**: 90% of book searches return results within 3 seconds *(requires caching per FR-018)*
- **SC-003**: 85% of users successfully add a book using search results on their first attempt
- **SC-004**: Manual data entry time is reduced by 60% when using auto-populated information compared to fully manual entry
- **SC-006**: User satisfaction rating for book addition process increases to 4.5/5 or higher

**Performance & Reliability**:
- **SC-005**: Search feature handles at least 10 concurrent search requests without performance degradation *(revised for expected traffic)*
- **SC-008**: Cache hit rate exceeds 70% for repeat searches within TTL window *(Codex recommendation)*
- **SC-009**: Circuit breaker successfully prevents cascading failures with false positive rate <1% *(Codex recommendation)*

**Data Quality**:
- **SC-007**: 95% of auto-populated book information is accurate and requires no user correction *(requires provenance tracking per FR-020)*
- **SC-010**: Duplicate detection accuracy exceeds 95% when measured against curated test set of edge cases *(Codex recommendation)*

## Architectural Decisions *(from Codex review)*

### API Provider Strategy

**Primary Provider**: Google Books API
- **Rationale**: Richest metadata, strong ISBN coverage, multilingual support, predictable SLA
- **Rate Limits**: 1,000 requests/day free tier, then $0.50/1,000 requests
- **Cost Projection**: $0/month - Free tier sufficient for <10 concurrent users (~100 searches/day = 3,000/month well within limits)

**Fallback Provider**: Open Library API
- **Usage**: Non-blocking fallback for rate-limit scenarios and cache misses
- **Rationale**: No rate limits, comprehensive historical coverage, fills gaps for older editions
- **Trade-off**: Less reliable uptime, slower response times

**Architecture Pattern**: Provider-agnostic abstraction layer
- Define interface: `query() + normalize() + hydrate()`
- Allow future providers (ISBN DB, national catalogs) without rewiring
- Persist provider identification and quota counters

### Data Model Architecture

**Decision**: Separate canonical books from user-specific overrides

**Rationale** (addresses critical issue #1):
- Current shared `books` table causes data leakage when users edit metadata
- One user's corrections would overwrite canonical data for all users
- No way to track which data is authoritative vs. user opinion

**Implementation**:
- `books` table: Immutable canonical work-level metadata
- `book_editions` table: Edition-specific data (ISBN, format, cover)
- `reading_entries_overrides` table: Per-user field modifications
- `book_metadata_sources` table: Provenance tracking (provider, timestamp, raw payload)

**Migration Path**: See CODEX_ARCHITECTURAL_REVIEW.md for detailed schema

### Caching Strategy

**Decision**: Multi-layer caching (Redis L1 + PostgreSQL L2)

**Rationale**:
- Expected traffic: <10 concurrent users, ~100 searches/day
- Free-tier rate limits (1,000/day) are sufficient even without caching
- Caching provides UX benefits: faster response times, reduced API dependency
- Long TTLs appropriate for low-traffic scenario with stable book metadata

**Implementation**:
- **Redis (L1)**: 12-hour TTL, fast access, stampede protection, Docker Compose orchestrated
- **PostgreSQL (L2)**: 30-day TTL, survives restarts, shared across instances, long retention for stable metadata
- **HTTP Cache**: Respect ETags, send If-None-Match on refresh

### Resilience Patterns

**Decision**: Implement circuit breaker + tight timeouts + retry logic

**Priority Order**:
1. **Timeout reduction**: 2-3 seconds (not 10s) with graceful degradation
2. **Circuit breaker**: Open on 5 failures/60s, fallback to cache or manual entry
3. **Retry logic**: Exponential backoff, max 2 retries for idempotent GETs
4. **Request throttling**: 10 searches/minute per user, global queue for spikes

**Rationale**: 10-second timeout violates SC-002 (90% under 3 seconds)

## Assumptions

1. **Traffic Volume**: Maximum 10 concurrent users, ~100 searches/day, 3,000 searches/month
2. **API Access**: Google Books API free tier (1,000 req/day) is sufficient for expected traffic
3. **Infrastructure**: Redis orchestrated via Docker Compose, PostgreSQL already available
4. **User Behavior**: Assume 50% of searches are repeat queries (enables 70% cache hit rate)
5. **Book Coverage**: Assume 90% of user searches will find results in Google Books or Open Library
6. **Data Quality**: Assume external APIs provide accurate data 95%+ of the time
7. **Database Resets**: Database will be wiped multiple times before production; no backfill strategy needed
8. **Internationalization**: MVP focuses on Latin scripts; RTL and CJK support in Phase 2
9. **Cover Images**: MVP uses hot-linking; image proxying/caching deferred to Phase 2

## Dependencies

**External Services**:
- Google Books API (critical path)
- Open Library API (fallback)

**Infrastructure**:
- Redis for L1 caching (orchestrated via Docker Compose, provides UX benefits)
- Docker Compose configuration for Redis service
- PostgreSQL extensions: `pg_trgm` for fuzzy matching (duplicate detection)

**Libraries/Frameworks**:
- HTTP client with timeout/retry support (`axios` or `got`)
- Circuit breaker library (`opossum`)
- Redis client (`ioredis`)
- Fuzzy string matching (`fuzzball` or `string-similarity`)

## Risks & Mitigation

| Risk | Severity | Likelihood | Mitigation | Status |
|------|----------|------------|------------|--------|
| Data leakage from shared books table | **Critical** | High | Implement per-user overrides (FR-015) | ✅ **APPROVED** |
| Rate limit exhaustion | **Low** | Very Low | Free tier sufficient for <10 users; caching provides UX benefits | ✅ **RESOLVED** |
| Duplicate books allowed | **High** | Medium | ISBN-first detection + fuzzy matching (FR-019) | ✅ **APPROVED** |
| No provenance for accuracy audit | **High** | Low | Metadata sources table (FR-020) | ✅ **APPROVED** |
| 10s timeout violates SC-002 | **High** | High | Reduce to 2-3s + circuit breaker (FR-013, FR-021) | ✅ **APPROVED** |
| Cover image URLs break over time | **Medium** | Medium | Hot-linking for MVP, proxy in Phase 2 (FR-014) | ✅ **APPROVED** |
| GDPR non-compliance | **Medium** | Low | Define retention policies (FR-016) | ✅ **APPROVED** |
| Provider API breaking changes | **Medium** | Low | Contract tests + provider abstraction | Monitoring required |
| Insufficient i18n for RTL languages | **Low** | Low | UTF-8 + RTL CSS (FR-017), comprehensive in Phase 2 | Phase 2 |
| Redis unavailability | **Low** | Low | Graceful degradation to PostgreSQL L2 cache, then API | Circuit breaker |

## Implementation Phases

**Phase 1 - MVP** (addresses critical issues):
- Google Books integration with provider abstraction
- Redis + PostgreSQL caching
- Per-user overrides (prevent data leakage)
- Circuit breaker + 2-3s timeouts
- ISBN-based duplicate detection
- Provenance tracking (metadata_sources table)

**Phase 2 - Enhancements**:
- Open Library fallback integration
- Advanced fuzzy duplicate detection
- Cover image proxy/cache
- Admin tools for metadata management
- Enhanced i18n (RTL, CJK)

**Phase 3 - Optimization**:
- Additional API providers
- Machine learning for duplicate detection
- Advanced caching strategies
- Performance optimizations
