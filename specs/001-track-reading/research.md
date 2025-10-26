# Reading Journey Tracker – Research

**Feature**: Reading Journey Tracker
**Date**: 2025-10-25
**Status**: Phase 0 - Technical Research Complete

This document resolves all "NEEDS CLARIFICATION" items from the Technical Context section of plan.md.

## Development Stack

- **Decision**: Build the reading dashboard using Vite 5 with the vanilla JavaScript template and progressive enhancement patterns.
  **Rationale**: Vite provides fast dev tooling and optimized builds while allowing us to stay close to native HTML/CSS/JS, matching the user requirement to minimize libraries.
  **Alternatives considered**: React/Vue frameworks (rejected due to added complexity), bundler-free ESBuild (lacked dev ergonomics).

- **Decision**: Use vanilla JavaScript (ES2022+) without TypeScript for runtime code.
  **Rationale**: Keeps build simple, aligns with "minimal dependencies" principle. JSDoc comments can provide basic type hints for IDE support without compilation overhead.
  **Alternatives considered**: Full TypeScript (adds build complexity), no type hints (weaker IDE support).

- **Decision**: **Fastify** for Node.js backend HTTP framework.
  **Rationale**: 30-40% faster than Express, native async/await, built-in JSON Schema validation for FR-018 (input validation), clean plugin system for middleware (auth, logging, rate limiting). Aligns with <3s response time requirement (FR-014).
  **Alternatives considered**: Express (slower, callback-based), native Node.js http (too low-level, reinventing middleware wheel), Hono (less proven ecosystem).

## Testing Strategy

- **Decision**: Use **Vitest** for unit and integration tests, **Playwright** for frontend E2E tests.
  **Rationale**: Vitest integrates with Vite (same config, instant HMR), supports TDD cycle (QT-006), built-in coverage for ≥90% requirement (QT-001). Playwright provides cross-browser E2E tests with excellent accessibility testing support for WCAG 2.1 AA validation.
  **Alternatives considered**: Jest (slower, CommonJS-focused), native Node test runner (no coverage), Cypress (heavier than Playwright).

- **Decision**: Testing Library DOM for component testing utilities.
  **Rationale**: Keeps focus on user interactions rather than implementation details, aligns with accessibility-first approach.
  **Alternatives considered**: Direct DOM manipulation in tests (brittle), no testing utilities (verbose test code).

## Storage & Data Access

- **Decision**: Persist reading entries in PostgreSQL 15+ using **node-postgres (pg)** driver.
  **Rationale**: PostgreSQL satisfies user requirement, supports transactional status changes, ACID guarantees for concurrent edits (FR-010), and mature ecosystem. Direct driver avoids ORM overhead (aligns with "minimal dependencies").
  **Alternatives considered**: SQLite (lacks multi-user concurrency), MongoDB (schema consistency risk, not requested), ORM like Prisma/TypeORM (added complexity, query abstraction).

- **Decision**: Use **plain SQL migration files** with simple runner (postgres-migrations npm package or DIY).
  **Rationale**: Plain SQL provides transparency (Constitution I "clarity first"), version control friendly, uses PostgreSQL features directly (constraints, triggers, indexes). Minimal dependency footprint.
  **Alternatives considered**: Knex.js (query builder overhead), TypeORM migrations (ORM lock-in), Sqitch (overkill for single database).

- **Decision**: Model `books`, `reading_entries`, `progress_updates`, `status_transitions`, `reader_profiles` tables with normalized relationships.
  **Rationale**: Normalization keeps book metadata deduplicated across readers, supports unique constraints (title + author + edition per FR-006), enables analytics (FR-016). Matches spec entity design.
  **Alternatives considered**: Embedding metadata in reading entries (duplication), denormalized JSONB (harder query optimization, weaker constraints).

## Performance & Scale

