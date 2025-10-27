# Tasks: Reading Journey Tracker

**Feature**: Reading Journey Tracker  
**Branch**: 001-track-reading  
**Input**: Design documents from `/specs/001-track-reading/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml

**Tests**: TDD approach MANDATORY (QT-006). Write tests first, validate they fail (red), implement to pass (green), refactor while keeping tests green.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Per plan.md structure:
- **Backend**: `backend/src/`, `backend/tests/`, `backend/migrations/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Shared**: `shared/contracts/`, `shared/constants.js`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create backend directory structure: src/{db,models,services,api/{routes,middleware,validators},lib}
- [X] T002 Create frontend directory structure: src/{pages,styles,scripts/{api,components,services,utils},assets}
- [X] T003 Create shared directory structure: contracts/, constants.js
- [X] T004 Initialize backend package.json with Fastify, pg, pino, @fastify/{cors,session,rate-limit}, uuid, vitest
- [X] T005 [P] Initialize frontend package.json with vite, @testing-library/dom, vitest
- [X] T006 [P] Install Playwright for E2E and accessibility testing: npm install -D playwright @axe-core/playwright
- [X] T007 [P] Configure ESLint and Prettier for backend (backend/.eslintrc.js, backend/.prettierrc)
- [X] T008 [P] Configure ESLint and Prettier for frontend (frontend/.eslintrc.js, frontend/.prettierrc)
- [X] T009 Configure Vitest for backend unit tests in backend/vitest.config.js (coverage ≥90% threshold)
- [X] T010 [P] Configure Vitest for frontend unit tests in frontend/vitest.config.js
- [X] T011 [P] Configure Playwright for E2E tests in frontend/playwright.config.js with axe accessibility checks
- [X] T012 Create shared constants file shared/constants.js with status enums (TO_READ, READING, FINISHED)
- [X] T013 Copy OpenAPI spec from specs/001-track-reading/contracts/openapi.yaml to shared/contracts/openapi.yaml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Setup

- [X] T014 Create database migration 001_create_tables.sql for books, reader_profiles, reading_entries, progress_updates, status_transitions, sessions tables per data-model.md
- [X] T015 [P] Create database migration 002_create_indexes.sql for performance indexes per data-model.md
- [X] T016 Create migration runner script backend/src/db/migrate.js using postgres-migrations
- [X] T017 Create database connection module backend/src/db/connection.js using node-postgres with pool management

### Backend Infrastructure

- [X] T018 Implement Pino logger setup in backend/src/lib/logger.js with correlation ID support (FR-015, FR-017)
- [X] T019 [P] Implement correlation ID middleware in backend/src/api/middleware/correlation-id.js using uuid v4
- [X] T020 [P] Implement session middleware configuration in backend/src/api/middleware/session.js using @fastify/session + PostgreSQL store
- [X] T021 [P] Implement rate limiting middleware in backend/src/api/middleware/rate-limit.js using @fastify/rate-limit (100 additions/hour per reader - FR-019)
- [X] T022 [P] Implement authentication middleware in backend/src/api/middleware/auth.js (session validation, RBAC - FR-009)
- [X] T023 [P] Implement error handler middleware in backend/src/api/middleware/error-handler.js (correlation IDs in responses - FR-017)
- [X] T024 Create Fastify server setup in backend/src/server.js with all middleware, CORS, logging
- [X] T025 Create environment configuration loader in backend/src/lib/config.js (.env support for DATABASE_URL, PORT, SESSION_SECRET, etc.)

### Frontend Infrastructure

- [X] T026 Configure Vite multi-page app in frontend/vite.config.js with entry points: index.html, dashboard.html, book-detail.html
- [X] T027 [P] Create CSS design tokens in frontend/src/styles/tokens.css (colors, spacing, typography, focus indicators - WCAG 2.1 AA)
- [X] T028 [P] Create base CSS in frontend/src/styles/base.css (reset, accessibility defaults)
- [X] T029 [P] Create API client base in frontend/src/scripts/api/client.js (fetch wrapper with error handling, correlation ID extraction)
- [X] T030 Create environment configuration in frontend/.env.local.example (VITE_API_URL)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Organize Reading Pipeline (Priority: P1) 🎯 MVP

**Goal**: Enable readers to add books, assign them to TO_READ/READING/FINISHED statuses, move books between statuses, and filter by status

