# Feature Specification: Reading Journey Tracker

**Feature Branch**: `001-track-reading`  
**Created**: 2025-10-25  
**Status**: Draft  
**Input**: User description: "Build an application that can help me track the books that Ive read, am reading, and want to read, as well as my rating for the books that Ive read. As I read the books,"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organize Reading Pipeline (Priority: P1)

As a reader, I want to record books I plan to read, am currently reading, or have finished so that I can manage my reading backlog in one place.

**Why this priority**: Establishing a single source of truth for reading status unlocks the rest of the experience and enables tracking from the first login.

**Independent Test**: Populate a fresh account with sample titles, assign each to a status list, and verify each list renders with BookBuddy headings, tags, and focus states that meet WCAG 2.1 AA.

**Acceptance Scenarios**:

1. **Given** the reader opens the reading dashboard for the first time, **When** they add "The Invisible Library" with status "Want to Read", **Then** the title appears in the To Read list using the standard BookBuddy list styling with accessible labels announced by screen readers.
2. **Given** a book is in the To Read list, **When** the reader edits it to status "Reading", **Then** it moves to the In Progress section without duplication and the change is logged with the current date.
3. **Given** the dashboard contains multiple books, **When** the reader filters by status, **Then** only the selected status list is shown and the filter controls remain keyboard navigable with visible focus indicators.

---

### User Story 2 - Track Active Reading Progress (Priority: P2)

As a reader, I want to update progress notes while I read so that I can remember where I left off and why certain books matter to me.

**Why this priority**: Capturing in-progress insights keeps the application relevant during the longest phase of the reading journey and reduces context switching.

**Independent Test**: With an existing "Reading" book, record progress updates, verify they display in chronological order, and confirm assistive technologies announce update timestamps correctly.

**Acceptance Scenarios**:

1. **Given** a book is marked "Reading", **When** the reader records that they finished Chapter 5 with a short note, **Then** the entry shows the latest progress, timestamp, and note in the book detail view.
2. **Given** multiple progress updates exist, **When** the reader reviews the history, **Then** updates display newest first with relative time copy that follows BookBuddy tone guidelines.

---

### User Story 3 - Rate and Reflect on Completed Books (Priority: P3)

As a reader, I want to rate finished books and review my history so that I can recall favorites and share recommendations confidently.

**Why this priority**: Ratings close the loop on the journey, enabling future insights and supporting recommendations or sharing features later.

**Independent Test**: Mark a book as finished, assign a rating and note, confirm it appears in the Finished view with average rating summary, and ensure the experience meets contrast and keyboard requirements.

**Acceptance Scenarios**:

1. **Given** a book is marked "Finished" without a rating, **When** the reader selects a 4-star rating and adds a takeaway note, **Then** the book displays the rating, note, and completion date in the Finished list.
2. **Given** several finished books have ratings, **When** the reader filters for "Top Rated", **Then** books with ratings ≥4 display first and the filter summary announces the count via aria-live regions.

---

### Edge Cases

- Duplicate ISBN or title entries are attempted for the same status.
- A book is moved back from Finished to Reading (re-reads or abandoned books).
- Accessibility when a screen reader cycles through status tabs and action buttons.
- Visual consistency when a book lacks cover art or uses long titles across different viewport sizes.
- Data entry when the reader provides only partial metadata (e.g., title without author).
- Rating edits for books already reviewed, including clearing an existing rating.
- Large personal libraries exceeding 1,000 books in a single status list.
- Network disruption while saving a progress note or rating: auto-retry with exponential backoff (3 attempts), then manual retry.
- Concurrent edits from multiple devices: last-write-wins with notification when override occurs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow readers to add books with title, author, optional notes, and assign one of three statuses: `TO_READ`, `READING`, `FINISHED` (displayed as "To Read", "Reading", "Finished").
- **FR-002**: System MUST display each status as a distinct list using BookBuddy headings, badges, and focus states that satisfy WCAG 2.1 AA contrast ratios.
- **FR-003**: System MUST permit readers to transition a book between statuses and record the transition date and previous status.
- **FR-004**: System MUST capture progress updates (notes plus optional page/chapter indicator) for books marked Reading and display them in chronological order.
- **FR-005**: System MUST enable readers to rate finished books on a 1–5 scale and capture an optional reflection note.
- **FR-006**: System MUST prevent duplicate active entries for the same book and consolidate history when status changes occur.
- **FR-007**: System MUST provide filters for status and rating thresholds that can be operated via keyboard and touch.
- **FR-008**: System MUST surface error messaging consistent with BookBuddy copy guidelines when saves fail, including guidance to retry.
- **FR-009**: System MUST enforce reader-scoped authorization ensuring readers can only access, modify, or delete their own reading entries and progress data.
- **FR-010**: System MUST handle concurrent edits using last-write-wins strategy with timestamp comparison, notifying users when their changes override previous edits from another device.
- **FR-011**: System MUST implement auto-retry with exponential backoff (maximum 3 attempts) for failed save operations, then display error message with manual retry option if all attempts fail.
- **FR-012**: System MUST paginate reading lists when exceeding 100 books per status, with server-side filtering to maintain performance.
- **FR-013**: System MUST display loading states and optimistic UI updates for all async operations (status changes, ratings, progress notes) to provide immediate feedback.
- **FR-014**: System MUST maintain sub-3-second response times for all UI operations under realistic load conditions (up to 5,000 books per user library).
- **FR-015**: System MUST log all state transitions (status changes, ratings, progress updates) with structured context including reader ID, book ID, operation type, and timestamp.
- **FR-016**: System MUST emit analytics events for actions measuring success criteria (book additions, status transitions, ratings submitted) to enable data-driven validation.
- **FR-017**: Error responses MUST include correlation IDs and sufficient context for debugging without exposing sensitive user data.
- **FR-018**: System MUST validate and sanitize all user input server-side (book titles, author names, notes, ratings) to prevent injection attacks and ensure data integrity.
- **FR-019**: System MUST enforce rate limiting on API endpoints to prevent abuse (e.g., maximum 100 book additions per hour per reader).

