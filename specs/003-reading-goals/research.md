# Architecture Research: Reading Goals Tracker

**Date**: 2025-10-30
**Consultant**: OpenAI Codex (GPT-5)
**Spec**: [spec.md](spec.md)

## Research Overview

This document captures architectural decisions for the Reading Goals Tracker feature based on consultation with Codex (GPT-5) and analysis of the existing BookBuddy codebase.

## Key Architectural Decisions

### 1. Database Schema Design

**Decision**: Denormalized counters with separate progress tracking table

**Rationale**:
- **Fast reads**: Storing `progress_count` and `bonus_count` denormalized in `reading_goals` table eliminates expensive joins for list/detail views
- **Performance target**: Meets <3s goal retrieval requirement even with 100 goals per user
- **Audit trail**: Separate `reading_goal_progress` junction table maintains complete history of which books counted toward which goals
- **Transactional integrity**: Updates wrapped in transactions ensure counters stay synchronized with progress entries

**Schema Structure**:
```sql
-- Main goals table with denormalized counters
CREATE TABLE reading_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  progress_count INTEGER NOT NULL DEFAULT 0,
  bonus_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'expired')),
  deadline_at_utc TIMESTAMPTZ NOT NULL,
  deadline_timezone VARCHAR(50) NOT NULL, -- IANA timezone (e.g., 'America/New_York')
  completed_at TIMESTAMPTZ, -- Nullable for active→completed reversals
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table for book-goal associations
CREATE TABLE reading_goal_progress (
  goal_id UUID NOT NULL REFERENCES reading_goals(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  reading_entry_id UUID NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_from_state VARCHAR(20), -- Goal status when book was counted
  PRIMARY KEY (goal_id, reading_entry_id),
  UNIQUE (goal_id, reading_entry_id) -- Prevent double-counting
);

-- Indexes for performance
CREATE INDEX idx_reading_goals_user_status ON reading_goals(user_id, status);
CREATE INDEX idx_reading_goals_user_deadline ON reading_goals(user_id, deadline_at_utc);
CREATE INDEX idx_reading_goal_progress_entry ON reading_goal_progress(reading_entry_id);
```

**Alternatives Considered**:
- **Computed columns**: Status as computed field from progress + deadline → Rejected: Requires complex queries; harder to test state transitions
- **Pure calculated progress**: No denormalized counters → Rejected: Too slow for 50+ goals; violates <3s retrieval constraint
- **Snapshot approach**: Copy book list at completion → Rejected: Doesn't support progress reversals; loses auditability

### 2. State Machine Logic Placement

**Decision**: Application layer in dedicated `GoalProgressService`

**Rationale**:
- **Testability**: Application-layer logic is easily unit-testable with mocked database calls
- **Clarity**: Single service encapsulates all state transition rules (active→completed→expired, reversals)
- **Transactional control**: Service wraps operations in explicit transactions with `FOR UPDATE` locks
- **Debugging**: Clear call stack shows state transitions in application logs

**Service Operations**:
```javascript
class GoalProgressService {
  // Core operations
  async onBookCompleted(userId, readingEntryId, bookId, completedAt)
  async onBookUncompleted(userId, readingEntryId)
  async expireOverdueGoals() // Scheduled job

  // State transition logic
  async updateGoalProgress(goalId, delta, completedAt)
  async checkGoalCompletion(goalId, currentTime)
  async revertGoalToActive(goalId)
}
```

**Alternatives Considered**:
- **Database triggers**: Automatic updates on reading_entries changes → Rejected: Hard to test; obscures business logic; makes debugging difficult
- **Event queue**: Async processing via message broker → Rejected: Premature optimization; adds complexity without proven need; 2s update target achievable with synchronous approach
- **Scheduled job only**: All state updates via cron → Rejected: Violates <2s progress update requirement; poor user experience

### 3. Book-Goal Association Strategy

**Decision**: Junction table with INSERT/DELETE operations

**Rationale**:
- **Audit trail**: Preserves which books counted toward which goals, including timestamps
- **Reversal support**: DELETE operation cleanly reverses progress when book unmarked
- **No double-counting**: UNIQUE constraint on (goal_id, reading_entry_id) prevents duplicate applications
- **Performance**: Indexed queries on reading_entry_id enable fast lookups of affected goals

**Update Pattern**:
```javascript
// On book completed
BEGIN TRANSACTION;
  SELECT * FROM reading_goals
  WHERE user_id = ? AND status = 'active' AND deadline_at_utc > NOW()
  FOR UPDATE;

  INSERT INTO reading_goal_progress (goal_id, book_id, reading_entry_id)
  SELECT id, ?, ? FROM active_goals;

  UPDATE reading_goals
  SET progress_count = progress_count + 1,
      bonus_count = CASE WHEN progress_count >= target_count THEN bonus_count + 1 ELSE bonus_count END
  WHERE id IN (active_goal_ids);
COMMIT;

// On book uncompleted
BEGIN TRANSACTION;
  DELETE FROM reading_goal_progress
  WHERE reading_entry_id = ?
  RETURNING goal_id;

  UPDATE reading_goals
  SET progress_count = GREATEST(0, progress_count - 1),
      bonus_count = GREATEST(0, bonus_count - 1)
  WHERE id IN (affected_goal_ids);
COMMIT;
```

