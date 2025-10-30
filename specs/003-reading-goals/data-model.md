# Data Model: Reading Goals Tracker

**Date**: 2025-10-30
**Spec**: [spec.md](spec.md)
**Research**: [research.md](research.md)

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │
│ email           │
│ timezone        │◄───────────┐
└─────────────────┘            │
                               │
                               │
┌─────────────────────────────┐│
│     reading_goals           ││
│─────────────────────────────││
│ id (PK)                     ││
│ user_id (FK) ───────────────┘
│ name                        │
│ target_count                │
│ progress_count              │
│ bonus_count                 │
│ status                      │
│ deadline_at_utc             │
│ deadline_timezone           │
│ completed_at                │
│ created_at                  │
│ updated_at                  │
└────────────┬────────────────┘
             │
             │
             │ 1:N
             │
┌────────────▼────────────────────┐
│  reading_goal_progress          │
│─────────────────────────────────│
│ goal_id (PK, FK)                │
│ reading_entry_id (PK, FK)       │
│ book_id (FK)                    │
│ applied_at                      │
│ applied_from_state              │
└────┬──────────────┬─────────────┘
     │              │
     │              │
     │ N:1          │ N:1
     │              │
┌────▼────────┐ ┌──▼──────────────┐
│   books     │ │ reading_entries │
│─────────────│ │─────────────────│
│ id (PK)     │ │ id (PK)         │
│ title       │ │ book_id (FK)    │
│ ...         │ │ user_id (FK)    │
└─────────────┘ │ status          │
                │ finished_at     │
                └─────────────────┘
```

## Entity: ReadingGoal

### Description
Represents a user's time-bound reading challenge with automatic progress tracking.

### Attributes

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique goal identifier |
| `user_id` | UUID | FOREIGN KEY (users.id), NOT NULL, ON DELETE CASCADE | Goal owner |
| `name` | VARCHAR(255) | NOT NULL | User-defined goal name (e.g., "Summer Reading Challenge") |
| `target_count` | INTEGER | NOT NULL, CHECK (target_count > 0) | Number of books to read |
| `progress_count` | INTEGER | NOT NULL, DEFAULT 0, CHECK (progress_count >= 0) | Books completed toward goal |
| `bonus_count` | INTEGER | NOT NULL, DEFAULT 0, CHECK (bonus_count >= 0) | Books completed beyond target |
| `status` | VARCHAR(20) | NOT NULL, CHECK (status IN ('active', 'completed', 'expired')) | Current goal state |
| `deadline_at_utc` | TIMESTAMPTZ | NOT NULL | Goal deadline in UTC |
| `deadline_timezone` | VARCHAR(50) | NOT NULL | IANA timezone (e.g., 'America/New_York') |
| `completed_at` | TIMESTAMPTZ | NULL | Timestamp when goal reached target (null if incomplete or reverted) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Goal creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

### Indexes

```sql
CREATE INDEX idx_reading_goals_user_status ON reading_goals(user_id, status);
CREATE INDEX idx_reading_goals_user_deadline ON reading_goals(user_id, deadline_at_utc);
CREATE INDEX idx_reading_goals_status_deadline ON reading_goals(status, deadline_at_utc) WHERE status = 'active';
```

### Validation Rules

1. **Target Count**: Must be positive integer (1-999 reasonable range)
2. **Deadline**: Must be in the future at creation (`deadline_at_utc > NOW()`)
3. **Progress Consistency**: `progress_count <= (target_count + bonus_count)`
4. **Bonus Calculation**: `bonus_count = MAX(0, progress_count - target_count)`
5. **Status Validation**:
   - `active`: `progress_count < target_count` AND `deadline_at_utc > NOW()`
   - `completed`: `progress_count >= target_count` AND `deadline_at_utc > completed_at`
   - `expired`: `deadline_at_utc < NOW()` AND `progress_count < target_count`
6. **Completed Timestamp**: Non-null only when `status = 'completed'`

### State Machine

```
         CREATE
            │
            ▼
      ┌──────────┐
      │  ACTIVE  │◄──────┐
      └─┬────┬───┘       │
        │    │           │
  BOOK  │    │  DEADLINE │  UNMARK (before deadline)
  DONE  │    │  PASSED   │
        │    │           │
        ▼    ▼           │
   ┌──────────┐    ┌─────────┐
   │COMPLETED │    │ EXPIRED │
   └──────────┘    └─────────┘
        │ UNMARK (after deadline)
        ▼
   (stays COMPLETED)