**Independent Test**: Populate a fresh account with sample titles, assign each to a status list, verify each list renders with accessible labels and focus states meeting WCAG 2.1 AA

### Tests for User Story 1 (Write FIRST - ensure they FAIL before implementation)

- [X] T031 [P] [US1] Contract test for POST /api/readers/{readerId}/reading-entries in backend/tests/contract/reading-entries.test.js
- [X] T032 [P] [US1] Contract test for GET /api/readers/{readerId}/reading-entries with status filter in backend/tests/contract/reading-entries.test.js
- [X] T033 [P] [US1] Contract test for PATCH /api/reading-entries/{entryId} (status transitions) in backend/tests/contract/reading-entries.test.js
- [X] T034 [P] [US1] Unit test for Book model CRUD operations in backend/tests/unit/models/book.test.js (≥90% coverage)
- [X] T035 [P] [US1] Unit test for ReadingEntry model CRUD operations in backend/tests/unit/models/reading-entry.test.js (≥90% coverage)
- [X] T036 [P] [US1] Unit test for StatusTransition model create/query in backend/tests/unit/models/status-transition.test.js (≥90% coverage)
- [X] T037 [US1] Unit test for ReadingService book addition logic (duplicate detection, unique constraint) in backend/tests/unit/services/reading-service.test.js (≥90% coverage)
- [X] T038 [US1] Unit test for ReadingService status transition logic (from/to validation, history recording) in backend/tests/unit/services/reading-service.test.js (≥90% coverage)
- [X] T039 [US1] Integration test for complete user journey: add book → move TO_READ → move READING → verify status_transitions in backend/tests/integration/us1-organize-pipeline.test.js
- [X] T040 [P] [US1] E2E test for dashboard rendering with books in all three statuses in frontend/tests/integration/dashboard.spec.js
- [X] T041 [P] [US1] E2E accessibility test for dashboard keyboard navigation and screen reader announcements in frontend/tests/integration/dashboard-a11y.spec.js
- [X] T042 [P] [US1] Unit test for BookList component rendering and filtering in frontend/tests/unit/components/book-list.test.js

### Implementation for User Story 1

**Backend Models** (Data Access Layer)

- [X] T043 [P] [US1] Create Book model in backend/src/models/book.js (create, findById, findByTitleAuthorEdition for duplicates, update)
- [X] T044 [P] [US1] Create ReadingEntry model in backend/src/models/reading-entry.js (create, findById, findByReader, findByReaderAndStatus, updateStatus, delete)
- [X] T045 [P] [US1] Create StatusTransition model in backend/src/models/status-transition.js (create, findByEntry for history)
- [X] T046 [P] [US1] Create ReaderProfile model in backend/src/models/reader-profile.js (create, findById, update preferences)

**Backend Services** (Business Logic)

- [X] T047 [US1] Implement ReadingService.addBook in backend/src/services/reading-service.js (check duplicates, create book + reading_entry + initial status_transition, analytics event - FR-016)
- [X] T048 [US1] Implement ReadingService.getReadingEntries in backend/src/services/reading-service.js (query by reader + status filter, pagination FR-012, join with books)
- [X] T049 [US1] Implement ReadingService.updateStatus in backend/src/services/reading-service.js (validate transition, update reading_entry, create status_transition, last-write-wins with timestamp check - FR-010, analytics event)
- [X] T050 [US1] Add input validation schemas in backend/src/api/validators/reading-entry-schemas.js using Fastify JSON Schema (title max 500, author max 200, status enum - FR-018)

**Backend API Routes**

- [X] T051 [US1] Implement POST /api/readers/:readerId/reading-entries route in backend/src/api/routes/reading-entries.js (calls ReadingService.addBook, rate limited, requires auth)
- [X] T052 [P] [US1] Implement GET /api/readers/:readerId/reading-entries route with status query param and pagination in backend/src/api/routes/reading-entries.js
- [X] T053 [US1] Implement PATCH /api/reading-entries/:entryId route for status updates in backend/src/api/routes/reading-entries.js (calls ReadingService.updateStatus, handles FR-010 concurrent edit conflicts)
- [X] T054 [US1] Register reading-entries routes in backend/src/server.js

**Frontend Pages & Styles**

