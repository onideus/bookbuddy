# Tasks: Book Information Search

**Feature**: 002-book-api-search | **Branch**: `002-book-api-search`
**Input**: Design documents from `/specs/002-book-api-search/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: This feature follows TDD approach with ≥90% coverage target (QT-001). Tests are written first, verified to fail (red), then implementation makes them pass (green), followed by refactoring.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story in priority order (P1 → P2 → P3).

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with backend API + frontend UI:
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`
- Infrastructure: `docker-compose.yml`, `backend/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Docker services, and database foundation

- [ ] T001 Add Redis service to docker-compose.yml with image redis:7-alpine, ports 6379:6379, container_name bookbuddy-redis
- [ ] T002 [P] Install backend dependencies: ioredis, opossum, axios, fuzzball in backend/package.json
- [ ] T003 [P] Install backend test dependencies: @pollyjs/core, @pollyjs/adapter-node-http, nock, vitest in backend/package.json
- [ ] T004 Create backend/migrations/003_book_search_tables.sql with schema from data-model.md
- [ ] T005 Create backend/migrations/rollback/003_book_search_tables_down.sql with DROP TABLE statements
- [ ] T006 Run migration 003 to create book_editions, book_metadata_sources, reading_entry_overrides, book_search_cache tables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create backend/src/services/redis-client.js with ioredis connection management, reconnection strategy, error handling
- [ ] T008 [P] Create backend/src/models/book-edition.js with schema from data-model.md (id, book_id, isbn_10, isbn_13, edition, format, cover_image_url, provider_id)
- [ ] T009 [P] Create backend/src/models/book-metadata-source.js with schema from data-model.md (id, book_edition_id, provider, fetched_at, request_id, etag, raw_payload)
- [ ] T010 [P] Create backend/src/models/reading-entry-override.js with schema from data-model.md (id, reading_entry_id, field_name, override_value)
- [ ] T011 [P] Create backend/src/models/book-search-cache.js with schema from data-model.md (id, search_key, provider, result_count, results, expires_at)
- [ ] T012 Extend backend/src/models/book.js with new fields: normalized_title, primary_author, subtitle, language, publisher, publication_date, page_count, description, categories, fingerprint
- [ ] T013 Create backend/src/services/book-search/providers/base-provider.js with abstract interface (search, normalize, hydrate methods)
- [ ] T014 Create backend/src/services/book-search/normalizer.js with response transformation from provider format to internal BookSearchResult format
- [ ] T015 [P] Create backend/tests/unit/services/book-search/normalizer.test.js with tests for Google Books and Open Library format normalization
- [ ] T016 Create backend/src/lib/metrics.js extensions for search metrics: provider_latency_ms, cache_hit_rate, circuit_breaker_state, duplicate_detection_accuracy

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Book Addition via Search (Priority: P1) 🎯 MVP

**Goal**: Users can search for books by title/author/ISBN and auto-populate metadata, reducing manual entry time by 60% (SC-004)

**Independent Test**: Enter "1984 George Orwell" in search, receive results within 3s (SC-002), select first result, verify all metadata fields (title, author, ISBN, publisher, publication date, page count, description, cover image) are populated

### Tests for User Story 1 (TDD: Write FIRST, verify FAIL)

- [ ] T017 [P] [US1] Create backend/tests/unit/services/book-search/providers/google-books.test.js with tests for search(), normalize(), hydrate() using nock for HTTP mocking
- [ ] T018 [P] [US1] Create backend/tests/unit/services/book-search/cache-manager.test.js with tests for Redis L1 (12h TTL), PostgreSQL L2 (30d TTL), stampede protection
- [ ] T019 [P] [US1] Create backend/tests/unit/services/book-search/circuit-breaker.test.js with tests for timeout (2.5s), error threshold (50%), reset timeout (30s), fallback behavior
- [ ] T020 [P] [US1] Create backend/tests/integration/book-search-flow.test.js with Polly.js cassettes for search → select → save flow
- [ ] T021 [P] [US1] Create backend/tests/contract/google-books-api.test.js for nightly validation (skip by default with RUN_CONTRACT_TESTS env var)

### Implementation for User Story 1

- [ ] T022 [P] [US1] Create backend/src/services/book-search/providers/google-books.js implementing BaseProvider with query construction, pagination, error handling per research.md
- [ ] T023 [US1] Create backend/src/services/book-search/cache-manager.js with Redis L1 (ioredis client, 12h TTL), PostgreSQL L2 (book_search_cache model, 30d TTL), stampede protection
- [ ] T024 [US1] Create backend/src/services/book-search/circuit-breaker.js wrapping opossum with config from research.md (2500ms timeout, 50% error threshold, 30s reset)
- [ ] T025 [US1] Create backend/src/services/book-search/index.js orchestrating provider, cache, circuit breaker with search(query, type, options) method
- [ ] T026 [US1] Create backend/src/api/routes/book-search.js with GET /api/books/search endpoint per contracts/book-search-api.yaml (query params: q, type, limit, offset, provider)
- [ ] T027 [US1] Create backend/src/api/routes/book-search.js POST /api/books/from-search endpoint to create Book, BookEdition, BookMetadataSource, ReadingEntry from search result
- [ ] T028 [US1] Add validation in backend/src/api/routes/book-search.js: min 2 chars for query (FR-010), rate limiting 10 searches/min per user
- [ ] T029 [US1] Add structured logging in backend/src/services/book-search/index.js for search queries, API calls, cache hits/misses, circuit breaker state
- [ ] T030 [US1] Create frontend/src/services/bookSearchApi.js with axios client for GET /api/books/search and POST /api/books/from-search
- [ ] T031 [US1] Create frontend/src/hooks/useBookSearch.js with React hook managing search state (query, results, loading, error, cacheHit)
- [ ] T032 [P] [US1] Create frontend/src/components/BookSearch/SearchInput.jsx with form, validation, debounce (300ms), keyboard accessibility
- [ ] T033 [P] [US1] Create frontend/src/components/BookSearch/SearchResults.jsx displaying results list with pagination, loading states, error messages
- [ ] T034 [P] [US1] Create frontend/src/components/BookSearch/BookResultCard.jsx showing title, author, year, cover image, select button
- [ ] T035 [US1] Integrate BookSearch components into existing frontend/src/components/BookForm/AddBookForm component with search → select → populate flow
- [ ] T036 [US1] Add error handling in frontend for API unavailable (FR-009), timeout (FR-013), empty results scenarios with actionable messages
- [ ] T037 [US1] Create frontend/tests/components/BookSearch.test.jsx with React Testing Library for search input, results display, selection flow

**Checkpoint**: At this point, User Story 1 should be fully functional - users can search for books, see cached results within 3s, and auto-populate metadata

---

## Phase 4: User Story 2 - Search Refinement and Manual Override (Priority: P2)

**Goal**: Users can refine broad search results with filters and manually edit auto-populated fields for incomplete/incorrect data

**Independent Test**: Search for "Smith" (broad query), apply year filter "2020-2023", receive refined results, select a book, edit page count from auto-populated 350 to actual 342, verify override is saved per user

### Tests for User Story 2 (TDD: Write FIRST, verify FAIL)

- [ ] T038 [P] [US2] Create backend/tests/unit/models/reading-entry-override.test.js with tests for field_name validation, CRUD operations, unique constraint per reading_entry_id + field_name
- [ ] T039 [P] [US2] Create backend/tests/integration/user-overrides-flow.test.js with tests for creating book from search, applying user overrides, verifying canonical book remains unchanged
- [ ] T040 [P] [US2] Create frontend/tests/components/SearchFilters.test.jsx with tests for year range, author refinement, filter application

### Implementation for User Story 2

- [ ] T041 [P] [US2] Create frontend/src/components/BookSearch/SearchFilters.jsx with year range slider, author text input, apply/reset buttons
- [ ] T042 [US2] Update backend/src/services/book-search/providers/google-books.js to support filter parameters (yearRange: {start, end}, author) in query string
- [ ] T043 [US2] Update frontend/src/hooks/useBookSearch.js to manage filter state and pass to API requests
- [ ] T044 [US2] Update GET /api/books/search endpoint in backend/src/api/routes/book-search.js to accept filter query params
- [ ] T045 [US2] Create backend/src/api/routes/books.js PATCH /api/books/:bookId/overrides endpoint to save reading_entry_overrides (field_name, override_value)
- [ ] T046 [US2] Update frontend/src/components/BookForm/AddBookForm to allow editing auto-populated fields before save
- [ ] T047 [US2] Create frontend/src/services/bookApi.js patchBookOverrides(bookId, overrides) method calling PATCH /api/books/:bookId/overrides
- [ ] T048 [US2] Update POST /api/books/from-search in backend/src/api/routes/book-search.js to accept optional overrides object and create reading_entry_overrides records
- [ ] T049 [US2] Add user override indicators in frontend showing which fields differ from canonical data (e.g., italic text, "edited by you" tooltip)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can search broadly, refine with filters, and apply personal overrides without affecting other users

---

## Phase 5: User Story 3 - Handling No Results and Manual Entry (Priority: P3)

**Goal**: Users have a clear path forward when search returns no results, allowing manual book entry with option to retry search later

**Independent Test**: Search for nonexistent book "My Unpublished Memoir 2025", receive "No results found" message with "Add Manually" button, click button, fill in title and author, save successfully, later edit book and see "Retry Search" option

### Tests for User Story 3 (TDD: Write FIRST, verify FAIL)

- [ ] T050 [P] [US3] Create backend/tests/integration/manual-entry-with-search.test.js testing manual entry creation, subsequent search retry, metadata population
- [ ] T051 [P] [US3] Create frontend/tests/components/NoResultsMessage.test.jsx with tests for empty state display, manual entry button, retry search flow

### Implementation for User Story 3

- [ ] T052 [P] [US3] Create frontend/src/components/BookSearch/NoResultsMessage.jsx with clear messaging, "Add Manually" button, optional search tips
- [ ] T053 [US3] Update frontend/src/hooks/useBookSearch.js to detect empty results (totalCount === 0) and trigger NoResultsMessage display
- [ ] T054 [US3] Create POST /api/books/manual endpoint in backend/src/api/routes/books.js accepting minimal fields (title, author), creating Book without BookEdition or BookMetadataSource
- [ ] T055 [US3] Update frontend/src/components/BookForm/AddBookForm to support manual entry mode with required fields only (title, author minimum per FR-007)
- [ ] T056 [US3] Create GET /api/books/:bookId/search-suggestions endpoint in backend/src/api/routes/books.js that retries external search using existing book title + author
- [ ] T057 [US3] Add "Retry External Search" button in frontend book edit view for manually-entered books (checking if book_metadata_sources is empty)
- [ ] T058 [US3] Create frontend workflow for retry search: call GET /api/books/:bookId/search-suggestions, display results, allow user to merge metadata with existing manual entry

**Checkpoint**: All user stories should now be independently functional - users can search, refine, override, handle no results, and manually enter books

---

## Phase 6: Duplicate Detection (Critical - Addresses Codex Issue #3)

**Purpose**: Prevent duplicate books using ISBN-first strategy with fuzzy matching fallback (FR-019, SC-010)

- [ ] T059 Create backend/src/services/book-search/duplicate-detector.js with checkDuplicate(bookData) method implementing ISBN-first strategy
- [ ] T060 [P] Implement ISBN normalization in backend/src/services/book-search/duplicate-detector.js (ISBN-10 to ISBN-13 conversion, hyphen removal)
- [ ] T061 [P] Implement fuzzy matching fallback in backend/src/services/book-search/duplicate-detector.js using pg_trgm similarity() with 0.8 threshold on normalized_title + primary_author
- [ ] T062 Create backend/tests/unit/services/book-search/duplicate-detector.test.js with test cases from research.md (ISBN-10/13 variants, title variations, multi-author books)
- [ ] T063 Update POST /api/books/from-search in backend/src/api/routes/book-search.js to call duplicate-detector before creating new Book
- [ ] T064 Add duplicate response handling: return 409 Conflict with {duplicate: true, matchType: 'isbn'|'fuzzy', confidence: 0.0-1.0, existingBook, actions: ['use_existing', 'create_anyway', 'merge']}
- [ ] T065 Create frontend/src/components/BookSearch/DuplicateWarning.jsx modal showing existing book details, confidence score, action buttons
- [ ] T066 Update frontend/src/services/bookSearchApi.js to handle 409 responses and trigger DuplicateWarning modal
- [ ] T067 Add force parameter to POST /api/books/from-search allowing user to bypass duplicate detection if force=true

---

## Phase 7: Open Library Fallback Provider (Enhancement)

**Purpose**: Implement fallback provider for rate limit scenarios and comprehensive historical coverage

- [ ] T068 Create backend/src/services/book-search/providers/open-library.js implementing BaseProvider with Open Library API search, normalize, hydrate methods
- [ ] T069 Create backend/tests/unit/services/book-search/providers/open-library.test.js with tests for search, normalization, error handling
- [ ] T070 Update backend/src/services/book-search/index.js to support provider fallback: try Google Books, fallback to Open Library on circuit breaker open or rate limit (429)
- [ ] T071 Add provider switching logic in backend/src/services/book-search/index.js based on quota counters and circuit breaker state
- [ ] T072 Update cache keys in backend/src/services/book-search/cache-manager.js to include provider name (e.g., "search:1984:google_books" vs "search:1984:open_library")

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure production readiness

- [ ] T073 [P] Add comprehensive error handling in backend/src/services/book-search/index.js for all edge cases from spec.md (quota exhaustion, Redis unavailable, slow network)
- [ ] T074 [P] Implement graceful degradation: when Redis unavailable, skip to PostgreSQL L2 cache; when both unavailable, go directly to API with circuit breaker
- [ ] T075 [P] Add structured logging for all search operations with correlation IDs for request tracing
- [ ] T076 [P] Create backend health check endpoint GET /api/health/search returning Redis status, PostgreSQL cache status, circuit breaker state, provider quota remaining
- [ ] T077 [P] Implement metrics collection in backend/src/lib/metrics.js for SC-007 (95% accuracy), SC-008 (70% cache hit rate), SC-009 (<1% false positives)
- [ ] T078 [P] Add accessibility improvements: ARIA labels, keyboard navigation (Tab/Enter), screen reader announcements for search results, WCAG 2.1 AA compliance (QT-005)
- [ ] T079 [P] Add internationalization support: UTF-8 encoding, multi-language search queries, RTL layout CSS for Arabic/Hebrew (FR-017)
- [ ] T080 [P] Create backend/tests/e2e/book-search.spec.js with Playwright covering complete user journeys for all 3 user stories
- [ ] T081 [P] Performance optimization: implement debounce (300ms) on search input, lazy loading for results, image lazy loading for covers
- [ ] T082 Update quickstart.md with any deviations from planned setup (if any)
- [ ] T083 Run through quickstart.md validation: Docker up, migration, dependencies, manual tests, automated tests
- [ ] T084 [P] Code cleanup: remove console.logs, add JSDoc comments, ensure consistent error handling, follow project style guide
- [ ] T085 [P] Security hardening: sanitize search queries for SQL injection, validate all inputs, implement rate limiting headers, add CORS configuration
- [ ] T086 Update CLAUDE.md if any new patterns or technologies were added during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T006) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T007-T016) - Core MVP functionality
- **User Story 2 (Phase 4)**: Depends on Foundational (T007-T016) - Can run in parallel with US1 but typically sequential
- **User Story 3 (Phase 5)**: Depends on Foundational (T007-T016) - Can run in parallel with US1/US2 but typically sequential
- **Duplicate Detection (Phase 6)**: Depends on User Story 1 (T017-T037) - Critical enhancement
- **Open Library Fallback (Phase 7)**: Depends on Foundational (T007-T016) - Can develop in parallel with user stories
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - **CRITICAL**: This is the MVP - delivers immediate value (SC-004: 60% time reduction)
  - All tests (T017-T021) can run in parallel (different files)
  - Models (T022-T024) can run in parallel
  - Frontend components (T032-T034) can run in parallel

- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
  - Adds filters and overrides without breaking US1 functionality
  - All tests (T038-T040) can run in parallel

- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Handles edge case of no results
  - Fallback scenario that doesn't block core search functionality
  - Tests (T050-T051) can run in parallel

### Within Each User Story

**TDD Flow (CRITICAL)**:
1. **Tests FIRST**: Write all tests for the user story, verify they FAIL (red)
2. **Models**: Create data models needed for the story
3. **Services**: Implement business logic
4. **Endpoints/UI**: Wire up API routes and frontend components
5. **Tests PASS**: Verify all tests now pass (green)
6. **Refactor**: Clean up code while keeping tests green

### Parallel Opportunities

**Phase 1 (Setup)**: T002 and T003 can run in parallel (different files)

**Phase 2 (Foundational)**:
- T008, T009, T010, T011 (models) can all run in parallel (different files)
- T015 (normalizer test) can run in parallel with models

**Phase 3 (User Story 1)**:
- Tests: T017, T018, T019, T020, T021 all parallel (different test files)
- Providers: T022 can run while T023-T024 are in progress
- Frontend components: T032, T033, T034 all parallel (different component files)

**Phase 4 (User Story 2)**:
- Tests: T038, T039, T040 all parallel
- T041, T045 can run in parallel (different concerns)

**Phase 5 (User Story 3)**:
- Tests: T050, T051 parallel
- T052, T054 can run in parallel

**Phase 6 (Duplicate Detection)**:
- T060, T061 can run in parallel (different algorithm aspects)

**Phase 8 (Polish)**:
- Almost all tasks (T073-T086) can run in parallel as they touch different files and concerns

---

## Parallel Example: User Story 1 (MVP)

```bash
# Step 1: Launch all tests together (TDD - write FIRST, verify FAIL):
Task T017: "Create backend/tests/unit/services/book-search/providers/google-books.test.js"
Task T018: "Create backend/tests/unit/services/book-search/cache-manager.test.js"
Task T019: "Create backend/tests/unit/services/book-search/circuit-breaker.test.js"
Task T020: "Create backend/tests/integration/book-search-flow.test.js"
Task T021: "Create backend/tests/contract/google-books-api.test.js"

