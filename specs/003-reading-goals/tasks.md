# Tasks: Reading Goals Tracker

**Input**: Design documents from `/specs/003-reading-goals/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/goals-api.yaml

**Tests**: TDD approach required per QT-001 (≥90% coverage) - Tests are written FIRST and verified to FAIL before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- Follows web application structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database foundation

- [ ] T001 Install Luxon date/time library dependency in backend/package.json
- [ ] T002 [P] Create database migration file backend/src/db/migrations/004-reading-goals.sql
- [ ] T003 [P] Copy ReadingGoal model skeleton to backend/src/models/ReadingGoal.js
- [ ] T004 [P] Copy ReadingGoalProgress model skeleton to backend/src/models/ReadingGoalProgress.js

**Checkpoint**: Dependencies installed, migration file created, model files scaffolded

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core infrastructure - MUST complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Run database migration to create reading_goals and reading_goal_progress tables
- [ ] T006 Verify tables created with correct indexes using psql
- [ ] T007 Create GoalProgressService skeleton in backend/src/services/GoalProgressService.js
- [ ] T008 Register goals API routes in backend/src/server.js
- [ ] T009 Create goals API client skeleton in frontend/src/services/goalsApi.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Track Reading Goal (Priority: P1) 🎯 MVP

**Goal**: Users can create time-bound reading goals and see automatic progress updates as they mark books complete

**Independent Test**: Create a goal "Read 10 books in 30 days", mark 3 books as read, verify progress shows 30% with visual indicator

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Write unit test for ReadingGoal.validate() in backend/tests/unit/models/ReadingGoal.test.js
- [ ] T011 [P] [US1] Write unit test for ReadingGoal.progressPercentage in backend/tests/unit/models/ReadingGoal.test.js
- [ ] T012 [P] [US1] Write unit test for GoalProgressService.onBookCompleted() in backend/tests/unit/services/GoalProgressService.test.js
- [ ] T013 [P] [US1] Write contract test for POST /api/goals in backend/tests/contract/goals-api.test.js
- [ ] T014 [P] [US1] Write contract test for GET /api/goals/:goalId in backend/tests/contract/goals-api.test.js
- [ ] T015 [P] [US1] Write integration test for goal creation + book marking flow in backend/tests/integration/goals-progress.test.js

**Verify**: Run tests - all should FAIL (red phase of TDD)

### Implementation for User Story 1

#### Backend - Models

- [ ] T016 [P] [US1] Implement ReadingGoal.validate() method in backend/src/models/ReadingGoal.js
- [ ] T017 [P] [US1] Implement ReadingGoal computed properties (progressPercentage, isCompleted, hasBonus) in backend/src/models/ReadingGoal.js
- [ ] T018 [P] [US1] Implement ReadingGoal.toJSON() serialization in backend/src/models/ReadingGoal.js
- [ ] T019 [P] [US1] Implement ReadingGoalProgress constructor and toJSON() in backend/src/models/ReadingGoalProgress.js

**Verify**: Run model tests - should PASS (green phase)

#### Backend - Service Layer

- [ ] T020 [US1] Implement GoalProgressService.onBookCompleted() with transaction logic in backend/src/services/GoalProgressService.js
- [ ] T021 [US1] Implement GoalProgressService.onBookUncompleted() with reversal logic in backend/src/services/GoalProgressService.js
- [ ] T022 [US1] Add state transition logic (active→completed) in GoalProgressService in backend/src/services/GoalProgressService.js
- [ ] T023 [US1] Add bonus count calculation when progress exceeds target in backend/src/services/GoalProgressService.js

**Verify**: Run service tests - should PASS (green phase)

#### Backend - API Routes

- [ ] T024 [US1] Implement POST /api/goals endpoint with timezone calculation in backend/src/api/routes/goals.js
- [ ] T025 [US1] Implement GET /api/goals/:goalId endpoint with progress details in backend/src/api/routes/goals.js
- [ ] T026 [US1] Add deadline validation (reject past deadlines) in POST /api/goals in backend/src/api/routes/goals.js
- [ ] T027 [US1] Add input validation (positive count, min 1 day) in POST /api/goals in backend/src/api/routes/goals.js

**Verify**: Run contract tests - should PASS (green phase)

#### Backend - Integration with Reading Tracking

- [ ] T028 [US1] Hook into reading entry completion event to trigger GoalProgressService.onBookCompleted() in backend/src/api/routes/reading-entries.js
- [ ] T029 [US1] Hook into reading entry uncompletion event to trigger GoalProgressService.onBookUncompleted() in backend/src/api/routes/reading-entries.js

**Verify**: Run integration tests - should PASS (green phase)

#### Frontend - Components

- [ ] T030 [P] [US1] Implement GoalProgressBar component with progress percentage and bonus indicator in frontend/src/components/GoalProgressBar.jsx
- [ ] T031 [P] [US1] Add WCAG 2.1 AA accessibility (role="progressbar", aria-valuenow) to GoalProgressBar in frontend/src/components/GoalProgressBar.jsx
- [ ] T032 [P] [US1] Create GoalProgressBar.css with design tokens for progress bar styling in frontend/src/components/GoalProgressBar.css
- [ ] T033 [P] [US1] Implement GoalForm component for goal creation in frontend/src/components/GoalForm.jsx
- [ ] T034 [US1] Add form validation (required fields, positive numbers) to GoalForm in frontend/src/components/GoalForm.jsx
- [ ] T035 [US1] Implement GoalCard component to display single goal with progress bar in frontend/src/components/GoalCard.jsx

#### Frontend - API Integration

- [ ] T036 [US1] Implement goalsApi.create() method in frontend/src/services/goalsApi.js
- [ ] T037 [US1] Implement goalsApi.get() method in frontend/src/services/goalsApi.js
- [ ] T038 [US1] Add error handling for API failures in goalsApi in frontend/src/services/goalsApi.js

#### Frontend - Tests

- [ ] T039 [P] [US1] Write unit test for GoalProgressBar rendering in frontend/tests/components/GoalProgressBar.test.jsx
- [ ] T040 [P] [US1] Write unit test for GoalProgressBar bonus display in frontend/tests/components/GoalProgressBar.test.jsx
- [ ] T041 [P] [US1] Write unit test for GoalForm validation in frontend/tests/components/GoalForm.test.jsx

**Verify**: Run frontend tests - should PASS

#### Refactor & Polish for US1

- [ ] T042 [US1] Add structured logging for goal creation and progress updates in backend/src/services/GoalProgressService.js
- [ ] T043 [US1] Add error context (user_id, goal_id, reading_entry_id) to error logs in backend/src/services/GoalProgressService.js
- [ ] T044 [US1] Refactor GoalProgressService if needed to maintain <20 lines per method

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can create goals and see automatic progress tracking.

---

## Phase 4: User Story 2 - View Active and Past Goals (Priority: P2)

**Goal**: Users can view all their goals (active, completed, expired) in organized lists with status indicators

**Independent Test**: Create 2 active goals and 3 completed goals, verify goals page shows them in separate sections with correct status labels

### Tests for User Story 2

- [ ] T045 [P] [US2] Write contract test for GET /api/goals with filtering in backend/tests/contract/goals-api.test.js
- [ ] T046 [P] [US2] Write integration test for goal list pagination in backend/tests/integration/goals-list.test.js
- [ ] T047 [P] [US2] Write unit test for goal status computation (expired detection) in backend/tests/unit/services/GoalProgressService.test.js

**Verify**: Run tests - all should FAIL (red phase)

### Implementation for User Story 2

#### Backend - API Routes

- [ ] T048 [US2] Implement GET /api/goals endpoint with status filtering in backend/src/api/routes/goals.js
- [ ] T049 [US2] Add pagination support (limit, offset) to GET /api/goals in backend/src/api/routes/goals.js
- [ ] T050 [US2] Implement query-time expired status detection in GET /api/goals in backend/src/api/routes/goals.js
- [ ] T051 [US2] Add goal list sorting (active first, then by deadline) in GET /api/goals in backend/src/api/routes/goals.js

**Verify**: Run contract tests - should PASS

#### Backend - Scheduled Job

- [ ] T052 [US2] Implement GoalProgressService.expireOverdueGoals() method in backend/src/services/GoalProgressService.js
- [ ] T053 [US2] Create scheduled job script backend/src/jobs/expire-goals.js to run hourly
- [ ] T054 [US2] Add job configuration to backend/package.json or deployment manifest

**Verify**: Test scheduled job manually - verify it marks expired goals

#### Frontend - Pages & Components

- [ ] T055 [US2] Create GoalsPage component with active/completed/expired sections in frontend/src/pages/GoalsPage.jsx
- [ ] T056 [US2] Implement goalsApi.list() method with filtering in frontend/src/services/goalsApi.js
- [ ] T057 [US2] Add empty state message ("No active goals - create your first!") to GoalsPage in frontend/src/pages/GoalsPage.jsx
- [ ] T058 [US2] Implement goal status badges (active/completed/expired) in GoalCard in frontend/src/components/GoalCard.jsx
- [ ] T059 [US2] Add pagination controls to GoalsPage if needed in frontend/src/pages/GoalsPage.jsx

#### Frontend - Tests

- [ ] T060 [P] [US2] Write unit test for GoalsPage rendering multiple goals in frontend/tests/pages/GoalsPage.test.jsx
- [ ] T061 [P] [US2] Write unit test for GoalsPage empty state in frontend/tests/pages/GoalsPage.test.jsx

**Verify**: Run frontend tests - should PASS

#### Polish for US2

- [ ] T062 [US2] Add loading states to GoalsPage while fetching goals in frontend/src/pages/GoalsPage.jsx
- [ ] T063 [US2] Add error handling UI for failed goal list retrieval in frontend/src/pages/GoalsPage.jsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can create goals, track progress, and view all goals organized by status.

---

## Phase 5: User Story 3 - Edit and Delete Goals (Priority: P3)

**Goal**: Users can modify active goal parameters (target count, deadline) or permanently delete goals

**Independent Test**: Create a goal "20 books in 60 days" with 5 books completed, edit to "15 books in 60 days", verify progress updates to 33% (5/15)

### Tests for User Story 3

- [ ] T064 [P] [US3] Write contract test for PATCH /api/goals/:goalId in backend/tests/contract/goals-api.test.js
- [ ] T065 [P] [US3] Write contract test for DELETE /api/goals/:goalId in backend/tests/contract/goals-api.test.js
- [ ] T066 [P] [US3] Write integration test for editing completed goal (should reject) in backend/tests/integration/goals-edit.test.js
- [ ] T067 [P] [US3] Write unit test for progress recalculation after target change in backend/tests/unit/models/ReadingGoal.test.js

**Verify**: Run tests - all should FAIL (red phase)

### Implementation for User Story 3

#### Backend - API Routes

- [ ] T068 [US3] Implement PATCH /api/goals/:goalId endpoint with edit restrictions in backend/src/api/routes/goals.js
- [ ] T069 [US3] Add validation to reject editing completed/expired goals in PATCH /api/goals/:goalId in backend/src/api/routes/goals.js
- [ ] T070 [US3] Implement target count update with automatic progress recalculation in PATCH /api/goals/:goalId in backend/src/api/routes/goals.js
- [ ] T071 [US3] Implement deadline extension (daysToAdd parameter) in PATCH /api/goals/:goalId in backend/src/api/routes/goals.js
- [ ] T072 [US3] Implement DELETE /api/goals/:goalId endpoint with CASCADE cleanup in backend/src/api/routes/goals.js

**Verify**: Run contract tests - should PASS

#### Frontend - Components & UI

- [ ] T073 [US3] Add edit button to GoalCard (only for active goals) in frontend/src/components/GoalCard.jsx
- [ ] T074 [US3] Add delete button to GoalCard (all goals) with confirmation modal in frontend/src/components/GoalCard.jsx
- [ ] T075 [US3] Update GoalForm to support edit mode (populate existing values) in frontend/src/components/GoalForm.jsx
- [ ] T076 [US3] Implement goalsApi.update() method in frontend/src/services/goalsApi.js
- [ ] T077 [US3] Implement goalsApi.delete() method in frontend/src/services/goalsApi.js
- [ ] T078 [US3] Add error handling for edit rejection (completed goal) in GoalForm in frontend/src/components/GoalForm.jsx

#### Frontend - Tests

- [ ] T079 [P] [US3] Write unit test for GoalCard edit button visibility in frontend/tests/components/GoalCard.test.jsx
- [ ] T080 [P] [US3] Write unit test for GoalForm edit mode in frontend/tests/components/GoalForm.test.jsx

**Verify**: Run frontend tests - should PASS

#### Polish for US3

- [ ] T081 [US3] Add optimistic UI updates for delete (remove from list before API response) in frontend/src/pages/GoalsPage.jsx
- [ ] T082 [US3] Add success toast notifications for edit/delete operations in frontend/src/pages/GoalsPage.jsx

**Checkpoint**: All user stories should now be independently functional. Users have full CRUD control over their reading goals.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, observability, and documentation improvements

- [ ] T083 [P] Add performance logging for slow goal queries (>100ms) in backend/src/services/GoalProgressService.js
- [ ] T084 [P] Create API documentation from contracts/goals-api.yaml in specs/003-reading-goals/
- [ ] T085 [P] Add unit tests for ReadingGoalProgress model in backend/tests/unit/models/ReadingGoalProgress.test.js
- [ ] T086 Run full test suite and verify ≥90% coverage per QT-001 in backend/
- [ ] T087 Run performance test for 50-goal batch update (verify <100ms) in backend/tests/performance/
- [ ] T088 Test timezone edge cases (goal creation at midnight, different timezones) in backend/tests/integration/
- [ ] T089 [P] Add structured logging for state transitions (active→completed→expired) in backend/src/services/GoalProgressService.js
- [ ] T090 [P] Test accessibility with screen reader for GoalProgressBar in frontend/
- [ ] T091 Verify progress bar contrast meets WCAG 2.1 AA standards in frontend/src/components/GoalProgressBar.css
- [ ] T092 Run quickstart.md validation - verify all steps work end-to-end
- [ ] T093 Update CLAUDE.md with new technology (Luxon) if not already captured

**Checkpoint**: Feature complete, tested, documented, and ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - MVP**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Reuses US1 models/services but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Reuses US1 endpoints but independently testable

### Within Each User Story

1. Write tests FIRST (T010-T015 for US1) - Verify they FAIL
2. Implement models (T016-T019 for US1) - Verify model tests PASS
3. Implement services (T020-T023 for US1) - Verify service tests PASS
4. Implement API routes (T024-T027 for US1) - Verify contract tests PASS
5. Integrate with existing code (T028-T029 for US1) - Verify integration tests PASS
6. Implement frontend (T030-T041 for US1) - Verify component tests PASS
7. Refactor (T042-T044 for US1)

### Parallel Opportunities

#### Setup Phase (Phase 1)
- T001, T002, T003, T004 can all run in parallel

#### Foundational Phase (Phase 2)
- T005 must complete before T006
- T007, T008, T009 can run in parallel after T006

#### User Story 1 Tests
- T010, T011, T012, T013, T014, T015 can all run in parallel (write tests in parallel)

#### User Story 1 Models
- T016, T017, T018, T019 can run in parallel (different model files)

#### User Story 1 Frontend Components
- T030, T031, T032, T033, T035 can run in parallel (different component files)
- T034 depends on T033 (same file)

#### User Story 1 Frontend Tests
- T039, T040, T041 can run in parallel (different test files)

#### User Story 2 Tests
- T045, T046, T047 can run in parallel

#### User Story 3 Tests
- T064, T065, T066, T067 can run in parallel

#### Polish Phase
- T083, T084, T085, T089, T090 can run in parallel (different concerns)

### Cross-Story Parallelization

**If multiple developers available:**
- After Foundational phase completes:
  - Developer A: Complete all of User Story 1 (T010-T044)
  - Developer B: Complete all of User Story 2 (T045-T063)
  - Developer C: Complete all of User Story 3 (T064-T082)
- Stories integrate independently without blocking each other

---

## Parallel Example: User Story 1

```bash
# Launch all tests together (red phase):
Task T010: "Write unit test for ReadingGoal.validate()"
Task T011: "Write unit test for ReadingGoal.progressPercentage"
Task T012: "Write unit test for GoalProgressService.onBookCompleted()"
Task T013: "Write contract test for POST /api/goals"
Task T014: "Write contract test for GET /api/goals/:goalId"
Task T015: "Write integration test for goal creation + book marking flow"