- [X] T055 [P] [US1] Create dashboard HTML structure in frontend/src/pages/dashboard.html (semantic HTML, ARIA labels, three status sections)
- [X] T056 [P] [US1] Create component styles in frontend/src/styles/components.css (book-list, book-card, status-filter, accessible focus indicators - WCAG 2.1 AA contrast)

**Frontend Scripts** (Vanilla JS)

- [X] T057 [P] [US1] Create API client for reading entries in frontend/src/scripts/api/reading-entries-api.js (addBook, getEntries, updateStatus methods with correlation ID handling)
- [X] T058 [US1] Create BookStore state management class in frontend/src/scripts/services/book-store.js (extends EventTarget, manages reading entries state, emits events on updates)
- [X] T059 [US1] Create BookList component in frontend/src/scripts/components/book-list.js (renders book cards, handles filter changes, keyboard navigation, ARIA live regions)
- [X] T060 [US1] Create AddBookForm component in frontend/src/scripts/components/add-book-form.js (form validation, optimistic UI update - FR-013, error handling)
- [X] T061 [US1] Create StatusFilter component in frontend/src/scripts/components/status-filter.js (keyboard accessible, updates BookStore, ARIA announcements)
- [X] T062 [US1] Initialize dashboard page in frontend/src/scripts/pages/dashboard.js (wires up components, BookStore, event listeners, loads initial data)

**Validation & Polish**

- [X] T063 [US1] Run all US1 tests (unit, integration, contract, E2E) - verify all pass
- [X] T064 [US1] Run Playwright accessibility audit on dashboard - verify WCAG 2.1 AA compliance (QT-004, SC-004)
- [X] T065 [US1] Verify ≥90% code coverage for US1 modules (QT-001)
- [X] T066 [US1] Manual test: Add "The Invisible Library" as TO_READ, move to READING, verify status_transitions logged, filter by status
- [X] T067 [US1] Document US1 completion in specs/001-track-reading/tasks.md, update CHANGELOG.md

**Checkpoint**: User Story 1 (MVP) complete and independently validated ✅

---

## Phase 4: User Story 2 - Track Active Reading Progress (Priority: P2)

**Goal**: Enable readers to record progress notes with optional page/chapter markers for books marked READING, display notes in chronological order

**Independent Test**: With an existing READING book, record progress updates, verify they display in chronological order with timestamps announced by assistive technologies

### Tests for User Story 2 (Write FIRST - ensure they FAIL before implementation)

- [X] T068 [P] [US2] Contract test for POST /api/reading-entries/{entryId}/progress-notes in backend/tests/contract/progress-notes.test.js
- [X] T069 [P] [US2] Contract test for GET /api/reading-entries/{entryId}/progress-notes in backend/tests/contract/progress-notes.test.js
- [X] T070 [P] [US2] Unit test for ProgressUpdate model create/query in backend/tests/unit/models/progress-update.test.js (≥90% coverage)
- [X] T071 [US2] Unit test for ReadingService.addProgressNote in backend/tests/unit/services/reading-service.test.js (note length validation, timestamp handling - ≥90% coverage)
- [X] T072 [US2] Integration test for complete user journey: add progress note → retrieve notes chronologically → verify analytics event in backend/tests/integration/us2-track-progress.test.js
- [X] T073 [P] [US2] E2E test for book detail page progress note form in frontend/tests/integration/book-detail.spec.js
- [X] T074 [P] [US2] E2E accessibility test for progress notes timeline (screen reader announcements, keyboard navigation) in frontend/tests/integration/book-detail-a11y.spec.js
- [X] T075 [P] [US2] Unit test for ProgressNotesList component rendering in frontend/tests/unit/components/progress-notes-list.test.js

### Implementation for User Story 2

**Backend Models & Services**

- [X] T076 [P] [US2] Create ProgressUpdate model in backend/src/models/progress-update.js (create, findByEntry with DESC ordering)
- [X] T077 [US2] Implement ReadingService.addProgressNote in backend/src/services/reading-service.js (validate note length max 1000, page_or_chapter max 50 - FR-004, FR-018, analytics event)
- [X] T078 [US2] Implement ReadingService.getProgressNotes in backend/src/services/reading-service.js (query by entry, chronological DESC, include book details)
- [X] T079 [US2] Add progress note validation schemas in backend/src/api/validators/progress-note-schemas.js

**Backend API Routes**