```

**State Transitions**:

1. **CREATE → ACTIVE**
   - Trigger: User creates goal
   - Preconditions: Valid target_count, future deadline
   - Effects: Set status='active', progress_count=0, bonus_count=0

2. **ACTIVE → COMPLETED**
   - Trigger: `progress_count` reaches `target_count`
   - Preconditions: `deadline_at_utc > NOW()`
   - Effects: Set status='completed', completed_at=NOW()

3. **ACTIVE → EXPIRED**
   - Trigger: Current time passes `deadline_at_utc`
   - Preconditions: `progress_count < target_count`
   - Effects: Set status='expired' (via scheduled job or query-time)

4. **COMPLETED → ACTIVE (reversal)**
   - Trigger: Book unmarked, causing `progress_count < target_count`
   - Preconditions: `deadline_at_utc > NOW()` (still within deadline)
   - Effects: Set status='active', completed_at=NULL

5. **COMPLETED → COMPLETED (no change)**
   - Trigger: Book unmarked, causing `progress_count < target_count`
   - Preconditions: `deadline_at_utc < NOW()` (past deadline)
   - Effects: No status change (preserves historical record)

### Business Rules

1. **Multi-Goal Counting**: Single book counts toward ALL active goals simultaneously
2. **Progress Capping**: Display progress as MIN(100%, (progress_count / target_count) × 100)
3. **Bonus Display**: Show "+N books" when `bonus_count > 0`
4. **Edit Restrictions**: Only `active` goals can be edited (target_count, deadline)
5. **Deletion**: Goals can be deleted at any time (CASCADE removes progress entries)
6. **Timezone Immutability**: `deadline_timezone` never changes after creation

## Entity: ReadingGoalProgress

### Description
Junction table tracking which reading entries counted toward which goals (book-goal association with audit trail).

### Attributes

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `goal_id` | UUID | PRIMARY KEY, FOREIGN KEY (reading_goals.id), ON DELETE CASCADE | Goal being progressed |
| `reading_entry_id` | UUID | PRIMARY KEY, FOREIGN KEY (reading_entries.id), ON DELETE CASCADE | Completed book entry |
| `book_id` | UUID | FOREIGN KEY (books.id), NOT NULL | Book reference (denormalized for performance) |
| `applied_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When book was counted toward goal |
| `applied_from_state` | VARCHAR(20) | NULL | Goal status when book applied (for audit) |

### Indexes

```sql
CREATE UNIQUE INDEX idx_reading_goal_progress_pk ON reading_goal_progress(goal_id, reading_entry_id);
CREATE INDEX idx_reading_goal_progress_entry ON reading_goal_progress(reading_entry_id);
CREATE INDEX idx_reading_goal_progress_goal ON reading_goal_progress(goal_id);
```

### Validation Rules

1. **Uniqueness**: Each `(goal_id, reading_entry_id)` pair can only exist once (prevents double-counting)
2. **Temporal Consistency**: `applied_at` should be >= goal's `created_at`
3. **Referential Integrity**: All foreign keys must reference existing records

### Business Rules

1. **Insertion**: INSERT when book marked complete; one row per active goal at that time
2. **Deletion**: DELETE when book unmarked; removes ALL rows with that `reading_entry_id`
3. **Immutability**: Once inserted, rows never UPDATE (only INSERT or DELETE)
4. **Audit Trail**: Preserves history even after goal deletion (until CASCADE cleanup)

## Database Migration (004-reading-goals.sql)

```sql
-- Migration: Add reading goals tracking
-- Depends on: books, users, reading_entries

BEGIN;

-- Main goals table
CREATE TABLE reading_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0 AND target_count <= 9999),
  progress_count INTEGER NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  bonus_count INTEGER NOT NULL DEFAULT 0 CHECK (bonus_count >= 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'expired')),
  deadline_at_utc TIMESTAMPTZ NOT NULL,
  deadline_timezone VARCHAR(50) NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rule constraints
  CONSTRAINT chk_progress_consistency CHECK (progress_count <= target_count + bonus_count),
  CONSTRAINT chk_bonus_calculation CHECK (bonus_count = GREATEST(0, progress_count - target_count)),
  CONSTRAINT chk_completed_status CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- Junction table for book-goal associations
CREATE TABLE reading_goal_progress (
  goal_id UUID NOT NULL REFERENCES reading_goals(id) ON DELETE CASCADE,
  reading_entry_id UUID NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_from_state VARCHAR(20),
  PRIMARY KEY (goal_id, reading_entry_id)
);

-- Performance indexes
CREATE INDEX idx_reading_goals_user_status ON reading_goals(user_id, status);
CREATE INDEX idx_reading_goals_user_deadline ON reading_goals(user_id, deadline_at_utc);
CREATE INDEX idx_reading_goals_active_deadline ON reading_goals(status, deadline_at_utc) WHERE status = 'active';
CREATE INDEX idx_reading_goal_progress_entry ON reading_goal_progress(reading_entry_id);
CREATE INDEX idx_reading_goal_progress_goal ON reading_goal_progress(goal_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reading_goal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reading_goals_updated_at
  BEFORE UPDATE ON reading_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_reading_goal_timestamp();

COMMIT;
```

## Model Implementation (JavaScript/Node.js)

### ReadingGoal.js

