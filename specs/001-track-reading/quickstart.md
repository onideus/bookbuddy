# Quickstart – Reading Journey Tracker

**Feature**: Reading Journey Tracker
**Branch**: 001-track-reading
**Tech Stack**: Vite + Vanilla JS (frontend), Fastify + PostgreSQL (backend)

## Prerequisites

- **Node.js 20+** LTS (check: `node --version`)
- **npm 10+** (included with Node.js 20)
- **PostgreSQL 15+** (local instance or connection to remote database)
- **psql** CLI tool (for running migrations manually if needed)

## Setup Steps

### 1. Clone and Install Dependencies

```bash
# Clone repository (if not already done)
git clone <repository-url>
cd bookbuddy-mk2
git checkout 001-track-reading

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

**Dependencies installed** (see [research.md](./research.md) for rationale):
- Backend: `fastify`, `@fastify/cors`, `@fastify/session`, `@fastify/rate-limit`, `pg`, `pino`, `uuid`
- Frontend: `vite` (dev/build only, minimal runtime dependencies)
- Testing: `vitest`, `@testing-library/dom`, `playwright`

### 2. Configure Environment Variables

Create `.env` files for backend and frontend:

**Backend** (`backend/.env`):
```bash
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/bookbuddy_dev

# Server configuration
PORT=3000
NODE_ENV=development

# Session configuration
SESSION_SECRET=change-this-in-production-use-crypto-random-string

# Logging
LOG_LEVEL=info  # debug, info, warn, error

# Rate limiting (FR-019)
RATE_LIMIT_MAX=100  # Max book additions per hour
```

**Frontend** (`frontend/.env.local`):
```bash
# API base URL
VITE_API_URL=http://localhost:3000/api

# Development settings
VITE_LOG_LEVEL=debug
```

### 3. Create and Migrate Database

```bash
# Create database (one-time setup)
createdb bookbuddy_dev

# Run migrations from backend directory
cd backend
npm run migrate:up

# Or manually with psql
psql bookbuddy_dev < migrations/001_create_tables.sql
psql bookbuddy_dev < migrations/002_create_indexes.sql
psql bookbuddy_dev < migrations/003_create_sessions_table.sql
```

**Migration files** created based on [data-model.md](./data-model.md):
- `001_create_tables.sql` - books, reader_profiles, reading_entries, progress_updates, status_transitions
- `002_create_indexes.sql` - Performance indexes for queries
- `003_create_sessions_table.sql` - Session storage for authentication

### 4. Start Development Servers

**Terminal 1** (Backend):
```bash
cd backend
npm run dev
# Fastify server starts on http://localhost:3000
# API endpoints available at http://localhost:3000/api/*
```

**Terminal 2** (Frontend):
```bash
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
# Proxies /api requests to backend (configured in vite.config.js)
```

**Access the application**: http://localhost:5173

## Verification

### 1. Backend Unit Tests (QT-001: ≥90% coverage)
```bash
cd backend
npm run test
# Vitest runs all tests in backend/tests/unit/
# Coverage report generated to coverage/
```

### 2. Frontend Unit Tests
```bash
cd frontend
npm run test
# Vitest runs tests for vanilla JS components
```

### 3. Contract Tests (QT-002)
```bash
cd backend
npm run test:contract
# Validates API endpoints against OpenAPI spec in specs/001-track-reading/contracts/openapi.yaml
```

### 4. Integration Tests (User Story Critical Paths)
```bash
cd backend
npm run test:integration
# Tests P1 (add/move books), P2 (progress updates), P3 (rating flow)
```

### 5. E2E Tests with Playwright
```bash
cd frontend
npm run test:e2e
# Playwright tests for user journeys across all priorities
```

### 6. Accessibility Testing (QT-004, SC-004: WCAG 2.1 AA)
```bash
cd frontend
npm run test:a11y
# Playwright + axe-core checks for keyboard navigation, focus indicators, screen readers
```

### 7. Manual Smoke Test

1. **User Story 1 (P1)**: Add a book "The Invisible Library" as TO_READ, then move to READING
2. **User Story 2 (P2)**: Add a progress note "Finished Chapter 5" with page marker
3. **User Story 3 (P3)**: Move book to FINISHED, rate 4 stars, add reflection, verify "Top Rated" filter shows it

**Accessibility check**: Use VoiceOver (macOS) or NVDA (Windows) to navigate the dashboard and verify all controls are announced properly.

## Development Workflow (TDD - QT-006)

Following Red-Green-Refactor cycle:

1. **Write test first** (e.g., `backend/tests/unit/services/reading-service.test.js`)
2. **Run test** - should FAIL (red)
3. **Write minimum code** to make test pass
4. **Run test** - should PASS (green)
5. **Refactor** while keeping tests green
6. **Repeat** for next feature

## Troubleshooting

### Database Connection Fails
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -d bookbuddy_dev -c "SELECT 1;"

# Verify DATABASE_URL in backend/.env
```

### Migrations Not Applied
```bash
# Check migration status
psql bookbuddy_dev -c "SELECT * FROM schema_migrations;"

# Rollback and re-run
npm run migrate:down
npm run migrate:up
```

### Vite Proxy Errors (Cannot GET /api/...)
- Ensure backend is running on port 3000
- Check `frontend/vite.config.js` proxy configuration
- Verify `VITE_API_URL` in `frontend/.env.local`

### Session Cookie Not Set
- Check `SESSION_SECRET` is set in `backend/.env`
- Verify `sessions` table exists in database
- Check browser DevTools → Application → Cookies

## Next Steps

- See [tasks.md](./tasks.md) for implementation task breakdown (generated by `/speckit.tasks`)
- Review [plan.md](./plan.md) for architecture decisions
- Check [data-model.md](./data-model.md) for database schema details
- Reference [contracts/openapi.yaml](./contracts/openapi.yaml) for API specification
