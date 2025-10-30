# Implementation Plan: Reading Goals Tracker

**Branch**: `003-reading-goals` | **Date**: 2025-10-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-reading-goals/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Reading Goals Tracker enables users to create time-bound reading challenges (e.g., "Read 10 books in 30 days") with automatic progress tracking and visual indicators. The system tracks goal state transitions (active/completed/expired), handles progress reversals when books are unmarked, displays bonus achievements for over-completion, and enforces timezone-aware deadline validation. This feature integrates with existing reading tracking while maintaining independent goal lifecycle management.

## Technical Context

**Language/Version**: JavaScript ES2022+, Node.js 20 LTS
**Primary Dependencies**: Fastify 4.x (web framework), pg 8.x (PostgreSQL client), vitest (testing)
**Storage**: PostgreSQL 15+ (existing: books, reading_entries, users; new: reading_goals, reading_goal_progress)
**Testing**: Vitest with ≥90% coverage (unit, integration, contract tests)
**Target Platform**: Linux/macOS server, containerized deployment (Docker)
**Project Type**: Web application (backend API + frontend client)
**Performance Goals**:
- Progress updates: <2 seconds after book status change
- Goal list retrieval: <3 seconds for up to 100 goals
- Transaction processing: <100ms for 50-goal batch updates
**Constraints**:
- Support 50 concurrent active goals per user without degradation
- Timezone-aware deadline calculations (IANA timezones)
- Transactional consistency for multi-goal updates
**Scale/Scope**:
- Personal library scale: up to 5,000 books per user
- Concurrent goals: up to 50 active per user
- Historical goals: unlimited retention

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with BookBuddy Constitution (v1.0.0):

- [x] **Code Quality**: Architecture promotes clarity (dedicated `GoalProgressService` for state machine), single responsibility (separate tables for goals and progress tracking), and minimal dependencies (leverages existing pg, Fastify stack)
- [x] **Testing Standards**: TDD approach planned (tests first for goal creation, progress tracking, state transitions; red-green-refactor cycle per user story priority)
- [x] **UX Consistency**: Design tokens required for progress bars, WCAG 2.1 AA accessibility (text percentage alongside visual indicator, keyboard navigation, screen reader labels)
- [x] **Performance**: Response time targets defined (<2s progress updates, <3s goal retrieval, <100ms transaction processing for 50 goals)
- [x] **Observability**: Structured logging for state transitions (active→completed→expired), goal operations (create/edit/delete), and progress events; error context includes user_id, goal_id, reading_entry_id for reproduction

**Complexity Justification**: No constitutional violations. Architecture uses denormalized counters (progress_count, bonus_count) for read performance, justified by the 50-concurrent-goal constraint and <2s update requirement. This trades slight write complexity for significant read speed gains, aligning with performance principle.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── ReadingGoal.js          # Goal entity model (NEW)
│   │   └── ReadingGoalProgress.js  # Goal-book association (NEW)
│   ├── services/
│   │   └── GoalProgressService.js  # State machine logic (NEW)
│   ├── api/
│   │   └── routes/
│   │       └── goals.js            # Goal CRUD endpoints (NEW)
│   └── db/
│       └── migrations/
│           └── 004-reading-goals.sql  # Schema migration (NEW)
└── tests/
    ├── unit/
    │   ├── models/ReadingGoal.test.js
    │   ├── models/ReadingGoalProgress.test.js
    │   └── services/GoalProgressService.test.js
    ├── integration/
    │   └── api/goals.test.js
    └── contract/
        └── goals-api.test.js

frontend/
├── src/
│   ├── components/
│   │   ├── GoalProgressBar.jsx     # Visual progress indicator (NEW)
│   │   ├── GoalCard.jsx            # Goal display card (NEW)
│   │   └── GoalForm.jsx            # Create/edit form (NEW)
│   ├── pages/
│   │   └── GoalsPage.jsx           # Goals list view (NEW)
│   └── services/
│       └── goalsApi.js             # API client (NEW)
└── tests/
    └── components/
        ├── GoalProgressBar.test.jsx
        ├── GoalCard.test.jsx
        └── GoalForm.test.jsx
```

**Structure Decision**: Web application structure with backend (Node.js/Fastify API) and frontend (React). New goal-related code follows existing patterns: models for data entities, services for business logic, API routes for endpoints. Frontend components use existing design system tokens for consistency.

## Complexity Tracking

No complexity violations. Architecture adheres to BookBuddy Constitution principles.