**Alternatives Considered**:
- **Date range queries**: Calculate progress by querying reading_entries within goal timeframe → Rejected: Expensive for 50 goals; violates <100ms transaction constraint
- **Snapshot on completion**: Copy book list when goal completes → Rejected: Doesn't support reversals; requires complex migration logic

### 4. Timezone Handling

**Decision**: Store UTC deadline + IANA timezone

**Rationale**:
- **Precision**: Convert user's "30 days" + timezone to exact UTC timestamp at creation (end-of-day: 23:59:59)
- **Query simplicity**: Deadline comparisons use UTC for consistency (WHERE deadline_at_utc > NOW())
- **User intent preservation**: Original timezone stored; if user changes timezone, existing goals preserve original deadline
- **Display flexibility**: API returns both UTC and timezone; frontend converts for display

**Conversion Logic**:
```javascript
// At goal creation
function calculateDeadline(daysFromNow, userTimezone) {
  const now = DateTime.now().setZone(userTimezone);
  const endOfTargetDay = now
    .plus({ days: daysFromNow })
    .endOf('day'); // 23:59:59.999
  return {
    deadline_at_utc: endOfTargetDay.toUTC().toISO(),
    deadline_timezone: userTimezone
  };
}

// At display/evaluation
function isGoalExpired(goal, currentTime) {
  const deadline = DateTime.fromISO(goal.deadline_at_utc, { zone: 'utc' });
  return currentTime > deadline;
}
```

**Alternatives Considered**:
- **Date-only storage**: Store just target date, convert at query time → Rejected: Ambiguous boundary (midnight vs end-of-day); timezone changes affect existing goals unpredictably
- **Store as user's local time**: All times in user's timezone → Rejected: Comparison queries become complex; UTC standard practice for server-side time storage

### 5. Performance Optimization

**Decision**: Indexed queries + batch operations + denormalized counters

**Rationale**:
- **Indexes**: Multi-column indexes on (user_id, status) and (user_id, deadline_at_utc) enable fast filtered queries
- **Batch updates**: Set-based INSERT/UPDATE operations process 50 goals in <100ms
- **Denormalized counters**: Eliminate N+1 query problem for goal lists
- **FOR UPDATE locks**: Prevent race conditions when multiple books marked simultaneously

**Performance Benchmarks** (expected):
- Goal list query (50 goals): ~30-50ms
- Single goal update: ~10-15ms
- Batch update (50 goals): ~80-100ms
- Total latency with network/rendering: <2s (within constraint)

**Monitoring**:
- Log slow queries (>100ms)
- Track transaction duration for multi-goal updates
- Alert if goal list queries exceed 500ms (QT-006 threshold)

**Alternatives Considered**:
- **Caching layer** (Redis): Cache goal lists and progress counts → Deferred: Adds complexity; synchronous approach meets constraints; revisit if load testing shows degradation
- **Materialized views**: Pre-aggregate goal statistics → Rejected: PostgreSQL materialized views require manual refresh; adds operational complexity

### 6. Multi-Goal Update Mechanism

**Decision**: Synchronous transaction with set-based operations

**Rationale**:
- **Simplicity**: Synchronous code path is easier to test and debug than async queue
- **Performance**: Set-based SQL operations (INSERT ... SELECT, UPDATE ... WHERE id IN) handle 50 goals efficiently
- **Consistency**: Single transaction ensures all goals updated atomically or none
- **Meets constraints**: <100ms transaction time + network overhead = well under 2s requirement