- **Decision**: Target <3s for all UI operations (FR-014), with 95% of progress updates appearing within 3s (SC-002).
  **Rationale**: Aligns with spec requirements and Constitution Principle IV. Fastify's performance + optimistic UI updates (FR-013) help achieve these targets.
  **Alternatives considered**: No explicit targets (risk of regressions), aggressive caching (premature optimization).

- **Decision**: Paginate lists at 100 books per status with server-side filtering (FR-012).
  **Rationale**: Prevents DOM bloat for large libraries (up to 5,000 books per user), reduces query load, improves perceived performance.
  **Implementation**: Use SQL LIMIT/OFFSET with cursor-based pagination for consistency during concurrent updates.
  **Alternatives considered**: 50-book pagination (too many requests for medium libraries), infinite scroll (accessibility challenges), load all at once (performance degradation at scale).

## UX & Accessibility

- **Decision**: Define **CSS Custom Properties** in `frontend/src/styles/tokens.css` for design tokens.
  **Rationale**: Native browser support (no preprocessor), single source of truth, theme-ready, accessible contrast ratios (WCAG 2.1 AA). Aligns with "minimal dependencies" and Constitution Principle III.
  **Alternatives considered**: Sass/Less variables (adds build step), Tailwind CSS (framework-heavy), design tokens JSON (needs build tooling).

- **Decision**: Use Playwright's accessibility testing features + manual WCAG 2.1 AA validation.
  **Rationale**: Automate axe-core checks for keyboard navigation, focus indicators, screen reader support. Required for Constitution compliance (Principle III) and success criterion SC-004 (100% WCAG compliance).
  **Alternatives considered**: Manual QA only (insufficient evidence, not repeatable), browser devtools audits (not in CI/CD).

## Observability & Logging

- **Decision**: Use **Pino** for structured logging (FR-015).
  **Rationale**: Fastest JSON logger for Node.js (minimizes overhead), structured output for parsing/querying, child loggers for request-scoped correlation IDs (FR-017), excellent Fastify integration (@fastify/pino-logger). Aligns with Constitution Principle V.
  **Alternatives considered**: Winston (slower, more config), Bunyan (unmaintained), console.log (no structure, no correlation IDs).

- **Decision**: Generate correlation IDs using **uuid v4** for all requests.
  **Rationale**: Enables request tracing across services, required for FR-017 (error debugging context). Standard format, no collisions.
  **Implementation**: Middleware generates ID, attaches to request context, included in all log entries and error responses.
  **Alternatives considered**: Sequential IDs (leaks request volume), timestamp-based (collision risk).

## Authentication & Authorization

- **Decision**: Use **@fastify/session** with PostgreSQL session store (connect-pg-simple adapter).
  **Rationale**: Spec assumes "session-based authentication with RBAC". Server-side storage (secure), supports FR-009 (reader-scoped auth), handles FR-010 (concurrent multi-device with last-write-wins). Reuses existing PostgreSQL (no additional infrastructure).
  **Alternatives considered**: JWT tokens (stateless but harder to revoke, complex for multi-device), Redis session store (adds infrastructure), in-memory sessions (lost on restart).

- **Decision**: Store session data in `sessions` table with TTL cleanup.
  **Implementation**: Session contains `{ readerId, role, createdAt, expiresAt }`. Cookie settings: `httpOnly: true, secure: true (prod), sameSite: 'lax'`. TTL: 7 days with sliding expiration.
  **Alternatives considered**: Fixed expiration (poor UX), very short sessions (constant re-auth).

## Input Validation & Rate Limiting

- **Decision**: Use **Fastify JSON Schema validation** for all API requests (FR-018).
  **Rationale**: Built-in to Fastify, validates before handler execution (fast rejection), schemas double as OpenAPI contract docs (Phase 1), provides runtime type safety even in JavaScript.
  **Alternatives considered**: Joi/Yup (external libraries, slower), Zod (TypeScript-first), manual validation (error-prone, violates DRY).