- [X] T080 [US2] Implement POST /api/reading-entries/:entryId/progress-notes route in backend/src/api/routes/progress-notes.js (calls ReadingService.addProgressNote, rate limited 500/hour)
- [X] T081 [P] [US2] Implement GET /api/reading-entries/:entryId/progress-notes route in backend/src/api/routes/progress-notes.js
- [X] T082 [US2] Register progress-notes routes in backend/src/server.js

**Frontend Pages & Components**

- [X] T083 [P] [US2] Create book detail HTML structure in frontend/src/pages/book-detail.html (book info section, progress timeline, add note form)
- [X] T084 [P] [US2] Create API client for progress notes in frontend/src/scripts/api/progress-notes-api.js (addNote, getNotes methods)
- [X] T085 [US2] Create ProgressNotesList component in frontend/src/scripts/components/progress-notes-list.js (renders timeline, newest first, ARIA live region for updates, relative time formatting)
- [X] T086 [US2] Create AddProgressNoteForm component in frontend/src/scripts/components/add-progress-note-form.js (validation, optimistic UI update - FR-013, clear form on success)
- [X] T087 [US2] Initialize book detail page in frontend/src/scripts/pages/book-detail.js (loads book data, progress notes, wires up components)

**Validation & Polish**

- [X] T088 [US2] Run all US2 tests (unit, integration, contract, E2E) - verify all pass
- [X] T089 [US2] Run Playwright accessibility audit on book detail page - verify WCAG 2.1 AA compliance (QT-004, SC-004)
- [X] T090 [US2] Verify ≥90% code coverage for US2 modules (QT-001)
- [X] T091 [US2] Manual test: Add progress note "Finished Chapter 5" with page marker, verify timestamp displays, check screen reader announcements
- [X] T092 [US2] Document US2 completion in specs/001-track-reading/tasks.md, update CHANGELOG.md

**Checkpoint**: User Story 2 complete and independently validated ✅

---

## Phase 5: User Story 3 - Rate and Reflect on Completed Books (Priority: P3)

**Goal**: Enable readers to rate finished books (1-5 stars) and add reflection notes, filter by "Top Rated" (≥4 stars)

**Independent Test**: Mark a book as finished, assign rating and note, verify it appears in Finished view, test "Top Rated" filter with WCAG compliance

### Tests for User Story 3 (Write FIRST - ensure they FAIL before implementation)

- [ ] T093 [P] [US3] Contract test for PUT /api/reading-entries/{entryId}/rating in backend/tests/contract/ratings.test.js
- [ ] T094 [US3] Unit test for ReadingService.setRating in backend/tests/unit/services/reading-service.test.js (validate rating 1-5, only for FINISHED status, reflection note max 2000 - ≥90% coverage)
- [ ] T095 [US3] Unit test for ReadingService.getTopRatedBooks in backend/tests/unit/services/reading-service.test.js (filter rating ≥4, ordering - ≥90% coverage)
- [ ] T096 [US3] Integration test for complete user journey: finish book → rate 4 stars → add reflection → verify in Top Rated list in backend/tests/integration/us3-rate-reflect.test.js
- [ ] T097 [P] [US3] E2E test for rating UI on dashboard Finished section in frontend/tests/integration/rating.spec.js
- [ ] T098 [P] [US3] E2E accessibility test for rating component (keyboard navigation, ARIA announcements) in frontend/tests/integration/rating-a11y.spec.js
- [ ] T099 [P] [US3] Unit test for RatingStars component in frontend/tests/unit/components/rating-stars.test.js

### Implementation for User Story 3

**Backend Services**

- [ ] T100 [US3] Implement ReadingService.setRating in backend/src/services/reading-service.js (validate status=FINISHED, rating 1-5, reflection_note max 2000 - FR-005, FR-018, analytics event measuring SC-003)
- [ ] T101 [US3] Implement ReadingService.clearRating in backend/src/services/reading-service.js (allow rating removal for re-reads)
- [ ] T102 [US3] Implement ReadingService.getTopRatedBooks in backend/src/services/reading-service.js (filter rating ≥4, ORDER BY rating DESC, pagination - supports spec line 52)
- [ ] T103 [US3] Add rating validation schemas in backend/src/api/validators/rating-schemas.js

**Backend API Routes**

