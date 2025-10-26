# BookBuddy Reading Journey Tracker

Track books you want to read, are reading, and have finished. Record progress notes and rate completed books.

## Project Status

**Branch**: `001-track-reading`  
**Phase**: Setup Complete  
**Next Steps**: Install dependencies, set up database, begin TDD implementation

## Quick Start

### Prerequisites

- **Node.js 20+ LTS** and **npm 10+**
- **Docker & Docker Compose** (recommended) OR **PostgreSQL 15+** (if running locally)

### 1. Start Database (Docker - Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker-compose ps

# Optional: Start pgAdmin for database management
docker-compose --profile tools up -d pgadmin
# Access at http://localhost:5050 (admin@bookbuddy.local / admin)
```

**Alternative: Local PostgreSQL**
```bash
# If you prefer local PostgreSQL installation
createdb bookbuddy_dev
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment

```bash
# Backend configuration
cd backend
cp .env.example .env
# For Docker: defaults in .env.example work out of the box
# For local PostgreSQL: update DATABASE_URL with your credentials

# Frontend configuration
cd ../frontend
cp .env.local.example .env.local
# Defaults should work (backend on http://localhost:3000)
```

### 4. Set Up Database Schema

```bash
# Run migrations (once migration files are created in Phase 2)
cd backend
npm run migrate:up
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Server starts on http://localhost:3000

# Terminal 2: Frontend
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
```

## Project Structure

```
bookbuddy-mk2/
├── backend/                 # Fastify API server
│   ├── src/
│   │   ├── db/             # Database connection & migrations
│   │   ├── models/         # Data access layer
│   │   ├── services/       # Business logic
│   │   ├── api/            # HTTP routes & middleware
│   │   └── lib/            # Shared utilities
│   ├── tests/              # Vitest tests (unit, integration, contract)
│   └── migrations/         # SQL migration files
│
├── frontend/                # Vite + Vanilla JS
│   ├── src/
│   │   ├── pages/          # HTML page templates
│   │   ├── styles/         # CSS (tokens, base, components)
│   │   ├── scripts/        # Vanilla JS modules
│   │   └── assets/         # Static assets
│   └── tests/              # Vitest + Playwright tests
│
├── shared/                  # Shared between frontend & backend
│   ├── contracts/          # OpenAPI spec
│   └── constants.js        # Status enums, validation limits
│
└── specs/                   # Feature specifications
    └── 001-track-reading/
        ├── spec.md         # Feature requirements
        ├── plan.md         # Technical plan
        ├── tasks.md        # Implementation tasks
        ├── data-model.md   # Database schema
        ├── research.md     # Technical decisions
        └── quickstart.md   # Setup guide
```

## Tech Stack

- **Frontend**: Vite 5 + Vanilla JavaScript (ES2022+)
- **Backend**: Fastify + Node.js 20+
- **Database**: PostgreSQL 15+ with node-postgres
- **Testing**: Vitest (unit/integration), Playwright (E2E/a11y)
- **Logging**: Pino (structured logging)
- **Sessions**: @fastify/session + PostgreSQL

## Development Workflow

Following **TDD (Test-Driven Development)**:
1. Write test first
2. Run test - verify it fails (RED)
3. Write minimum code to pass
4. Run test - verify it passes (GREEN)
5. Refactor while keeping tests green
6. Repeat

## Implementation Roadmap

See `specs/001-track-reading/tasks.md` for detailed task breakdown.

**Phase 1**: Setup ✅ (Complete)  
**Phase 2**: Foundational (Database, middleware, infrastructure)  
**Phase 3**: User Story 1 - Organize Reading Pipeline (MVP)  
**Phase 4**: User Story 2 - Track Reading Progress  
**Phase 5**: User Story 3 - Rate & Reflect  
**Phase 6**: Polish & Cross-Cutting Concerns

## Documentation

- **Feature Spec**: `specs/001-track-reading/spec.md`
- **Implementation Plan**: `specs/001-track-reading/plan.md`
- **Tasks**: `specs/001-track-reading/tasks.md`
- **Data Model**: `specs/001-track-reading/data-model.md`
- **API Contracts**: `shared/contracts/openapi.yaml`
- **Setup Guide**: `specs/001-track-reading/quickstart.md`

## Testing

```bash
# Backend tests
cd backend
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:contract     # API contract tests
npm run test:coverage     # With coverage report

# Frontend tests
cd frontend
npm run test              # Vitest unit tests
npm run test:e2e          # Playwright E2E tests
npm run test:a11y         # Accessibility tests
```

## License

ISC
