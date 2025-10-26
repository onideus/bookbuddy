---

description: "Task list for Reading Journey Tracker feature implementation"
---

# Tasks: Reading Journey Tracker

**Input**: Design documents from `/specs/001-track-reading/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Automated tests are MANDATORY. Define unit, integration, and contract coverage before implementation and ensure they fail prior to code changes (red-green-refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions
- Include associated spec/task IDs, documentation updates, and accessibility evidence where applicable

## Path Conventions

- **Single project**: `web/src/`, `services/`
- **Backend**: `services/reading-journey/`
- **Frontend**: `web/src/features/reading-journey/`
- **Tests**: `web/tests/`, `services/tests/`

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create `web/src/features/reading-journey/` module folders (components/pages/state/styles) per plan
- [X] T002 Scaffold `services/reading-journey/` service directories (api/db/migrations/models/contracts)
- [X] T003 Configure Vite aliases for `@reading-journey/*` in `web/vite.config.ts`
- [X] T004 [P] Add PostgreSQL schema placeholder migration files in `services/reading-journey/db/migrations/`
- [X] T005 [P] Sync design tokens by adding npm script and documentation references in `package.json` and `web/src/design-tokens/README.md`
- [X] T006 Document environment variables in `docs/env/reading-journey.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T007 Define database schema in `services/reading-journey/db/migrations/001_init.sql` for book, reading_entry, progress_note tables
- [X] T008 Implement Prisma/SQL data access layer stubs in `services/reading-journey/models/` for Book and ReadingEntry repositories
- [X] T009 Configure PostgreSQL connection pool and health check in `services/reading-journey/api/db-client.ts`
- [X] T010 Add analytics event contracts in `services/reading-journey/contracts/events.json`
- [X] T011 Implement shared TypeScript domain types in `services/reading-journey/contracts/types.ts`
- [X] T012 Add CI pipeline steps (lint, format, vitest, playwright) for reading journey modules in `.github/workflows/ci.yml`
- [X] T013 Seed sample data scripts for demo in `services/reading-journey/db/seeds/demo_reading_entries.ts`

---

## Phase 3: User Story 1 - Organize Reading Pipeline (Priority: P1) 🎯 MVP

**Goal**: Let readers add books, manage To Read/Reading/Finished lists, and filter by status.

**Independent Test**: Populate a fresh reader account with books across statuses, verify list rendering with design tokens, keyboard navigation, and aria labels.

### Tests for User Story 1 (MANDATORY - author before implementation) ⚠️

- [X] T014 [P] [US1] Write Vitest unit tests for reading list state manager in `web/tests/unit/features/reading-journey/state/readingListState.test.ts`
- [X] T015 [P] [US1] Implement contract tests for `GET /readers/{readerId}/reading-entries` in `services/tests/contract/reading-journey/listReadingEntries.test.ts`
- [X] T016 [US1] Add Playwright accessibility spec for status tabs in `web/tests/accessibility/reading-journey/statusTabs.spec.ts`

### Implementation for User Story 1

- [X] T017 [P] [US1] Build reading entry list API handler in `services/reading-journey/api/listReadingEntries.ts`
- [X] T018 [P] [US1] Implement book creation/attach endpoint in `services/reading-journey/api/createReadingEntry.ts`
- [X] T019 [US1] Wire PostgreSQL queries for listing entries with pagination in `services/reading-journey/models/readingEntryRepository.ts`
- [X] T020 [US1] Build UI status tabs and lists in `web/src/features/reading-journey/pages/DashboardPage.ts`
- [X] T021 [US1] Implement add-book form component with validation in `web/src/features/reading-journey/components/AddBookForm.ts`
- [X] T022 [US1] Add keyboard and screen-reader enhancements for list filtering in `web/src/features/reading-journey/components/StatusFilterTabs.ts`
- [X] T023 [US1] Integrate analytics events for entry creation and status filter usage in `web/src/analytics/events/readingJourney.ts`
- [X] T024 [US1] Update documentation and changelog for status management in `docs/features/reading-journey/status-management.md`
- [X] T025 [US1] Capture UX sign-off evidence for list views in `docs/ux/reading-journey/status-screenshots.md`

**Checkpoint**: User Story 1 independently functional and accessible.

---

## Phase 4: User Story 2 - Track Active Reading Progress (Priority: P2)

**Goal**: Allow readers to log in-progress notes and review chronological history for books in Reading status.

**Independent Test**: Record multiple progress updates on an existing Reading book, ensure chronological ordering, timestamp announcements, and note previews meet accessibility guidelines.

### Tests for User Story 2 (MANDATORY - author before implementation) ⚠️

- [ ] T026 [P] [US2] Write Vitest tests for progress note reducer and selectors in `web/tests/unit/features/reading-journey/state/progressNotesState.test.ts`
- [ ] T027 [P] [US2] Add integration test for `POST /reading-entries/{entryId}/progress-notes` in `services/tests/integration/reading-journey/progressNotes.test.ts`
- [ ] T028 [US2] Extend accessibility suite for progress timeline in `web/tests/accessibility/reading-journey/progressTimeline.spec.ts`

### Implementation for User Story 2

- [ ] T029 [US2] Implement progress note API handler in `services/reading-journey/api/createProgressNote.ts`
- [ ] T030 [US2] Add ProgressNote repository functions in `services/reading-journey/models/progressNoteRepository.ts`
- [ ] T031 [US2] Build progress timeline component with chronological ordering in `web/src/features/reading-journey/components/ProgressTimeline.ts`
- [ ] T032 [US2] Implement note composer with autosave and validation in `web/src/features/reading-journey/components/ProgressNoteComposer.ts`
- [ ] T033 [US2] Surface latest note preview on dashboard cards in `web/src/features/reading-journey/components/ReadingEntryCard.ts`
- [ ] T034 [US2] Emit analytics events for progress updates in `web/src/analytics/events/readingJourney.ts`
- [ ] T035 [US2] Update documentation for progress tracking workflow in `docs/features/reading-journey/progress-tracking.md`

**Checkpoint**: User Story 1 & 2 independently testable with progress logging.

---

## Phase 5: User Story 3 - Rate and Reflect on Completed Books (Priority: P3)

**Goal**: Enable readers to rate finished books, capture reflections, and filter top-rated titles.

**Independent Test**: Mark books as finished, add ratings/notes, verify finished list displays averages and supports Top Rated filter with accessible announcements.

### Tests for User Story 3 (MANDATORY - author before implementation) ⚠️

- [ ] T036 [P] [US3] Write Vitest tests for rating state transitions in `web/tests/unit/features/reading-journey/state/ratingState.test.ts`
- [ ] T037 [P] [US3] Add contract test for `PUT /reading-entries/{entryId}/rating` in `services/tests/contract/reading-journey/upsertRating.test.ts`
- [ ] T038 [US3] Expand accessibility spec for finished list filters in `web/tests/accessibility/reading-journey/finishedFilters.spec.ts`

### Implementation for User Story 3

- [ ] T039 [US3] Implement rating API handler in `services/reading-journey/api/upsertRating.ts`
- [ ] T040 [US3] Update ReadingEntry repository to enforce finished-only rating constraint in `services/reading-journey/models/readingEntryRepository.ts`
- [ ] T041 [US3] Build rating control UI with design tokens in `web/src/features/reading-journey/components/RatingControl.ts`
- [ ] T042 [US3] Create finished list view with Top Rated filter in `web/src/features/reading-journey/pages/FinishedListPage.ts`
- [ ] T043 [US3] Calculate and display aggregate ratings in `services/reading-journey/api/listReadingEntries.ts`
- [ ] T044 [US3] Log analytics events for rating submissions in `web/src/analytics/events/readingJourney.ts`
- [ ] T045 [US3] Update documentation for rating/reflection flows in `docs/features/reading-journey/ratings.md`
- [ ] T046 [US3] Capture UX evidence for rating interactions in `docs/ux/reading-journey/rating-flow.md`

**Checkpoint**: All user stories deliver independently testable functionality.

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T047 Refresh README and quickstart with final commands in `specs/001-track-reading/quickstart.md`
- [ ] T048 [P] Harden performance (pagination, caching hints) in `services/reading-journey/api/listReadingEntries.ts`
- [ ] T049 Audit observability (structured logs, metrics) in `services/reading-journey/api/_middleware/logging.ts`
- [ ] T050 [P] Run security review checklist and document in `docs/security/reading-journey.md`
- [ ] T051 Validate analytics dashboards capture success criteria in `analytics/dashboards/reading-journey.json`
- [ ] T052 Final accessibility regression report stored at `docs/ux/reading-journey/a11y-report.md`
- [ ] T053 Cleanup TODOs/technical debt log in `docs/debt/reading-journey.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) must complete before Foundational (Phase 2).
- Foundational tasks block all user stories (Phases 3–5).
- User Story phases can proceed sequentially or in parallel once Foundational complete, but US1 is required for MVP.
- Polish phase depends on desired user stories reaching completion.

### User Story Dependencies

- User Story 1 (P1) → No dependency (baseline).
- User Story 2 (P2) → Depends on US1 for shared components/data.
- User Story 3 (P3) → Depends on US1 for list infrastructure; can proceed parallel with US2 after Foundational.

### Within Each User Story

- Author tests first (fail) before implementation.
- Data models and repositories before API handlers.
- API handlers before UI integration.
- UX validation and analytics instrumentation after functional components complete.

### Parallel Opportunities

- Setup tasks marked [P] T004–T005 can run concurrently.
- Contract/unit tests (T014–T016, T026–T028, T036–T038) can run in parallel per story.
- UI component builds (T020–T023, T031–T034, T041–T044) can be split across engineers after shared state resolved.

---

## Parallel Example: User Story 1

```bash
# Tests
Task: "T014 [P] [US1] Write Vitest unit tests for reading list state manager in web/tests/unit/features/reading-journey/state/readingListState.test.ts"
Task: "T015 [P] [US1] Implement contract tests for GET /readers/{readerId}/reading-entries in services/tests/contract/reading-journey/listReadingEntries.test.ts"

# Implementation
Task: "T020 [US1] Build UI status tabs and lists in web/src/features/reading-journey/pages/DashboardPage.ts"
Task: "T021 [US1] Implement add-book form component with validation in web/src/features/reading-journey/components/AddBookForm.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Deliver User Story 1 end-to-end (API + UI + analytics + a11y).
3. Validate with automated tests and UX sign-off.
4. Ship MVP with reading pipeline functionality.

### Incremental Delivery

1. MVP (US1) → deploy once stable.
2. Layer in progress tracking (US2) with independent release toggle.
3. Add ratings/reflections (US3) once prior stories validated.
4. Polish phase addresses performance, observability, and documentation across stories.

### Parallel Team Strategy

1. Team completes Phases 1–2 together.
2. Post-foundation, split by story:
   - Engineer A: US1 UI and state.
   - Engineer B: US1 API and data access.
   - Engineer C: US2 progress tracking components.
   - Engineer D: US3 ratings features.
3. Reconvene during Polish phase for cross-cutting validation.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable, fully tested, and UX validated
- Verify tests fail before implementing (red), pass after implementation (green), then refactor
- Commit after each task or logical group referencing spec/task IDs
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence, undocumented design deviations