- [ ] T104 [US3] Implement PUT /api/reading-entries/:entryId/rating route in backend/src/api/routes/ratings.js (calls ReadingService.setRating)
- [ ] T105 [P] [US3] Implement DELETE /api/reading-entries/:entryId/rating route in backend/src/api/routes/ratings.js (for clearing ratings)
- [ ] T106 [US3] Add topRated query parameter support to GET /api/readers/:readerId/reading-entries route in backend/src/api/routes/reading-entries.js
- [ ] T107 [US3] Register ratings routes in backend/src/server.js

**Frontend Components**

- [ ] T108 [P] [US3] Create RatingStars component in frontend/src/scripts/components/rating-stars.js (interactive 1-5 star UI, keyboard accessible with arrow keys, ARIA labels)
- [ ] T109 [US3] Create AddRatingForm component in frontend/src/scripts/components/add-rating-form.js (rating + reflection textarea, validation max 2000 chars, optimistic UI - FR-013)
- [ ] T110 [US3] Update BookList component in frontend/src/scripts/components/book-list.js to display ratings and support "Top Rated" filter
- [ ] T111 [US3] Update StatusFilter component in frontend/src/scripts/components/status-filter.js to add "Top Rated" filter option with ARIA live announcement of count

**Frontend API Client**

- [ ] T112 [P] [US3] Create API client for ratings in frontend/src/scripts/api/ratings-api.js (setRating, clearRating methods)

**Validation & Polish**

- [ ] T113 [US3] Run all US3 tests (unit, integration, contract, E2E) - verify all pass
- [ ] T114 [US3] Run Playwright accessibility audit on rating UI - verify WCAG 2.1 AA compliance (QT-004, SC-004)
- [ ] T115 [US3] Verify ≥90% code coverage for US3 modules (QT-001)
- [ ] T116 [US3] Manual test: Finish book, rate 4 stars, add reflection, verify in Top Rated filter, check ARIA live announcements
- [ ] T117 [US3] Document US3 completion in specs/001-track-reading/tasks.md, update CHANGELOG.md

**Checkpoint**: User Story 3 complete and independently validated ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, performance optimization, documentation, and production readiness

### Performance & Scale

- [ ] T118 [P] Implement server-side pagination for reading entries lists >100 books (FR-012) - verify in ReadingService.getReadingEntries
- [ ] T119 [P] Add database connection pooling optimization in backend/src/db/connection.js (max 20 connections)
- [ ] T120 Verify <3s response times for all UI operations with simulated 5,000 book library (FR-014, SC-002) - load testing

### Error Handling & Resilience

- [ ] T121 [P] Implement auto-retry with exponential backoff (3 attempts) for failed save operations in frontend API client (FR-011)
- [ ] T122 [P] Add user notification UI for concurrent edit conflicts (last-write-wins - FR-010) in frontend error handler
- [ ] T123 Implement correlation ID extraction and display in frontend error messages (FR-017)

### Security & Compliance

- [ ] T124 Audit all inputs for validation and sanitization (titles, notes, ratings - FR-018) - run security scan
- [ ] T125 [P] Verify rate limiting is active on mutation endpoints (FR-019) - test with 100+ requests/hour
- [ ] T126 Verify session-based auth and RBAC enforcement on all endpoints (FR-009) - penetration test

### Documentation

- [ ] T127 [P] Generate API documentation from OpenAPI spec using Redoc/Swagger UI in docs/api.md
- [ ] T128 [P] Create architecture diagram documenting frontend/backend/database interactions in docs/architecture.md
- [ ] T129 Update README.md with project overview, setup instructions (reference quickstart.md), and contribution guidelines
- [ ] T130 [P] Update CHANGELOG.md with release notes for v1.0.0 covering all three user stories

### Final Validation

- [ ] T131 Run full test suite (backend unit, backend integration, backend contract, frontend unit, frontend E2E, accessibility) - all must pass
- [ ] T132 Verify ≥90% overall code coverage across backend and frontend (QT-001)
- [ ] T133 Run Lighthouse audit on all pages - verify Performance >90, Accessibility 100, Best Practices >90
- [ ] T134 Execute all manual test scenarios from quickstart.md - verify all user stories work end-to-end
- [ ] T135 Validate Constitution compliance (all 5 principles) using plan.md checklist
- [ ] T136 Create deployment checklist from quickstart.md for staging/production environments

**Checkpoint**: Feature complete, tested, documented, and ready for deployment 🎉

---

## Implementation Strategy

### MVP Scope (Recommended First Delivery)