# Launch all model implementations together (green phase):
Task T016: "Implement ReadingGoal.validate() method"
Task T017: "Implement ReadingGoal computed properties"
Task T018: "Implement ReadingGoal.toJSON() serialization"
Task T019: "Implement ReadingGoalProgress constructor and toJSON()"

# Launch frontend components together:
Task T030: "Implement GoalProgressBar component"
Task T031: "Add WCAG 2.1 AA accessibility to GoalProgressBar"
Task T032: "Create GoalProgressBar.css with design tokens"
Task T033: "Implement GoalForm component for goal creation"
Task T035: "Implement GoalCard component to display single goal"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → T001-T004
2. Complete Phase 2: Foundational → T005-T009 (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 → T010-T044
4. **STOP and VALIDATE**: Test goal creation and progress tracking independently
5. Deploy/demo if ready

**Estimated effort**: ~3-5 days for MVP (single developer)

### Incremental Delivery

1. Complete Setup + Foundational → T001-T009 → Foundation ready
2. Add User Story 1 → T010-T044 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → T045-T063 → Test independently → Deploy/Demo
4. Add User Story 3 → T064-T082 → Test independently → Deploy/Demo
5. Polish → T083-T093 → Final release

Each story adds value without breaking previous stories.

### Parallel Team Strategy (Multi-Agent Overseer Mode)

As **Overseer**, coordinate:

1. **Foundation Together**: All implementors collaborate on Phase 1-2 (T001-T009)
2. **Once Foundational Done**:
   - **Implementor-A (Data Layer)**: T010-T019, T085 (models, model tests)
   - **Implementor-B (API Layer)**: T020-T029, T048-T054, T068-T072 (services, routes)
   - **Implementor-C (UI Layer)**: T030-T044, T055-T063, T073-T082 (frontend components)
3. **Integration**: Overseer runs integration tests (T015, T046, T066) after component PRs merged
4. **Polish**: All contributors tackle Phase 6 (T083-T093) together

**Branch Strategy** (from CLAUDE.md):
```
main
  └─ 003-reading-goals (overseer integration branch)
      ├─ 003-reading-goals/impl-data   (Implementor-A tasks)
      ├─ 003-reading-goals/impl-api    (Implementor-B tasks)
      └─ 003-reading-goals/impl-ui     (Implementor-C tasks)
```

---

## Task Summary

**Total Tasks**: 93
- Setup: 4 tasks
- Foundational: 5 tasks
- User Story 1 (P1 - MVP): 35 tasks
- User Story 2 (P2): 19 tasks
- User Story 3 (P3): 19 tasks
- Polish: 11 tasks

**Parallel Opportunities**: 41 tasks marked [P]
- Within US1: 15 parallelizable tasks
- Within US2: 7 parallelizable tasks
- Within US3: 8 parallelizable tasks
- Polish phase: 5 parallelizable tasks

**Test Tasks**: 28 (30% of total) - TDD approach per QT-001

**Independent Test Criteria**:
- **US1**: Create goal, mark books, see progress update → Core value delivered
- **US2**: View goals organized by status → Adds organization without breaking US1
- **US3**: Edit/delete goals → Adds flexibility without breaking US1/US2

**MVP Scope**: User Story 1 only (Tasks T001-T044) delivers core value

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests FAIL (red) before implementing (TDD cycle)
- Verify tests PASS (green) after implementing each group
- Refactor after tests pass (TDD refactor phase)
- Commit after each logical group or completed task
- Stop at any checkpoint to validate story independently
- ≥90% test coverage required per QT-001
- Performance targets: <2s updates, <3s retrieval, <100ms transactions
