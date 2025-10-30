# Quick Start Guide: Reading Goals Tracker Implementation

**Date**: 2025-10-30
**Spec**: [spec.md](spec.md)
**Research**: [research.md](research.md)
**Data Model**: [data-model.md](data-model.md)
**API Contract**: [contracts/goals-api.yaml](contracts/goals-api.yaml)

## Overview

This guide provides implementation instructions for the Reading Goals Tracker feature, organized by user story priority for incremental delivery.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ running (via Docker Compose)
- Existing BookBuddy backend and frontend running
- Familiarity with Fastify, Vitest, and React

## Implementation Order (TDD Approach)

Follow this sequence for test-driven development:

1. **Database migrations** (foundation)
2. **User Story 1 (P1)**: Create and track reading goal
3. **User Story 2 (P2)**: View active and past goals
4. **User Story 3 (P3)**: Edit and delete goals

## Phase 1: Database Setup

### Step 1: Create Migration File

```bash
touch backend/src/db/migrations/004-reading-goals.sql
```

Copy the migration SQL from [data-model.md](data-model.md#database-migration-004-reading-goalssql).

### Step 2: Run Migration

```bash
cd backend
DATABASE_URL=postgresql://bookbuddy:bookbuddy_dev_password@localhost:5432/bookbuddy_dev npm run migrate:up
```

### Step 3: Verify Tables

```bash
PGPASSWORD=bookbuddy_dev_password psql -h localhost -U bookbuddy -d bookbuddy_dev -c "\dt reading_*"
```

Expected output:
```
                     List of relations
 Schema |          Name           | Type  |   Owner
--------+-------------------------+-------+-----------
 public | reading_goal_progress   | table | bookbuddy
 public | reading_goals           | table | bookbuddy
```

## Phase 2: User Story 1 (P1) - Create and Track Reading Goal

### Backend Implementation

#### Step 1: Write Tests First

**backend/tests/unit/models/ReadingGoal.test.js**

```javascript
import { describe, test, expect } from 'vitest';
import ReadingGoal from '../../../src/models/ReadingGoal.js';

describe('ReadingGoal Model', () => {
  test('validates required fields', () => {
    const result = ReadingGoal.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Goal name is required');
  });

  test('validates positive target count', () => {
    const result = ReadingGoal.validate({
      name: 'Test Goal',
      targetCount: -1,
      deadlineAtUtc: new Date(Date.now() + 86400000).toISOString()
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Target count must be a positive integer');
  });

  test('validates future deadline', () => {
    const result = ReadingGoal.validate({
      name: 'Test Goal',
      targetCount: 10,
      deadlineAtUtc: new Date(Date.now() - 86400000).toISOString()
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Deadline must be in the future');
  });

  test('calculates progress percentage correctly', () => {
    const goal = new ReadingGoal({
      target_count: 10,
      progress_count: 7,
      bonus_count: 0
    });
    expect(goal.progressPercentage).toBe(70);
    expect(goal.displayProgressPercentage).toBe(70);
  });

  test('caps progress percentage at 100', () => {
    const goal = new ReadingGoal({
      target_count: 10,
      progress_count: 13,
      bonus_count: 3
    });
    expect(goal.progressPercentage).toBe(100);
  });
});
```

**Run tests (should FAIL initially):**

```bash
cd backend
npm test -- ReadingGoal.test.js
```

#### Step 2: Implement Model

Copy `ReadingGoal.js` implementation from [data-model.md](data-model.md#readinggoaljs).

Place at: `backend/src/models/ReadingGoal.js`

**Run tests again (should PASS):**

```bash
npm test -- ReadingGoal.test.js
```

#### Step 3: Write Service Tests

**backend/tests/unit/services/GoalProgressService.test.js**

```javascript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import GoalProgressService from '../../../src/services/GoalProgressService.js';

describe('GoalProgressService', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      connect: vi.fn(() => ({
        query: vi.fn(),
        release: vi.fn()
      }))
    };
    service = new GoalProgressService(mockDb);
  });

  test('onBookCompleted updates all active goals', async () => {
    // Mock active goals
    const activeGoals = [
      { id: 'goal-1', target_count: 10, progress_count: 5 },
      { id: 'goal-2', target_count: 20, progress_count: 10 }
    ];

    mockDb.query
      .mockResolvedValueOnce({ rows: activeGoals }) // SELECT active goals
      .mockResolvedValueOnce({ rows: [] })          // INSERT progress entries
      .mockResolvedValueOnce({ rows: [] });         // UPDATE goal counters

    await service.onBookCompleted('user-1', 'entry-1', 'book-1', new Date());

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    // Verify SELECT query
    expect(mockDb.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining('SELECT'),
      expect.arrayContaining(['user-1'])
    );
    // Verify UPDATE query
    expect(mockDb.query).toHaveBeenNthCalledWith(3,
      expect.stringContaining('UPDATE reading_goals'),
      expect.anything()
    );
  });

  test('onBookCompleted marks goal as completed when target reached', async () => {
    const goalNearCompletion = [
      { id: 'goal-1', target_count: 10, progress_count: 9 }
    ];

    mockDb.query
      .mockResolvedValueOnce({ rows: goalNearCompletion })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'goal-1', status: 'completed' }] });

    await service.onBookCompleted('user-1', 'entry-1', 'book-1', new Date());

    // Verify UPDATE set status='completed'
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining("status = CASE"),
      expect.anything()
    );
  });
});
```

**Run tests (should FAIL):**

```bash
npm test -- GoalProgressService.test.js
```

#### Step 4: Implement Service

**backend/src/services/GoalProgressService.js**

```javascript
class GoalProgressService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  async onBookCompleted(userId, readingEntryId, bookId, completedAt) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch active goals (FOR UPDATE prevents race conditions)
      const activeGoalsResult = await client.query(`
        SELECT id, target_count, progress_count
        FROM reading_goals
        WHERE user_id = $1
          AND status = 'active'
          AND deadline_at_utc > $2
        FOR UPDATE
      `, [userId, completedAt]);

      const activeGoals = activeGoalsResult.rows;

      if (activeGoals.length === 0) {
        await client.query('COMMIT');
        return { updated: 0 };
      }

      const goalIds = activeGoals.map(g => g.id);

      // 2. Insert progress entries (set-based)
      await client.query(`
        INSERT INTO reading_goal_progress (goal_id, book_id, reading_entry_id, applied_from_state)
        SELECT unnest($1::uuid[]), $2, $3, 'active'
      `, [goalIds, bookId, readingEntryId]);

      // 3. Update counters and status (set-based)
      const updateResult = await client.query(`
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
        RETURNING id, status, progress_count, target_count
      `, [goalIds, completedAt]);

      await client.query('COMMIT');

      return {
        updated: updateResult.rows.length,
        goals: updateResult.rows
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onBookUncompleted(userId, readingEntryId) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete progress entries and get affected goal IDs
      const deleteResult = await client.query(`
        DELETE FROM reading_goal_progress
        WHERE reading_entry_id = $1
        RETURNING goal_id
      `, [readingEntryId]);

      const affectedGoalIds = deleteResult.rows.map(r => r.goal_id);

      if (affectedGoalIds.length === 0) {
        await client.query('COMMIT');
        return { updated: 0 };
      }

      // 2. Decrement counters and check for status reversal
      const updateResult = await client.query(`
        UPDATE reading_goals
        SET progress_count = GREATEST(0, progress_count - 1),
            bonus_count = GREATEST(0, CASE
              WHEN progress_count > target_count THEN bonus_count - 1
              ELSE bonus_count
            END),
            status = CASE
              WHEN status = 'completed'
                AND progress_count - 1 < target_count
                AND deadline_at_utc > NOW()
              THEN 'active'
              ELSE status
            END,
            completed_at = CASE
              WHEN status = 'completed'
                AND progress_count - 1 < target_count
                AND deadline_at_utc > NOW()
              THEN NULL
              ELSE completed_at
            END,
            updated_at = NOW()
        WHERE id = ANY($1)
        RETURNING id, status, progress_count, target_count
      `, [affectedGoalIds]);

      await client.query('COMMIT');

      return {
        updated: updateResult.rows.length,
        goals: updateResult.rows
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async expireOverdueGoals() {
    const result = await this.db.query(`
      UPDATE reading_goals
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'active'
        AND deadline_at_utc < NOW()
      RETURNING id
    `);

    return { expired: result.rows.length };
  }
}

export default GoalProgressService;
```

**Run tests (should PASS):**

```bash
npm test -- GoalProgressService.test.js
```

#### Step 5: Write API Route Tests

**backend/tests/contract/goals-api.test.js**

```javascript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import buildApp from '../../src/server.js';

describe('Goals API', () => {
  let app;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/goals', () => {
    test('creates a new goal', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/goals',
        payload: {
          name: 'Summer Reading Challenge',
          targetCount: 10,
          daysFromNow: 30
        },
        cookies: { sessionId: 'test-session-id' } // Mock auth
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Summer Reading Challenge');
      expect(body.targetCount).toBe(10);
      expect(body.progressCount).toBe(0);
      expect(body.status).toBe('active');
    });

    test('validates required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/goals',
        payload: {},
        cookies: { sessionId: 'test-session-id' }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('rejects past deadline', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/goals',
        payload: {
          name: 'Invalid Goal',
          targetCount: 10,
          daysFromNow: -10
        },
        cookies: { sessionId: 'test-session-id' }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('PAST_DEADLINE');
    });
  });

  describe('GET /api/goals', () => {
    test('lists user goals', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/goals',
        cookies: { sessionId: 'test-session-id' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('goals');
      expect(Array.isArray(body.goals)).toBe(true);
      expect(body).toHaveProperty('pagination');
    });
  });
});
```

**Run tests (should FAIL):**

```bash
npm test -- goals-api.test.js
```

#### Step 6: Implement API Routes

**backend/src/api/routes/goals.js**

```javascript
import { DateTime } from 'luxon';
import ReadingGoal from '../../models/ReadingGoal.js';
import GoalProgressService from '../../services/GoalProgressService.js';

async function goalsRoutes(fastify, options) {
  const goalService = new GoalProgressService(fastify.pg);

  // POST /api/goals - Create goal
  fastify.post('/goals', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'targetCount', 'daysFromNow'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          targetCount: { type: 'integer', minimum: 1, maximum: 9999 },
          daysFromNow: { type: 'integer', minimum: 1, maximum: 3650 },
          timezone: { type: 'string' }
        }
      }
    },
    preHandler: fastify.auth([fastify.verifySession])
  }, async (request, reply) => {
    const { name, targetCount, daysFromNow, timezone } = request.body;
    const userId = request.session.userId;
    const userTimezone = timezone || request.session.userTimezone || 'UTC';

    // Calculate deadline
    const now = DateTime.now().setZone(userTimezone);
    const endOfTargetDay = now.plus({ days: daysFromNow }).endOf('day');
    const deadlineAtUtc = endOfTargetDay.toUTC().toISO();

    // Validate future deadline
    if (endOfTargetDay <= DateTime.now()) {
      return reply.code(400).send({
        error: 'Goal deadline must be in the future',
        code: 'PAST_DEADLINE'
      });
    }

    // Insert goal
    const result = await fastify.pg.query(`
      INSERT INTO reading_goals (user_id, name, target_count, deadline_at_utc, deadline_timezone, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `, [userId, name, targetCount, deadlineAtUtc, userTimezone]);

    const goal = new ReadingGoal(result.rows[0]);
    reply.code(201).send(goal.toJSON());
  });

  // GET /api/goals - List goals
  fastify.get('/goals', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'completed', 'expired'] },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    },
    preHandler: fastify.auth([fastify.verifySession])
  }, async (request, reply) => {
    const { status, limit = 50, offset = 0 } = request.query;
    const userId = request.session.userId;

    let query = `
      SELECT *,
        CASE
          WHEN status = 'active' AND deadline_at_utc < NOW() THEN 'expired'
          ELSE status
        END AS computed_status
      FROM reading_goals
      WHERE user_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY
      CASE computed_status
        WHEN 'active' THEN 1
        WHEN 'completed' THEN 2
        WHEN 'expired' THEN 3
      END,
      deadline_at_utc
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await fastify.pg.query(query, params);
    const goals = result.rows.map(row => new ReadingGoal(row).toJSON());

    const countResult = await fastify.pg.query(
      'SELECT COUNT(*) FROM reading_goals WHERE user_id = $1',
      [userId]
    );

    reply.send({
      goals,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
        hasMore: offset + limit < parseInt(countResult.rows[0].count)
      }
    });
  });

  // GET /api/goals/:goalId - Get goal details
  fastify.get('/goals/:goalId', {
    preHandler: fastify.auth([fastify.verifySession])
  }, async (request, reply) => {
    const { goalId } = request.params;
    const userId = request.session.userId;

    const result = await fastify.pg.query(`
      SELECT g.*,
        COALESCE(json_agg(
          json_build_object(
            'bookId', rgp.book_id,
            'readingEntryId', rgp.reading_entry_id,
            'appliedAt', rgp.applied_at
          )
        ) FILTER (WHERE rgp.reading_entry_id IS NOT NULL), '[]') AS books
      FROM reading_goals g
      LEFT JOIN reading_goal_progress rgp ON g.id = rgp.goal_id
      WHERE g.id = $1 AND g.user_id = $2
      GROUP BY g.id
    `, [goalId, userId]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Goal not found', code: 'NOT_FOUND' });
    }

    const goal = new ReadingGoal(result.rows[0]);
    const goalData = goal.toJSON();
    goalData.books = result.rows[0].books;

    reply.send(goalData);
  });

  // PATCH /api/goals/:goalId - Update goal
  fastify.patch('/goals/:goalId', {
    schema: {
      body: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          targetCount: { type: 'integer', minimum: 1, maximum: 9999 },
          daysToAdd: { type: 'integer', minimum: 1, maximum: 365 }
        }
      }
    },
    preHandler: fastify.auth([fastify.verifySession])
  }, async (request, reply) => {
    const { goalId } = request.params;
    const { name, targetCount, daysToAdd } = request.body;
    const userId = request.session.userId;

    // Check if goal is active
    const checkResult = await fastify.pg.query(
      'SELECT status FROM reading_goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    if (checkResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Goal not found', code: 'NOT_FOUND' });
    }

    if (checkResult.rows[0].status !== 'active') {
      return reply.code(403).send({
        error: 'Cannot edit completed or expired goals',
        code: 'GOAL_NOT_EDITABLE'
      });
    }

    // Build update query
    const updates = [];
    const params = [goalId, userId];
    let paramIndex = 3;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }

    if (targetCount) {
      updates.push(`target_count = $${paramIndex++}`);
      params.push(targetCount);
    }

    if (daysToAdd) {
      updates.push(`deadline_at_utc = deadline_at_utc + INTERVAL '${daysToAdd} days'`);
    }

    updates.push(`updated_at = NOW()`);

    const result = await fastify.pg.query(`
      UPDATE reading_goals
      SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, params);

    const goal = new ReadingGoal(result.rows[0]);
    reply.send(goal.toJSON());
  });

  // DELETE /api/goals/:goalId - Delete goal
  fastify.delete('/goals/:goalId', {
    preHandler: fastify.auth([fastify.verifySession])
  }, async (request, reply) => {
    const { goalId } = request.params;
    const userId = request.session.userId;

    const result = await fastify.pg.query(
      'DELETE FROM reading_goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [goalId, userId]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Goal not found', code: 'NOT_FOUND' });
    }

    reply.code(204).send();
  });
}

export default goalsRoutes;
```

**Register routes in `backend/src/server.js`:**

```javascript
import goalsRoutes from './api/routes/goals.js';

// ... existing routes ...
app.register(goalsRoutes, { prefix: '/api' });
```

**Run tests (should PASS):**

```bash
npm test
```

### Frontend Implementation

#### Step 1: API Client

**frontend/src/services/goalsApi.js**

```javascript
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const goalsApi = {
  async list(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${BASE_URL}/goals?${params}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch goals');
    return response.json();
  },

  async get(goalId) {
    const response = await fetch(`${BASE_URL}/goals/${goalId}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch goal');
    return response.json();
  },

  async create(goalData) {
    const response = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(goalData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create goal');
    }
    return response.json();
  },

  async update(goalId, updates) {
    const response = await fetch(`${BASE_URL}/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update goal');
    }
    return response.json();
  },

  async delete(goalId) {
    const response = await fetch(`${BASE_URL}/goals/${goalId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete goal');
  }
};
```

#### Step 2: Progress Bar Component

**frontend/src/components/GoalProgressBar.jsx**

```jsx
import React from 'react';
import './GoalProgressBar.css';

export function GoalProgressBar({ progressPercentage, bonusCount }) {
  return (
    <div className="goal-progress-bar" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin="0" aria-valuemax="100">
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="progress-text">
        {progressPercentage}%
        {bonusCount > 0 && <span className="bonus-text"> +{bonusCount} bonus</span>}
      </div>
    </div>
  );
}
```

## Next Steps

1. Complete User Story 2 (view goals)
2. Complete User Story 3 (edit/delete)
3. Integrate with existing reading tracking (hook into book completion events)
4. Add frontend routing and pages
5. Run full test suite and coverage report

## Testing Commands

```bash
# Backend tests
cd backend
npm test                          # All tests
npm run test:unit                 # Unit tests only
npm run test:integration          # Integration tests
npm run test:contract             # API contract tests
npm run test:coverage             # Coverage report

# Frontend tests
cd frontend
npm test                          # All tests
npm run test:watch                # Watch mode
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart postgres

# Reset database
docker exec -i bookbuddy-postgres psql -U bookbuddy -d bookbuddy_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migrate:up
```

### Test Failures

- Ensure test database is clean before running tests
- Use `beforeEach` hooks to reset state
- Check for timezone issues in test assertions

## Multi-Agent Coordination

As **Overseer**, you should:
1. Assign work areas to implementors:
   - **Implementor-A**: Database layer (migrations, models)
   - **Implementor-B**: API layer (service, routes)
   - **Implementor-C**: UI layer (components, pages)
2. Monitor progress in `state/overseer.md`
3. Run integration tests on merged branches
4. Coordinate blockers and dependencies

Implementors should:
1. Create feature branch from overseer branch
2. Follow TDD cycle for assigned work area
3. Update status in `specs/003-reading-goals/tasks.md`
4. Open PR to overseer branch when complete