### Key Entities *(include if feature involves data)*

- **Book**: Represents a distinct title with metadata used across statuses
  - `id` (UUID, primary key)
  - `title` (string, required, max 500 characters)
  - `author` (string, required, max 200 characters)
  - `edition` (string, optional, max 100 characters)
  - `isbn` (string, optional, validated format)
  - `coverImageUrl` (string, optional, validated URL)
  - Unique constraint: (title + author + edition)

- **Reading Entry**: Tracks a reader's relationship to a Book
  - `id` (UUID, primary key)
  - `readerId` (UUID, foreign key to Reader, required)
  - `bookId` (UUID, foreign key to Book, required)
  - `status` (enum: `TO_READ`, `READING`, `FINISHED`, required)
  - `rating` (integer, 1-5, optional, only for FINISHED status)
  - `reflectionNote` (text, optional, max 2000 characters)
  - `createdAt` (timestamp, required)
  - `updatedAt` (timestamp, required)
  - Unique constraint: (readerId + bookId + status)

- **Progress Update**: Captures in-progress reading notes
  - `id` (UUID, primary key)
  - `readingEntryId` (UUID, foreign key to Reading Entry, required)
  - `note` (text, required, max 1000 characters)
  - `pageOrChapter` (string, optional, max 50 characters, e.g., "Chapter 5", "Page 142")
  - `createdAt` (timestamp, required)

- **Status Transition History**: Tracks changes between statuses
  - `id` (UUID, primary key)
  - `readingEntryId` (UUID, foreign key to Reading Entry, required)
  - `fromStatus` (enum: `TO_READ`, `READING`, `FINISHED`, `null` for initial)
  - `toStatus` (enum: `TO_READ`, `READING`, `FINISHED`, required)
  - `transitionedAt` (timestamp, required)

- **Reader Profile**: Captures user-level preferences
  - `id` (UUID, primary key, matches authenticated user ID)
  - `defaultSort` (string, optional, e.g., "title_asc", "author_asc", "updated_desc")
  - `notificationPreferences` (JSON, optional)
  - `accessibilitySettings` (JSON, optional, e.g., high contrast, large text)

### Quality, Testing, and UX Standards *(mandatory)*

- **QT-001**: Automated unit tests MUST target ≥90% statement coverage for modules touched by this feature.
- **QT-002**: Contract tests REQUIRED for all API endpoints. Integration tests REQUIRED for each user story's critical path (P1: add/move books, P2: progress updates, P3: rating flow). Tests must be independent and reproducible without execution order dependencies.
- **QT-003**: Document updates REQUIRED for specs, changelog, and configuration impacted by this work.
- **QT-004**: UX validation MUST confirm adherence to BookBuddy design tokens and capture accessibility evidence (WCAG 2.1 AA).
- **QT-005**: Note any intentional technical debt, assign an owner, and include the planned remediation date (≤1 release cycle).
- **QT-006**: Test-driven development REQUIRED: tests written first, validated to fail, then implementation follows using Red-Green-Refactor cycle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of usability test participants can add a new book and assign a status in under 45 seconds without assistance.
- **SC-002**: 95% of progress updates appear in the interface within 3 seconds of submission during testing sessions.
- **SC-003**: 80% of finished books tracked during beta include a rating and reflection within 24 hours of completion.
- **SC-004**: Accessibility audit confirms 100% of interactive elements reach WCAG 2.1 AA for contrast, focus management, and screen reader announcements.

## Technical Debt *(if applicable)*

None anticipated at specification stage. Any debt incurred during implementation must be documented in plan.md with:
- Description of the debt and its rationale
- Owner assignment
- Remediation timeline (≤1 release cycle per BookBuddy Constitution)

## Assumptions

- Readers authenticate through existing BookBuddy session-based authentication with RBAC; this feature does not introduce new sign-in methods.
- Standard BookBuddy design tokens, typography, and copy guidelines are available for reuse in the reading dashboard.
- ISBN search or external catalog integrations are deferred; users manually enter book metadata for this release.

## Dependencies

- **BookBuddy Design System**: Access to shared component library for list layouts, badges, and accessible form controls. Location and documentation must be validated during planning phase (e.g., npm package, style guide URL, Figma library).
- **BookBuddy Design Tokens**: Typography, colors, spacing, and component styles. Source location (e.g., CSS variables, design tokens JSON) must be documented in implementation plan.
- **Analytics Events Pipeline**: Existing infrastructure to capture status transitions, progress updates, and rating submissions for measuring success criteria.
- Existing notification or reminder services are not in scope; any nudges for progress are future enhancements.

## Clarifications

### Session 2025-10-25

- Q: What constitutes a unique book entry when preventing duplicates? → A: Title + author + optional edition
- Q: What are the canonical status enum values for backend storage? → A: Use clean enum values (`TO_READ`, `READING`, `FINISHED`) with separate UI display labels ("To Read", "Reading", "Finished")
- Q: What authentication and authorization mechanism should be used? → A: Session-based authentication with role-based access control (RBAC)
- Q: How should concurrent edits (same reader, multiple devices) be handled? → A: Last-write-wins with timestamp comparison and user notification of override
- Q: How should network failures during save operations be handled? → A: Auto-retry with exponential backoff (3 attempts), then show error with manual retry option
- Q: Where are BookBuddy design system resources documented? → A: Document location in Dependencies section