- **Decision**: Use **@fastify/rate-limit** plugin for FR-019 (100 book additions/hour per reader).
  **Rationale**: Native Fastify plugin, integrates with lifecycle, supports per-user limits (key by readerId from session), flexible storage (in-memory dev, PostgreSQL prod).
  **Implementation**: Configure per-endpoint (only mutations: POST, PUT, DELETE). Book creation: 100/hour, progress updates: 500/hour. Include rate limit headers (X-RateLimit-*).
  **Alternatives considered**: express-rate-limit (wrong framework), Redis-based (adds infrastructure), DIY middleware (reinventing wheel).

## Frontend Architecture

- **Decision**: Use **vanilla JavaScript classes with EventTarget** for state management (no framework).
  **Rationale**: User requirement "vanilla HTML, CSS, and JavaScript as much as possible". ES2022+ provides classes, modules, EventTarget for pub/sub. Minimal runtime, easy to understand/maintain, fast page loads.
  **Alternatives considered**: React/Vue/Svelte (violates constraint), Alpine.js (still a framework), direct DOM manipulation (brittle, hard to test).

- **Decision**: Configure Vite as **multi-page app (MPA)** with multiple HTML entry points.
  **Rationale**: Better accessibility than SPA (no client routing), Vite supports MPA natively, optimized bundles with code splitting per page.
  **Implementation**: Entry points: index.html (landing/auth), dashboard.html (main P1 feature), book-detail.html (P2 progress tracking).
  **Alternatives considered**: SPA with client routing (adds complexity, worse accessibility), separate Vite projects per page (unnecessary fragmentation).

## Summary of Technology Decisions

| Area | Technology | Rationale |
|------|------------|-----------|
| Frontend Build | Vite 5 (MPA mode) | Fast dev server, optimized builds, multi-page support |
| Frontend Language | Vanilla JavaScript (ES2022+) | Minimal dependencies, modern features, no framework |
| Backend Framework | Fastify | Performance, JSON Schema validation, plugin ecosystem |
| Database | PostgreSQL 15+ with node-postgres | User requirement, ACID guarantees, mature ecosystem |
| Migrations | Plain SQL files + postgres-migrations | Transparency, version control, minimal dependencies |
| Testing | Vitest + Playwright | Vite integration, TDD-friendly, accessibility testing |
| Logging | Pino | Fastest, structured, correlation IDs |
| Sessions | @fastify/session + PostgreSQL | Secure, RBAC-ready, multi-device support |
| Validation | Fastify JSON Schema | Built-in, fast, contract-driven |
| Rate Limiting | @fastify/rate-limit | Native plugin, per-user limits |
| Design Tokens | CSS Custom Properties | Native, maintainable, accessible |
| State Management | Vanilla JS + EventTarget | No framework, modern JS, simple |

## Constitution Alignment Verification

All decisions align with BookBuddy Constitution v1.0.0:

- ✅ **Code Quality (I)**: Minimal dependencies (only Vite, Fastify, and essential plugins), clear architecture (frontend/backend separation), no unnecessary abstraction
- ✅ **Testing (II)**: Vitest supports TDD Red-Green-Refactor cycle, ≥90% coverage achievable, contract tests via JSON Schema, integration tests via Playwright
- ✅ **UX Consistency (III)**: CSS Custom Properties for design tokens, Playwright accessibility testing, WCAG 2.1 AA compliance requirements
- ✅ **Performance (IV)**: Fastify performance, pagination strategy, optimistic UI updates, <3s response targets
- ✅ **Observability (V)**: Pino structured logging, correlation IDs, analytics events, health endpoints

## Next Steps

All "NEEDS CLARIFICATION" items resolved. Proceed to **Phase 1**:
1. Generate `data-model.md` from spec entities
2. Generate API contracts in `specs/001-track-reading/contracts/` directory
3. Generate `quickstart.md` for local development setup
4. Update agent context files with new technology decisions
