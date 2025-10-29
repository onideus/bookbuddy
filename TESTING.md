# Testing Guide

## Infrastructure Setup (COMPLETED ✅)

The testing infrastructure has been fixed and is ready to use:

1. ✅ **Test Environment Configuration** - `.env.test` file created
2. ✅ **Config Priority System** - Loads `.env.test` when `NODE_ENV=test`
3. ✅ **Package Scripts Updated** - All test scripts set `NODE_ENV=test`
4. ✅ **Docker Database Running** - PostgreSQL container started and verified
5. ✅ **Database Schema** - All migrations applied, tables exist

## Running Tests

### Prerequisites

1. **Start the PostgreSQL database** (if not already running):
   ```bash
   docker-compose up -d
   ```

2. **Verify the database is accessible**:
   ```bash
   docker exec bookbuddy-postgres psql -U bookbuddy -d bookbuddy_dev -c "\dt"
   ```

### Run All Tests

```bash
cd backend
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Contract/API tests only
npm run test:contract

# With coverage report
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Known Issues

### Sandbox Restrictions in Claude Code Environment

When running tests from within the Claude Code environment, you may encounter `EPERM` (permission denied) errors:

```
Error: connect EPERM ::1:5432
Error: connect EPERM 127.0.0.1:5432
```

**This is expected** - the Claude Code sandbox blocks network connections to localhost for security reasons.

**Solution**: Run tests directly in your terminal outside of Claude Code.

### Test Database Configuration

Tests use the same database as development (`bookbuddy_dev`) by default. For true isolation, you can:

1. Create a separate test database:
   ```bash
   docker exec bookbuddy-postgres createdb -U bookbuddy bookbuddy_test
   ```

2. Update `.env.test`:
   ```
   DATABASE_URL=postgresql://bookbuddy:bookbuddy_dev_password@localhost:5432/bookbuddy_test
   ```

3. Run migrations on the test database:
   ```bash
   DATABASE_URL=postgresql://bookbuddy:bookbuddy_dev_password@localhost:5432/bookbuddy_test npm run migrate:up
   ```

## Test Structure

```
backend/tests/
├── unit/              # Unit tests for models, services
├── integration/       # End-to-end user story tests
├── contract/          # API contract tests
└── helpers/           # Test utilities and data factories

frontend/tests/
├── unit/              # Component unit tests
└── integration/       # E2E tests with Playwright
```

## Test Coverage Goals

Per QT-001 requirement: **≥90% statement coverage** for all modules

Check coverage with:
```bash
npm run test:coverage
```

## TDD Workflow

Per QT-006 requirement, follow Red-Green-Refactor:

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make it pass
3. **Refactor**: Improve code while keeping tests green

## Common Test Commands

```bash
# Watch mode (re-run on file changes)
npm test -- --watch

# Run specific test file
npm test -- tests/unit/models/book.test.js

# Run tests matching pattern
npm test -- --grep "addBook"

# Verbose output
npm test -- --reporter=verbose
```

## Troubleshooting

### Database Connection Errors

```
Error: connect ECONNREFUSED
```

**Solution**: Start Docker database with `docker-compose up -d`

### Table Does Not Exist

```
Error: relation "books" does not exist
```

**Solution**: Run migrations with `npm run migrate:up`

### Tests Hang or Timeout

**Solution**: Check if database connections are properly closed. Increase timeout in `vitest.config.js` if needed.

### Permission Errors (EPERM)

**Solution**: Run tests outside of Claude Code environment in your regular terminal.
