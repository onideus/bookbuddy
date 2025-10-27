# Changelog

All notable changes to the BookBuddy project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### User Story 2: Track Active Reading Progress - 2025-10-27

#### Added
- Book detail page with progress notes timeline (`frontend/src/pages/book-detail.html`)
- ProgressUpdate model for managing progress notes (`backend/src/models/progress-update.js`)
- Progress notes API endpoints:
  - POST `/api/reading-entries/:entryId/progress-notes` - Add progress note
  - GET `/api/reading-entries/:entryId/progress-notes` - List progress notes
- ProgressNotesList component with relative timestamps and auto-refresh (`frontend/src/scripts/components/progress-notes-list.js`)
- AddProgressNoteForm component with validation and character counter (`frontend/src/scripts/components/add-progress-note-form.js`)
- Progress notes API client (`frontend/src/scripts/api/progress-notes-api.js`)
- Comprehensive test coverage:
  - Backend unit tests for ProgressUpdate model
  - Backend contract tests for progress notes endpoints
  - Frontend E2E tests for book detail page flow
  - Accessibility tests for WCAG 2.1 AA compliance
  - Component unit tests for ProgressNotesList
- "Back to Dashboard" button on book detail page for improved navigation
- Analytics event logging for progress note additions (FR-016)
- Rate limiting for progress notes (500 notes/hour per FR-019)

#### Features
- Add progress notes (1-1000 characters) with optional page/chapter markers (max 50 chars)
- View progress notes in chronological timeline (newest first)
- Relative timestamp display ("2 minutes ago", "1 hour ago", etc.)
- Auto-updating timestamps every 30 seconds
- Optimistic UI updates for instant feedback (FR-013)
- Full keyboard navigation and screen reader support
- ARIA live regions for assistive technology announcements
- Empty state messaging when no notes exist
- Form validation with real-time character counting

#### Fixed
- Database connection error (SASL authentication) by properly loading .env configuration
- Null reference error in `getProgressNotes()` by using nested book object from ReadingEntry
- Navigation from dashboard to book detail page by adding click handlers
- Module import error in progress-notes-api.js by using individual function imports
- Book data display by correctly accessing nested book object structure

#### Technical
- ≥90% code coverage for all US2 modules
- WCAG 2.1 AA accessibility compliance verified
- All unit, integration, contract, and E2E tests passing
- Performance: <200ms API response times
- Input validation and sanitization on all endpoints (FR-018)

---

### User Story 1: Manage Reading Journey - 2025-10-25

#### Added
- Database schema with PostgreSQL 15+ support:
  - `readers` table for user management
  - `books` table with title, author, edition, ISBN
  - `reading_entries` table linking readers to books with status tracking
  - `status_transitions` table for change history
  - `progress_updates` table for reading notes (prepared for US2)
- Database migrations system with up/down support
- Backend API with Fastify:
  - POST `/api/readers/:readerId/reading-entries` - Add book to library
  - GET `/api/readers/:readerId/reading-entries` - List reading entries
  - PUT `/api/reading-entries/:entryId/status` - Update reading status
- Data models:
  - Book model with CRUD operations
  - ReadingEntry model with status management
  - StatusTransition model for audit trail
- ReadingService with business logic:
  - Add book with duplicate detection
  - Get reading entries with status filtering
  - Update status with transition tracking
  - Last-write-wins conflict resolution (FR-010)
- Frontend Multi-Page Application (MPA) with Vite:
  - Dashboard page with three-column status layout
  - BookList components for TO_READ, READING, FINISHED
  - AddBookForm component with validation
  - StatusFilter component with ARIA announcements
  - BookStore for client-side state management
- Comprehensive test suite:
  - Backend unit tests (models, services) with ≥90% coverage
  - Backend contract tests for API endpoints
  - Backend integration tests for user journeys
  - Frontend E2E tests with Playwright
  - Accessibility tests for WCAG 2.1 AA compliance

#### Features
- Add books to personal library with automatic duplicate detection
- Track reading status: TO_READ, READING, FINISHED
- Move books between status columns with drag-and-drop style interaction
- Filter books by status
- View reading history with status transitions
- Analytics event logging (FR-016)
- Optimistic UI updates for responsive feel (FR-013)
- Full keyboard navigation and screen reader support
- WCAG 2.1 AA accessibility compliance

#### Technical
- Node.js 20+ LTS runtime
- JavaScript ES2022+ throughout stack
- PostgreSQL 15+ with node-postgres driver
- Fastify web framework with JSON Schema validation
- Vite build tool for frontend
- Vitest for unit/integration testing
- Playwright for E2E testing
- axe-core for accessibility auditing
- Docker Compose for local development
- ESLint for code quality
- Rate limiting on mutation endpoints (FR-019)
- CORS configuration for local development
- Structured logging with correlation IDs

---

## Release Notes

### Version 0.2.0 - User Story 2 Complete

**Release Date**: 2025-10-27

This release adds the ability to track reading progress through notes and timestamps, completing User Story 2 of the reading tracker feature set.

**Key Features:**
- 📝 Add progress notes with optional page/chapter markers
- ⏰ Chronological timeline with relative timestamps
- ♿ Full accessibility support (WCAG 2.1 AA)
- ⚡ Optimistic UI updates for instant feedback
- 🧪 Comprehensive test coverage (≥90%)

**Upgrade Notes:**
- No breaking changes from v0.1.0
- Existing database schema supports new features
- Frontend assets must be rebuilt with `npm run build`

---

### Version 0.1.0 - User Story 1 Complete

**Release Date**: 2025-10-25

Initial release implementing core reading library management functionality.

**Key Features:**
- 📚 Personal reading library with status tracking
- 🔄 Smooth status transitions (TO_READ → READING → FINISHED)
- 🎯 Three-column dashboard layout
- ♿ Full keyboard navigation and screen reader support
- 🧪 Test-driven development with ≥90% coverage

---

## [0.0.0] - 2025-10-20

### Added
- Initial project setup
- Development environment configuration
- Documentation framework
