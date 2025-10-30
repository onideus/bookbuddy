/**
 * Integration tests for goal creation + book marking flow (T015)
 * Tests the complete flow of creating goals and marking books as read
 * Verifies automatic progress tracking across multiple goals
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../helpers/server-helper.js';
import {
  createTestReader,
  cleanupTestData,
  cleanupReaderEntries,
} from '../helpers/test-data.js';
import { DateTime } from 'luxon';

describe('Goals Progress Integration Tests', () => {
  let app;
  let testUserId;
  let sessionCookie;

  beforeAll(async () => {
    app = await build();
    testUserId = await createTestReader(app);
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/session',
      payload: { readerId: testUserId },
    });
    sessionCookie = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupReaderEntries(testUserId);
  });

  describe('Goal creation + book marking flow', () => {
    it('should create goal and automatically track progress when books are marked complete', async () => {
      // Create a goal
      const goalResponse = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 10 books in 30 days',
          targetCount: 10,
          daysToComplete: 30,
          timezone: 'America/New_York',
        },
      });

      expect(goalResponse.statusCode).toBe(201);
      const goal = goalResponse.json();
      expect(goal.progressCount).toBe(0);

      // Add first book and mark as finished
      const book1Response = await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Book 1',
          author: 'Author 1',
          status: 'FINISHED',
        },
      });
      expect(book1Response.statusCode).toBe(201);

      // Check goal progress updated
      let progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      let updatedGoal = progressResponse.json();
      expect(updatedGoal.progressCount).toBe(1);
      expect(updatedGoal.progressPercentage).toBe(10); // 1/10 = 10%

      // Add second book
      const book2Response = await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Book 2',
          author: 'Author 2',
          status: 'FINISHED',
        },
      });
      expect(book2Response.statusCode).toBe(201);

      // Check progress updated to 20%
      progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      updatedGoal = progressResponse.json();
      expect(updatedGoal.progressCount).toBe(2);
      expect(updatedGoal.progressPercentage).toBe(20); // 2/10 = 20%
    });

    it('should track same book toward multiple concurrent goals', async () => {
      // Create two goals
      const goal1Response = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 10 books in 30 days',
          targetCount: 10,
          daysToComplete: 30,
          timezone: 'UTC',
        },
      });

      const goal2Response = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 5 books in 15 days',
          targetCount: 5,
          daysToComplete: 15,
          timezone: 'UTC',
        },
      });

      const goal1 = goal1Response.json();
      const goal2 = goal2Response.json();

      // Add one book
      await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Shared Book',
          author: 'Shared Author',
          status: 'FINISHED',
        },
      });

      // Check both goals incremented
      const goal1Progress = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal1.id}`,
        headers: { cookie: sessionCookie },
      });
      const goal2Progress = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal2.id}`,
        headers: { cookie: sessionCookie },
      });

      expect(goal1Progress.json().progressCount).toBe(1);
      expect(goal2Progress.json().progressCount).toBe(1);
    });

    it('should complete goal when target is reached', async () => {
      // Create goal with target 2
      const goalResponse = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 2 books',
          targetCount: 2,
          daysToComplete: 10,
          timezone: 'UTC',
        },
      });

      const goal = goalResponse.json();

      // Add first book
      await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Book 1',
          author: 'Author 1',
          status: 'FINISHED',
        },
      });

      // Check still active
      let progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      let updatedGoal = progressResponse.json();
      expect(updatedGoal.status).toBe('active');
      expect(updatedGoal.isCompleted).toBe(false);

      // Add second book (completes goal)
      await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Book 2',
          author: 'Author 2',
          status: 'FINISHED',
        },
      });

      // Check goal completed
      progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      updatedGoal = progressResponse.json();
      expect(updatedGoal.status).toBe('completed');
      expect(updatedGoal.isCompleted).toBe(true);
      expect(updatedGoal.completedAt).toBeTruthy();
      expect(updatedGoal.progressPercentage).toBe(100);
    });

    it('should track bonus books when exceeding target', async () => {
      // Create goal with target 2
      const goalResponse = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 2 books',
          targetCount: 2,
          daysToComplete: 10,
          timezone: 'UTC',
        },
      });

      const goal = goalResponse.json();

      // Complete 3 books (1 bonus)
      for (let i = 1; i <= 3; i++) {
        await app.inject({
          method: 'POST',
          url: `/api/readers/${testUserId}/reading-entries`,
          headers: { cookie: sessionCookie },
          payload: {
            title: `Book ${i}`,
            author: `Author ${i}`,
            status: 'FINISHED',
          },
        });
      }

      // Check bonus tracked
      const progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      const updatedGoal = progressResponse.json();
      expect(updatedGoal.progressCount).toBe(3);
      expect(updatedGoal.bonusCount).toBe(1);
      expect(updatedGoal.hasBonus).toBe(true);
      expect(updatedGoal.status).toBe('completed');
      expect(updatedGoal.progressPercentage).toBe(100); // Caps at 100%
    });

    it('should decrement progress when book is unmarked', async () => {
      // Create goal
      const goalResponse = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 5 books',
          targetCount: 5,
          daysToComplete: 20,
          timezone: 'UTC',
        },
      });

      const goal = goalResponse.json();

      // Add book
      const bookResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Test Book',
          author: 'Test Author',
          status: 'FINISHED',
        },
      });

      const readingEntry = bookResponse.json();

      // Check progress incremented
      let progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      expect(progressResponse.json().progressCount).toBe(1);

      // Change status to READING (unmark as finished)
      await app.inject({
        method: 'PATCH',
        url: `/api/reading-entries/${readingEntry.id}`,
        headers: { cookie: sessionCookie },
        payload: {
          status: 'READING',
        },
      });

      // Check progress decremented
      progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      expect(progressResponse.json().progressCount).toBe(0);
    });

    it('should revert completed goal to active when book is unmarked before deadline', async () => {
      // Create goal with target 1
      const goalResponse = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 1 book',
          targetCount: 1,
          daysToComplete: 10,
          timezone: 'UTC',
        },
      });

      const goal = goalResponse.json();

      // Complete the goal
      const bookResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Quick Read',
          author: 'Fast Author',
          status: 'FINISHED',
        },
      });

      const readingEntry = bookResponse.json();

      // Verify goal completed
      let progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      expect(progressResponse.json().status).toBe('completed');

      // Unmark book (before deadline)
      await app.inject({
        method: 'PATCH',
        url: `/api/reading-entries/${readingEntry.id}`,
        headers: { cookie: sessionCookie },
        payload: {
          status: 'READING',
        },
      });

      // Verify goal reverted to active
      progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      const updatedGoal = progressResponse.json();
      expect(updatedGoal.status).toBe('active');
      expect(updatedGoal.isActive).toBe(true);
      expect(updatedGoal.completedAt).toBeNull();
      expect(updatedGoal.progressCount).toBe(0);
    });

    it('should not track books marked before goal was created', async () => {
      // Add book BEFORE creating goal
      await app.inject({
        method: 'POST',
        url: `/api/readers/${testUserId}/reading-entries`,
        headers: { cookie: sessionCookie },
        payload: {
          title: 'Pre-existing Book',
          author: 'Pre Author',
          status: 'FINISHED',
        },
      });

      // Create goal after
      const goalResponse = await app.inject({
        method: 'POST',
        url: '/api/goals',
        headers: { cookie: sessionCookie },
        payload: {
          name: 'Read 5 books',
          targetCount: 5,
          daysToComplete: 20,
          timezone: 'UTC',
        },
      });

      const goal = goalResponse.json();

      // Verify progress is 0 (pre-existing book not counted)
      const progressResponse = await app.inject({
        method: 'GET',
        url: `/api/goals/${goal.id}`,
        headers: { cookie: sessionCookie },
      });
      expect(progressResponse.json().progressCount).toBe(0);
    });
  });
});