# Step 2: Launch all provider and service implementations:
Task T022: "Create backend/src/services/book-search/providers/google-books.js"
Task T023: "Create backend/src/services/book-search/cache-manager.js"
Task T024: "Create backend/src/services/book-search/circuit-breaker.js"

# Step 3: Launch all frontend components in parallel:
Task T032: "Create frontend/src/components/BookSearch/SearchInput.jsx"
Task T033: "Create frontend/src/components/BookSearch/SearchResults.jsx"
Task T034: "Create frontend/src/components/BookSearch/BookResultCard.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - RECOMMENDED

**Goal**: Deliver core search functionality as fast as possible for validation

1. ✅ Complete Phase 1: Setup (T001-T006) - Docker, dependencies, migration
2. ✅ Complete Phase 2: Foundational (T007-T016) - Models, base provider, metrics
3. ✅ Complete Phase 3: User Story 1 (T017-T037) - Full search with Google Books
4. ✅ Complete Phase 6: Duplicate Detection (T059-T067) - Critical for data quality
5. **STOP and VALIDATE**:
   - Run all tests (unit, integration, E2E)
   - Manual testing per quickstart.md
   - Verify SC-001 (book addition <30s), SC-002 (90% searches <3s), SC-004 (60% time reduction)
6. Demo to stakeholders, gather feedback
7. Deploy to staging/production if ready