```javascript
class ReadingGoal {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.name = data.name;
    this.targetCount = data.target_count;
    this.progressCount = data.progress_count;
    this.bonusCount = data.bonus_count;
    this.status = data.status;
    this.deadlineAtUtc = data.deadline_at_utc;
    this.deadlineTimezone = data.deadline_timezone;
    this.completedAt = data.completed_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Computed properties
  get progressPercentage() {
    return Math.min(100, (this.progressCount / this.targetCount) * 100);
  }

  get displayProgressPercentage() {
    return Math.floor(this.progressPercentage);
  }

  get isCompleted() {
    return this.status === 'completed';
  }

  get isActive() {
    return this.status === 'active';
  }

  get isExpired() {
    return this.status === 'expired';
  }

  get hasBonus() {
    return this.bonusCount > 0;
  }

  // Validation
  static validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Goal name is required');
    }

    if (!Number.isInteger(data.targetCount) || data.targetCount <= 0) {
      errors.push('Target count must be a positive integer');
    }

    if (!data.deadlineAtUtc || new Date(data.deadlineAtUtc) <= new Date()) {
      errors.push('Deadline must be in the future');
    }

    if (!data.deadlineTimezone) {
      errors.push('Deadline timezone is required');
    }

    return { valid: errors.length === 0, errors };
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      targetCount: this.targetCount,
      progressCount: this.progressCount,
      bonusCount: this.bonusCount,
      status: this.status,
      progressPercentage: this.displayProgressPercentage,
      deadlineAtUtc: this.deadlineAtUtc,
      deadlineTimezone: this.deadlineTimezone,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = ReadingGoal;
```

### ReadingGoalProgress.js

```javascript
class ReadingGoalProgress {
  constructor(data) {
    this.goalId = data.goal_id;
    this.readingEntryId = data.reading_entry_id;
    this.bookId = data.book_id;
    this.appliedAt = data.applied_at;
    this.appliedFromState = data.applied_from_state;
  }

  toJSON() {
    return {
      goalId: this.goalId,
      readingEntryId: this.readingEntryId,
      bookId: this.bookId,
      appliedAt: this.appliedAt,
      appliedFromState: this.appliedFromState
    };
  }
}

module.exports = ReadingGoalProgress;
```

## Query Patterns

### Retrieve User Goals

```sql
-- Get all goals for user with computed status
SELECT
  *,
  CASE
    WHEN status = 'active' AND deadline_at_utc < NOW() THEN 'expired'
    ELSE status
  END AS computed_status
FROM reading_goals
WHERE user_id = $1
ORDER BY
  CASE computed_status
    WHEN 'active' THEN 1
    WHEN 'completed' THEN 2
    WHEN 'expired' THEN 3
  END,
  deadline_at_utc;
```

### Get Goal with Progress Details

```sql
-- Goal with book list
SELECT
  g.*,
  COALESCE(json_agg(
    json_build_object(
      'bookId', rgp.book_id,
      'readingEntryId', rgp.reading_entry_id,
      'appliedAt', rgp.applied_at
    )
  ) FILTER (WHERE rgp.reading_entry_id IS NOT NULL), '[]') AS books
FROM reading_goals g
LEFT JOIN reading_goal_progress rgp ON g.id = rgp.goal_id
WHERE g.id = $1
GROUP BY g.id;
```

### Find Active Goals for User

```sql
-- Active goals only (for progress updates)
SELECT *
FROM reading_goals
WHERE user_id = $1
  AND status = 'active'
  AND deadline_at_utc > NOW()
FOR UPDATE; -- Lock for transaction
```

## Testing Considerations

### Unit Test Coverage

1. **ReadingGoal Model**:
   - Validation logic (target count, deadline, name)
   - Computed properties (progressPercentage, isCompleted)
   - JSON serialization

2. **State Transitions**:
   - Active → Completed (reaches target)
   - Active → Expired (deadline passes)
   - Completed → Active (unmarked before deadline)
   - Completed → Completed (unmarked after deadline)

3. **Edge Cases**:
   - Progress exactly at target (100%)
   - Progress exceeds target (bonus count)
   - Multiple simultaneous book completions
   - Race condition scenarios (concurrent updates)

### Integration Test Scenarios

1. **Multi-Goal Counting**: Complete one book, verify all active goals incremented
2. **Progress Reversal**: Unmark book, verify affected goals decremented and status updated
3. **Deadline Boundary**: Test goals created/expiring near timezone boundaries
4. **Cascade Deletion**: Delete goal, verify progress entries removed

## Performance Characteristics

| Operation | Expected Time | Query Pattern |
|-----------|---------------|---------------|
| List user goals (50) | 30-50ms | Index scan on (user_id, status) |
| Get single goal | 5-10ms | Primary key lookup |
| Create goal | 10-15ms | Single INSERT |
| Update progress (50 goals) | 80-100ms | Batch INSERT + UPDATE |
| Delete goal | 15-20ms | CASCADE delete |

**Scaling Thresholds**:
- Up to 100 goals per user: Current indexes sufficient
- Up to 1000 books per goal: Progress junction table performs well
- Concurrent updates: FOR UPDATE locks prevent race conditions

## Future Enhancements (Out of Scope)

1. **Goal Templates**: Pre-defined goal types (e.g., "Monthly Challenge", "Yearly Goal")
2. **Goal Sharing**: Public/private goals, social features
3. **Milestone Notifications**: Alerts at 25%, 50%, 75%, 100% progress
4. **Historical Statistics**: Aggregate completion rates, average books per goal
5. **Goal Streaks**: Track consecutive completed goals