**Implementation Pattern**:
```javascript
async onBookCompleted(userId, readingEntryId, bookId, completedAt) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch active goals (FOR UPDATE prevents race conditions)
    const activeGoals = await client.query(`
      SELECT id, target_count, progress_count
      FROM reading_goals
      WHERE user_id = $1
        AND status = 'active'
        AND deadline_at_utc > $2
      FOR UPDATE
    `, [userId, completedAt]);

    // 2. Insert progress entries (set-based)
    await client.query(`
      INSERT INTO reading_goal_progress (goal_id, book_id, reading_entry_id)
      SELECT unnest($1::uuid[]), $2, $3
    `, [activeGoals.map(g => g.id), bookId, readingEntryId]);

    // 3. Update counters (set-based)
    await client.query(`
      UPDATE reading_goals
      SET progress_count = progress_count + 1,
          bonus_count = CASE
            WHEN progress_count >= target_count THEN bonus_count + 1
            ELSE bonus_count
          END,
          status = CASE
            WHEN progress_count + 1 >= target_count AND status = 'active' THEN 'completed'
            ELSE status
          END,
          completed_at = CASE
            WHEN progress_count + 1 >= target_count AND status = 'active' THEN $2
            ELSE completed_at
          END,
          updated_at = NOW()
      WHERE id = ANY($1)
      RETURNING id, status
    `, [activeGoals.map(g => g.id), completedAt]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Alternatives Considered**:
- **Event queue** (Bull/BullMQ): Async processing of goal updates → Deferred: Adds infrastructure complexity (Redis dependency); revisit if synchronous approach proves slow
- **Application-layer loop**: Iterate through goals one-by-one → Rejected: N+1 problem; slower than set-based operations

### 7. Expiration Handling

**Decision**: Scheduled job + defensive query-time checks

**Rationale**:
- **Scheduled job**: Lightweight cron worker runs hourly to mark overdue goals as 'expired'
- **Defensive queries**: Retrieval logic treats goals with `status='active' AND deadline_at_utc < NOW()` as expired to handle job drift
- **Graceful degradation**: System remains correct even if scheduled job fails or lags

**Implementation**:
```javascript
// Scheduled job (hourly)
async function expireOverdueGoals() {
  await db.query(`
    UPDATE reading_goals
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
      AND deadline_at_utc < NOW()
  `);
}

// Query-time defensive check
async function getUserGoals(userId) {
  const goals = await db.query(`
    SELECT *,
      CASE
        WHEN status = 'active' AND deadline_at_utc < NOW() THEN 'expired'
        ELSE status
      END AS computed_status
    FROM reading_goals
    WHERE user_id = $1
    ORDER BY computed_status, deadline_at_utc
  `, [userId]);
  return goals;
}
```

**Alternatives Considered**:
- **Real-time expiration**: Check/update status on every goal retrieval → Rejected: Unnecessary writes for read-only operations; scheduled job sufficient
- **Database trigger**: Automatic status update based on time → Rejected: PostgreSQL doesn't support time-based triggers without extensions

## Technology Decisions

### Date/Time Library

**Decision**: Native JavaScript Date or Luxon library

**Rationale**:
- **Luxon**: Immutable, timezone-aware, IANA timezone support
- **Lightweight**: ~70KB gzipped vs Moment.js (~300KB)
- **Modern API**: Better than native Date for timezone conversions

**Alternative**: Day.js with timezone plugin → Also acceptable; slightly smaller bundle

### Testing Strategy

**Decision**: Vitest with time mocking (MockDate or vi.setSystemTime)

**Rationale**:
- **Time-dependent tests**: Mock current time to test deadline calculations, expirations
- **Timezone testing**: Test goal creation from different timezones
- **State transition testing**: Test active→completed→expired flows with controlled timestamps

**Test Coverage Targets**:
- Models: 95%+ (simple CRUD logic)
- Service: 95%+ (complex state machine)
- API routes: 90%+ (integration with auth middleware)

## Risk Analysis

### Performance Risks

**Risk**: 50-goal batch update exceeds 2s constraint
**Mitigation**: Benchmarking required; indexes designed for multi-column queries; set-based SQL optimized for bulk operations
**Fallback**: If synchronous approach proves slow, migrate to event queue (Bull + Redis)

### Data Integrity Risks

**Risk**: Race condition when multiple books marked simultaneously
**Mitigation**: `FOR UPDATE` locks in transactions; unique constraints prevent double-counting
**Test**: Concurrent update tests using multiple parallel requests

### Timezone Risks

**Risk**: User changes timezone, creating confusion about existing goal deadlines
**Mitigation**: Goals locked to creation timezone; user-facing messaging explains goals preserve original timezone
**Alternative**: If user feedback indicates confusion, add "adjust timezone" feature for active goals

## Open Questions (Deferred to Implementation)

1. **Frontend Framework**: Confirm React (assumed based on .jsx patterns in project structure)
2. **Design Tokens**: Locate existing design system for progress bar styling
3. **User Model**: Verify `users` table has `timezone` column or add migration
4. **Scheduled Job Infrastructure**: Determine deployment strategy (cron, Node scheduler, K8s CronJob)
5. **Feature Flag**: Consider progressive rollout strategy for initial release

## Conclusion

The recommended architecture balances simplicity with performance requirements. Denormalized counters and set-based SQL operations meet <2s update and <3s retrieval constraints without introducing complex caching or queue infrastructure. Application-layer state machine enables comprehensive testing while maintaining transactional consistency.

**Next Steps**: Proceed to Phase 1 (Data Model, API Contracts, Quickstart).