**Estimated effort**: ~60-70% of total tasks, delivers 80% of user value

### Incremental Delivery (All User Stories)

**Goal**: Add enhancements in priority order without breaking MVP

1. ✅ Complete Setup + Foundational → Foundation ready
2. ✅ Add User Story 1 + Duplicate Detection → Test independently → **Deploy MVP!**
3. Add User Story 2 (Filters + Overrides) → Test independently → Deploy enhancement
4. Add User Story 3 (No Results + Manual Entry) → Test independently → Deploy fallback handling
5. Add Phase 7 (Open Library Fallback) → Test independently → Deploy resilience improvement
6. Add Phase 8 (Polish) → Final validation → Deploy production-ready version

**Each phase adds value without breaking previous functionality**

### Parallel Team Strategy

With 2-3 developers working concurrently:

1. **All team**: Complete Setup + Foundational together (T001-T016)
2. **Once Foundational is done**:
   - Developer A: User Story 1 backend (T017-T029)
   - Developer B: User Story 1 frontend (T030-T037)
   - Developer C: Duplicate Detection (T059-T067)
3. **After User Story 1 complete**:
   - Developer A: User Story 2 (T038-T049)
   - Developer B: User Story 3 (T050-T058)
   - Developer C: Open Library Fallback (T068-T072)
