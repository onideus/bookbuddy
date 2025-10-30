# Feature Specification: Reading Goals Tracker

**Feature Branch**: `003-reading-goals`
**Created**: 2025-10-30
**Status**: Draft
**Input**: User description: "Create a goal tracking component in the application that allows for users to create unique goals such as 'Read X books in X days' to try and push themselves. Tracking of books read can be done outside of these goals for any duration, but we want to be able to provide users with a simple loading bar indicating their progress for a goal that they've created"

## Clarifications

### Session 2025-10-30

- Q: What happens if a user marks a book as read, then later unmarks it - does this reduce goal progress? → A: Reducing progress is allowed; book unmarking decrements all affected goal counters
- Q: What happens when a user completes more books than their goal target (e.g., reads 15 books when goal was 10)? → A: Progress caps at 100% but displays "+5 bonus books" or similar indicator
- Q: If a completed goal's progress drops below 100% due to book unmarking, does the status change? → A: Goal reverts to "active" if completion date hasn't passed; if past deadline, it stays "completed"
- Q: How does the system handle timezone differences for goal deadline calculations? → A: End-of-day (23:59:59) in user's timezone
- Q: What happens if a user creates a goal with an end date in the past? → A: Reject with validation error; goals must have future deadline

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Track Reading Goal (Priority: P1)

A user wants to set a reading challenge for themselves to read a specific number of books within a timeframe (e.g., "Read 12 books in 90 days"). They create a goal, and as they complete books, the system automatically tracks their progress toward this goal with a visual progress indicator.

**Why this priority**: This is the core MVP functionality - without the ability to create goals and see progress, the feature has no value. This delivers immediate user value by allowing self-motivation through visual tracking.

**Independent Test**: Can be fully tested by creating a goal, marking books as read, and verifying the progress bar updates correctly. Delivers value as a standalone motivational tool even without additional features.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they create a new reading goal with target "10 books in 30 days", **Then** the goal is saved and displays with 0% progress
2. **Given** a user has an active goal to read 10 books, **When** they mark their 3rd book as finished, **Then** the progress bar shows 30% completion
3. **Given** a user has an active goal showing 30% (3/10 books), **When** they unmark one completed book, **Then** the progress bar decrements to 20% (2/10 books)
4. **Given** a user has completed 10 out of 10 books in their goal, **When** they view the goal, **Then** the progress bar shows 100% and displays a completion indicator
5. **Given** a user has completed 13 books on a 10-book goal, **When** they view the goal, **Then** the progress bar shows 100% with a "+3 bonus books" indicator
6. **Given** a user creates a 7-day goal on January 1st at 10:00 AM, **When** they view the deadline, **Then** it shows January 8th at 23:59:59 in their timezone
7. **Given** a user has a completed goal (10/10 books) with 5 days remaining before deadline, **When** they unmark one book, **Then** the goal status reverts to "active" showing 90% progress (9/10)
8. **Given** a user has a completed goal (10/10 books) that finished 5 days ago (past deadline), **When** they unmark one book, **Then** the goal remains "completed" but shows 9/10 books in history
9. **Given** a user attempts to create a goal with a timeframe that results in a past deadline, **When** they submit, **Then** they receive a validation error stating the deadline must be in the future
10. **Given** a user creates a goal with invalid data (e.g., 0 books or negative days), **When** they submit, **Then** they receive a validation error message

---

### User Story 2 - View Active and Past Goals (Priority: P2)

A user wants to see all their reading goals in one place - both currently active goals they're working toward and past goals they've completed or abandoned. This helps them track their reading habits over time and stay motivated.

**Why this priority**: Essential for ongoing engagement and reflection, but the feature can function without historical views initially. Enables users to manage multiple concurrent goals.

**Independent Test**: Can be tested by creating multiple goals (some active, some completed/expired) and verifying they display correctly in separate lists with accurate status indicators.

**Acceptance Scenarios**:

1. **Given** a user has 2 active goals and 3 completed goals, **When** they view their goals page, **Then** they see active goals listed separately from completed goals
2. **Given** a user has a goal that has passed its deadline without completion, **When** they view their goals, **Then** the expired goal is marked as "Not Achieved" with final progress shown
3. **Given** a user has no active goals, **When** they view their goals page, **Then** they see a message encouraging them to create their first goal

---

### User Story 3 - Edit and Delete Goals (Priority: P3)

A user realizes they set an unrealistic goal or made a mistake when creating it. They want to modify the goal parameters (extend deadline, adjust book count) or delete the goal entirely.

**Why this priority**: Nice-to-have for flexibility but not essential for MVP. Users can work around this by creating new goals if they make mistakes.

**Independent Test**: Can be tested by creating a goal, modifying its parameters, and verifying the changes persist correctly without affecting progress tracking.

**Acceptance Scenarios**:

1. **Given** a user has a goal to read 20 books in 60 days with 5 books completed, **When** they edit the goal to 15 books in 60 days, **Then** the progress updates to show 33% completion (5/15)
2. **Given** a user wants to remove a goal, **When** they delete it, **Then** it is removed from all goal lists and does not affect their overall reading history
3. **Given** a user tries to edit a completed goal, **When** they attempt changes, **Then** they receive a message that completed goals cannot be modified

---

### Edge Cases

- When a user exceeds their goal target (e.g., reads 15 books when goal was 10), progress bar caps at 100% but displays bonus indicator (e.g., "+5 bonus books")
- How does the system handle goals with very long timeframes (e.g., "Read 365 books in 365 days")?
- When a user unmarks a previously completed book, progress decrements across all affected goals immediately, and goal status reverts to "active" if the deadline hasn't passed
- When a completed goal's progress drops below 100% after the deadline has passed, the goal retains its "completed" status (historical record preserved)
- How are books counted toward multiple concurrent goals (e.g., user has 2 active goals and finishes 1 book)?
- System rejects goal creation if calculated deadline would be in the past; validation requires future deadline
- Goal deadlines are calculated as end-of-day (23:59:59) in the user's timezone, giving users the full final day to complete their goal

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to create reading goals with a specified target number of books and a timeframe in days
- **FR-001a**: System MUST calculate goal deadlines as end-of-day (23:59:59) in the user's timezone based on the timeframe
- **FR-002**: System MUST validate goal inputs to ensure book count is positive and timeframe is at least 1 day
- **FR-002a**: System MUST reject goal creation if the calculated deadline (current time + timeframe) would result in a past timestamp
- **FR-003**: System MUST automatically track progress toward active goals when users mark books as read/finished
- **FR-004**: System MUST display a visual progress indicator (loading bar/progress bar) showing completion percentage for each goal
- **FR-005**: System MUST calculate progress as (books_completed / target_books) × 100, capping display at 100%
- **FR-005a**: System MUST display a bonus indicator (e.g., "+N books") when books_completed exceeds target_books
- **FR-006**: System MUST allow users to view a list of all their goals, both active and completed
- **FR-007**: System MUST distinguish between active goals, completed goals, and expired/failed goals
- **FR-008**: System MUST mark a goal as "completed" when the user reaches or exceeds the target book count before the deadline
- **FR-009**: System MUST mark a goal as "expired" when the deadline passes without reaching the target
- **FR-010**: System MUST allow users to track books read outside of any specific goal (reading tracking is independent of goals)
- **FR-011**: System MUST count a single book toward all active goals simultaneously when marked as read
- **FR-011a**: System MUST decrement progress for all affected goals when a user unmarks a previously completed book
- **FR-011b**: System MUST revert a completed goal's status to "active" when progress drops below 100% and the deadline has not yet passed
- **FR-011c**: System MUST preserve "completed" status when progress drops below 100% after the deadline has passed
- **FR-012**: System MUST persist goal data including creation date, deadline, target count, current progress, and status
- **FR-013**: System MUST allow users to edit goal parameters (book count, deadline) for active goals only
- **FR-014**: System MUST allow users to delete goals at any time
- **FR-015**: System MUST recalculate progress percentages immediately when goal parameters are edited

### Key Entities

- **Reading Goal**: Represents a user's self-imposed challenge with attributes including: goal name/description, target book count, start date, end date, current progress count, status (active/completed/expired), associated user
- **Reading Progress Entry**: Represents completion of a book with attributes including: book reference, completion date, associated user, whether it counts toward any active goals
- **User**: The authenticated person creating and tracking goals

### Quality, Testing, and UX Standards *(mandatory)*

- **QT-001**: Automated unit tests MUST target ≥90% statement coverage for goal creation, progress tracking, and status calculation logic.
- **QT-002**: Integration tests MUST verify goal progress updates correctly when reading entries are created/modified/deleted.
- **QT-003**: Contract tests MUST validate API endpoints for goal CRUD operations and progress calculations.
- **QT-004**: UX validation MUST confirm progress bars are visually clear, accessible (WCAG 2.1 AA), and include text percentage alongside visual indicator.
- **QT-005**: Documentation MUST include API specifications for goal endpoints, data models, and examples of progress calculation edge cases.
- **QT-006**: Performance testing MUST verify goal list retrieval and progress calculations complete within 500ms for users with up to 100 goals.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a reading goal in under 30 seconds from the goals page
- **SC-002**: Progress bars update within 2 seconds of a user marking a book as read
- **SC-003**: 90% of users successfully create their first reading goal without encountering errors or confusion
- **SC-004**: Goal status calculations (active/completed/expired) are accurate in 100% of test scenarios
- **SC-005**: Users can view their complete goal history (all active and past goals) in under 3 seconds
- **SC-006**: System correctly handles users with up to 50 concurrent active goals without performance degradation
- **SC-007**: Progress percentage calculations are accurate to within 1% for all goal types