**Phase 1 + Phase 2 + Phase 3 (User Story 1 only)**

This provides a complete, testable, deployable increment:
- Users can add books
- Users can organize books into TO_READ, READING, FINISHED
- Users can move books between statuses
- Users can filter by status
- Full test coverage
- WCAG 2.1 AA compliant
- Production ready

**Benefits**:
- Validates core value proposition
- Establishes infrastructure for remaining stories
- Early user feedback
- Reduced risk

### Incremental Delivery

After MVP:
- **Iteration 2**: Add Phase 4 (User Story 2 - Progress Notes)
- **Iteration 3**: Add Phase 5 (User Story 3 - Ratings)
- **Iteration 4**: Add Phase 6 (Polish & optimization)

Each iteration is independently testable and deployable.

---

## Dependencies & Execution Order

### Story Dependencies

```text
Phase 1 (Setup)
     ↓
Phase 2 (Foundational) ← BLOCKING: Must complete before user stories
     ↓
     ├─→ Phase 3 (US1 - Organize Pipeline) ← MVP ← No dependencies, can start immediately
     │   
     ├─→ Phase 4 (US2 - Track Progress) ← Depends on US1 (requires READING books to exist)
     │   
     └─→ Phase 5 (US3 - Rate & Reflect) ← Depends on US1 (requires FINISHED books to exist)
          ↓
     Phase 6 (Polish) ← Depends on all user stories
```

**Key Insights**:
- US1 is the MVP and has no dependencies on other stories
- US2 and US3 can run in parallel after US1 is complete (they don't depend on each other)
- Phase 6 should only start after all user stories are validated

### Parallel Execution Opportunities

**Phase 1 (Setup)**: Tasks T003-T013 can run in parallel (marked with [P])

**Phase 2 (Foundational)**:
- T015, T018-T023, T027-T029 can run in parallel after T014, T017, T024-T025 are complete

**Phase 3 (US1)**:
- Tests T031-T042: All can run in parallel (different test files)
- Models T043-T046: All can run in parallel (different model files)
- Routes T052 can run in parallel with T051, T053
- Frontend T055-T056, T057 can run in parallel
- Frontend components T059-T061 can run in parallel after T058

**Phase 4 (US2)**:
- Tests T068-T075 can run in parallel
- T076 (model), T079 (schemas), T081 (route), T083-T084 (frontend) can run in parallel

**Phase 5 (US3)**:
- Tests T093-T099 can run in parallel
- T105, T108, T112 can run in parallel with other tasks in same phase

**Phase 6 (Polish)**:
- T118-T119, T121-T122, T125, T127-T130 can run in parallel

---

## Task Summary

**Total Tasks**: 136

**Tasks by Phase**:
- Phase 1 (Setup): 13 tasks
- Phase 2 (Foundational): 17 tasks (BLOCKING)
- Phase 3 (US1 - MVP): 37 tasks (12 tests + 25 implementation)
- Phase 4 (US2): 25 tasks (8 tests + 17 implementation)
- Phase 5 (US3): 25 tasks (7 tests + 18 implementation)
- Phase 6 (Polish): 19 tasks

**Parallelizable Tasks**: 58 tasks marked with [P]

**Test Tasks**: 42 tasks (31% of total - ensures TDD compliance)

**Independent Test Criteria**:
- US1: Dashboard with books in all statuses, keyboard navigation, screen reader support
- US2: Progress notes timeline with chronological display, assistive tech announcements
- US3: Rating UI with 1-5 stars, Top Rated filter, accessibility compliance

**Estimated Effort** (assuming 1 task ≈ 1-2 hours):
- MVP (Phase 1 + 2 + 3): 67 tasks ≈ 67-134 hours ≈ 2-3 weeks for 1 developer
- Full Feature: 136 tasks ≈ 136-272 hours ≈ 3-6 weeks for 1 developer
- With parallel execution: Can reduce by 30-40% with proper task distribution

---

## Format Validation ✅

All tasks follow the required checklist format:
- ✅ All tasks start with `- [ ]` (checkbox)
- ✅ All tasks have sequential IDs (T001-T136)
- ✅ Parallelizable tasks marked with [P]
- ✅ User story tasks marked with [US1], [US2], or [US3]
- ✅ All tasks include file paths or specific deliverables
- ✅ Setup/Foundational/Polish phases have NO story labels
- ✅ User Story phases have REQUIRED story labels