4. **Final integration**: All team on Phase 8 Polish (T073-T086)

---

## Success Criteria Validation Checklist

After implementing each user story, verify these criteria:

**User Story 1 (MVP)**:
- [ ] SC-001: Book addition completes in <30 seconds (search + select + populate)
- [ ] SC-002: 90% of searches return results within 3 seconds
- [ ] SC-003: 85% first-attempt success rate in user testing
- [ ] SC-004: Manual entry time reduced by 60% (measure: 5min manual → 2min with search)
- [ ] SC-005: Handles 10 concurrent searches without degradation
- [ ] SC-008: Cache hit rate >70% for repeat searches

**User Story 2**:
- [ ] Filters reduce broad search results effectively (e.g., "Smith" 200 results → "Smith 2020-2023" 15 results)
- [ ] User overrides save correctly without affecting canonical book data or other users
- [ ] Override indicators clearly show which fields were edited

**User Story 3**:
- [ ] No results message is clear and actionable
- [ ] Manual entry requires only title + author minimum
- [ ] Retry search populates missing metadata without overwriting user edits

**Duplicate Detection**:
- [ ] SC-010: >95% duplicate detection accuracy on curated test set
- [ ] ISBN-10 and ISBN-13 variants recognized as same book
- [ ] Fuzzy matching catches title variations (e.g., "1984" vs "Nineteen Eighty-Four")

