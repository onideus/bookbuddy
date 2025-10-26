# Quickstart – Reading Journey Tracker

## Prerequisites

- Node.js 20.x and pnpm 9.x (aligns with BookBuddy tooling)
- PostgreSQL 15 access to the shared BookBuddy cluster (read/write to `reading_journey` schema)
- Environment variables loaded via `.env.local` (see Setup)

## Setup Steps

1. **Install dependencies**
   ```bash
   cd web
   pnpm install
   ```
   The project uses the Vite vanilla template with minimal additional packages.

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Populate frontend `.env.local` with:
   - `VITE_DEMO_READER_ID` → UUID used for mock/demo data in dev
   - `VITE_USE_MOCKS` → keep `true` to use in-memory API; set to `false` when backend is ready

   Backend secrets (`DATABASE_URL`, `ANALYTICS_API_KEY`, feature toggles) remain in the repository-level `.env.local` (see `docs/env/reading-journey.md`).

3. **Apply database migrations**
   ```bash
   pnpm db:migrate
   ```
   Ensures tables `book`, `reading_entry`, `progress_note`, and materialized views are present. When running the UI with mocks (`VITE_USE_MOCKS=true`) this step can be skipped.

4. **Seed design tokens (optional)**
   ```bash
   pnpm tokens:sync
   ```
   Pulls latest BookBuddy design tokens to guarantee UI consistency.

5. **Start development servers**
   ```bash
   pnpm dev
   ```
   - Vite serves the web UI at `http://localhost:5173`
   - With mocks enabled the UI runs fully client-side. When pointing to a live backend, start the BookBuddy API (`pnpm api:dev`) so `/api` proxy requests succeed.

## Verification

1. **Run unit and integration tests**
   ```bash
   pnpm test
   ```
   Fails if red-green-refactor requirements unmet or coverage <90%.

2. **Execute contract tests**
   ```bash
   pnpm test:contract
   ```
   Validates OpenAPI specification alignment for reading journey endpoints.

3. **Perform accessibility regression**
   ```bash
   pnpm test:a11y
   ```
   Launches Playwright with axe-core checks for WCAG 2.1 AA.

4. **Manual UX spot check**
   - Add books across all three statuses
   - Record progress note with screen reader enabled
   - Rate a finished book and confirm “Top Rated” filter updates

## Deployment Checklist

- CI pipelines (lint, format, unit, integration, accessibility) green
- Database migrations applied in staging and production
- Analytics events validated in staging dashboards
- UX sign-off recorded with evidence of WCAG compliance
