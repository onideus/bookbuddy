# Implementation Plan: Reading Journey Tracker

**Branch**: `001-track-reading` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-track-reading/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

BookBuddy Reading Journey Tracker enables readers to organize books into three statuses (To Read, Reading, Finished), track reading progress with notes, and rate completed books. The application is built as a lightweight web application using Vite for development and build tooling, vanilla HTML/CSS/JavaScript for the frontend to minimize dependencies, and PostgreSQL for persistent data storage. The architecture prioritizes simplicity and maintainability while meeting WCAG 2.1 AA accessibility standards and sub-3-second response times for all user operations.

## Technical Context

**Language/Version**: JavaScript (ES2022+) for frontend and backend, Node.js 20+ LTS for server runtime
**Primary Dependencies**:
  - Frontend: Vite 5.x (dev server & build), minimal libraries (vanilla HTML/CSS/JS)
  - Backend: NEEDS CLARIFICATION (Node.js HTTP framework - Express/Fastify/native http)
  - Database: PostgreSQL 15+ with node-postgres (pg) driver

**Storage**: PostgreSQL 15+ (books, reading entries, progress updates, status history, reader profiles)
**Testing**: NEEDS CLARIFICATION (Vitest for consistency with Vite, or Jest, or native Node test runner)
**Target Platform**: Modern web browsers (Chrome/Firefox/Safari/Edge - ES2022 support), Node.js 20+ server on Linux/macOS
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <3s response time for UI operations (FR-014), 95% of progress updates appear within 3s (SC-002), pagination for 100+ books per list (FR-012)
**Constraints**:
  - Minimal frontend dependencies (vanilla JS, no React/Vue/Svelte)
  - Server-side pagination for lists >100 items
  - WCAG 2.1 AA accessibility compliance
  - Rate limiting: 100 book additions/hour per reader (FR-019)

**Scale/Scope**: Support up to 5,000 books per user (Principle IV), concurrent multi-device access with last-write-wins, session-based auth with RBAC

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with BookBuddy Constitution (v1.0.0):

- [x] **Code Quality**: Architecture promotes clarity, single responsibility, and minimal dependencies
  - ✅ Vanilla JS reduces external dependencies to Vite (build tool only)
  - ✅ Web application structure with clear frontend/backend separation
  - ✅ PostgreSQL provides stable, well-understood storage layer

- [x] **Testing Standards**: TDD approach planned (tests first, red-green-refactor cycle)
  - ✅ QT-006 mandates Red-Green-Refactor cycle
  - ✅ QT-001 requires ≥90% statement coverage
  - ✅ QT-002 requires contract tests (all API endpoints) and integration tests (each user story critical path)
  - ⚠️ Testing framework selection pending (research.md Phase 0)

- [x] **UX Consistency**: Design tokens and WCAG 2.1 AA accessibility requirements identified
  - ✅ FR-002, QT-004, SC-004 mandate WCAG 2.1 AA compliance
  - ✅ Spec requires keyboard navigation, focus indicators, screen reader support
  - ⚠️ Design tokens source location pending (research.md Phase 0)

- [x] **Performance**: Response time targets defined (<3s for user operations)
  - ✅ FR-014: <3s for all UI operations (up to 5,000 books)
  - ✅ FR-012: Pagination at 100 books per list
  - ✅ FR-013: Loading states and optimistic UI updates
  - ✅ SC-002: 95% of progress updates appear within 3s

- [x] **Observability**: Logging, monitoring, and debugging strategy outlined
  - ✅ FR-015: Structured logging (reader ID, book ID, operation type, timestamp)
  - ✅ FR-016: Analytics events for success criteria
  - ✅ FR-017: Correlation IDs in error responses
  - ⚠️ Logging library/strategy pending (research.md Phase 0)

**Gate Status**: ✅ PASS - Pending items are research tasks, not violations. No complexity justifications required.

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
│   ├── db/                  # Database connection, migrations, schema
│   ├── models/              # Data access layer (Book, ReadingEntry, ProgressUpdate, etc.)
│   ├── services/            # Business logic (reading service, auth service)
│   ├── api/                 # HTTP endpoints and request handlers
│   │   ├── routes/          # Route definitions
│   │   ├── middleware/      # Auth, logging, rate limiting
│   │   └── validators/      # Input validation and sanitization
│   ├── lib/                 # Shared utilities (logger, correlation IDs)
│   └── server.js            # Entry point
├── tests/
│   ├── contract/            # API contract tests (QT-002)
│   ├── integration/         # User story critical paths (QT-002)
│   └── unit/                # Business logic tests (QT-001)
├── migrations/              # PostgreSQL schema migrations
└── package.json

frontend/
├── src/
│   ├── pages/               # HTML page templates
│   │   ├── dashboard.html   # Main reading dashboard (P1)
│   │   ├── book-detail.html # Progress tracking view (P2)
│   │   └── index.html       # Landing/auth
│   ├── styles/              # CSS modules (design tokens, components, utilities)
│   │   ├── tokens.css       # Design tokens (colors, spacing, typography)
│   │   ├── base.css         # Reset, accessibility defaults
│   │   └── components.css   # Reusable UI components
│   ├── scripts/             # Vanilla JavaScript modules
│   │   ├── api/             # Backend API client
│   │   ├── components/      # UI component logic (book list, filters, ratings)
│   │   ├── services/        # Frontend services (state management, local storage)
│   │   └── utils/           # Helpers (date formatting, validation)
│   └── assets/              # Static assets (icons, images)
├── tests/
│   ├── integration/         # User flow tests (Playwright or similar)
│   └── unit/                # Component logic tests
├── vite.config.js           # Vite configuration
└── package.json

shared/                      # Shared contracts and types (if needed)
├── contracts/               # API contracts (OpenAPI specs from Phase 1)
└── constants.js             # Shared enums (TO_READ, READING, FINISHED)

docs/                        # Project documentation
├── architecture.md          # System design overview
└── api.md                   # API documentation (generated from contracts)
```

**Structure Decision**: Web application with frontend/backend separation. Frontend uses Vite for dev server and build, serving static HTML/CSS/JS with no framework dependencies. Backend is Node.js with PostgreSQL. Shared directory contains API contracts to ensure frontend/backend alignment. This structure supports independent testing per QT-002 (contract tests for API, integration tests for user flows).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity violations. Architecture adheres to BookBuddy Constitution with minimal dependencies and clear separation of concerns.