**Overall Quality**:
- [ ] QT-001: ≥90% test coverage across all modules
- [ ] QT-002: Contract tests pass against live Google Books API
- [ ] QT-003: Integration tests cover search → select → save flow
- [ ] QT-005: WCAG 2.1 AA compliance verified with accessibility audit
- [ ] SC-006: User satisfaction rating ≥4.5/5 in user testing
- [ ] SC-007: 95% metadata accuracy (measured via provenance tracking)
- [ ] SC-009: Circuit breaker false positive rate <1%

---

## Notes

- **[P] tasks**: Different files, no dependencies within same phase - run in parallel for speed
- **[Story] label**: Maps task to specific user story for traceability and independent testing
- **TDD approach**: Write tests first (red), implement to pass (green), refactor - per QT-001
- **Commit strategy**: Commit after each task or logical group (e.g., all models for a story)
- **Stop at checkpoints**: Validate each user story independently before proceeding
- **Cache TTLs**: Redis 12h, PostgreSQL 30 days per user approval
- **Traffic assumptions**: <10 concurrent users, ~100 searches/day, free tier sufficient
- **Avoid**:
  - Vague tasks without file paths
  - Cross-story dependencies that break independence
  - Skipping tests (TDD is required per QT-001)
  - Direct edits to canonical Book records (use ReadingEntryOverride instead)

---

**Total Tasks**: 86 tasks across 8 phases
**MVP Scope**: Phases 1-3 + Phase 6 (T001-T037 + T059-T067) = ~50 tasks
**Parallel Opportunities**: ~35 tasks marked [P] can run concurrently
**Estimated MVP Delivery**: 2-3 weeks for single developer, 1-2 weeks for team of 3

**Ready to implement**: `/speckit.implement` command can now execute tasks in dependency order
