/**
 * Unit tests for GoalProgressService (T012)
 * Tests for goal progress tracking, book completion, and state transitions
 * Target: ≥90% code coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoalProgressService } from '../../../src/services/GoalProgressService.js';
import { ReadingGoal } from '../../../src/models/reading-goal.js';
import { ReadingGoalProgress } from '../../../src/models/reading-goal-progress.js';
import {
  createTestReader,
  createBookDirect,
  createReadingEntryDirect,
  cleanupTestData,
} from '../../helpers/test-data.js';
import { DateTime } from 'luxon';

// Mock logger to avoid actual logging in tests
vi.mock('../../../src/lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GoalProgressService', () => {
  let testUserId;
  let testBookId;
  let testReadingEntryId;

  beforeEach(async () => {
    testUserId = await createTestReader();
    testBookId = await createBookDirect({
      title: 'Test Book for Goals',
      author: 'Test Author',
    });
    testReadingEntryId = await createReadingEntryDirect({
      readerId: testUserId,
      bookId: testBookId,
      status: 'READING',
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('onBookCompleted (T020 - transaction logic)', () => {
    it('should increment progress for all active goals when book is completed', async () => {
      // Create two active goals
      const goal1 = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books in 30 days',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      const goal2 = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 5 books in 15 days',
        targetCount: 5,
        deadlineAtUtc: DateTime.now().plus({ days: 15 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Mark book as completed
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Verify both goals have progress incremented
      const updatedGoal1 = await ReadingGoal.findById(goal1.id);
      const updatedGoal2 = await ReadingGoal.findById(goal2.id);

      expect(updatedGoal1.progressCount).toBe(1);
      expect(updatedGoal2.progressCount).toBe(1);
    });

    it('should transition goal to completed when target is reached', async () => {
      // Create goal with target 1
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 1 book',
        targetCount: 1,
        deadlineAtUtc: DateTime.now().plus({ days: 10 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Mark book as completed
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Verify goal status changed to completed
      const updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.status).toBe('completed');
      expect(updatedGoal.completedAt).toBeTruthy();
      expect(updatedGoal.progressCount).toBe(1);
    });

    it('should track bonus count when progress exceeds target', async () => {
      // Create goal with target 2
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 2 books',
        targetCount: 2,
        deadlineAtUtc: DateTime.now().plus({ days: 10 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Complete first book
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Complete second book
      const book2Id = await createBookDirect({
        title: 'Test Book 2',
        author: 'Test Author',
      });
      const entry2Id = await createReadingEntryDirect({
        readerId: testUserId,
        bookId: book2Id,
        status: 'FINISHED',
      });
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: entry2Id,
        bookId: book2Id,
      });

      // Complete third book (bonus)
      const book3Id = await createBookDirect({
        title: 'Test Book 3',
        author: 'Test Author',
      });
      const entry3Id = await createReadingEntryDirect({
        readerId: testUserId,
        bookId: book3Id,
        status: 'FINISHED',
      });
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: entry3Id,
        bookId: book3Id,
      });

      // Verify bonus count
      const updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.progressCount).toBe(3);
      expect(updatedGoal.bonusCount).toBe(1);
      expect(updatedGoal.status).toBe('completed');
    });

    it('should not increment expired goals', async () => {
      // Create expired goal (deadline in past)
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Old goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().minus({ days: 5 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Manually set status to expired
      await ReadingGoal.update(goal.id, { status: 'expired' });

      // Mark book as completed
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Verify goal progress NOT incremented
      const updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.progressCount).toBe(0);
      expect(updatedGoal.status).toBe('expired');
    });

    it('should create progress entries for each goal', async () => {
      // Create goal
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 5 books',
        targetCount: 5,
        deadlineAtUtc: DateTime.now().plus({ days: 20 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Mark book as completed
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Verify progress entry was created
      const progressEntries = await ReadingGoalProgress.findByGoal(goal.id);
      expect(progressEntries).toHaveLength(1);
      expect(progressEntries[0]).toMatchObject({
        goalId: goal.id,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });
    });
  });

  describe('onBookUncompleted (T021 - reversal logic)', () => {
    it('should decrement progress for all affected goals when book is unmarked', async () => {
      // Create goal
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Mark book as completed
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Verify progress incremented
      let updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.progressCount).toBe(1);

      // Unmark book
      await GoalProgressService.onBookUncompleted({
        readingEntryId: testReadingEntryId,
      });

      // Verify progress decremented
      updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.progressCount).toBe(0);
    });

    it('should revert completed goal to active if still before deadline', async () => {
      // Create goal with target 1
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 1 book',
        targetCount: 1,
        deadlineAtUtc: DateTime.now().plus({ days: 10 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Complete the goal
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      let updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.status).toBe('completed');

      // Unmark book (before deadline)
      await GoalProgressService.onBookUncompleted({
        readingEntryId: testReadingEntryId,
      });

      // Verify goal reverted to active
      updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.status).toBe('active');
      expect(updatedGoal.completedAt).toBeNull();
    });

    it('should keep completed status if deadline has passed', async () => {
      // Create goal with past deadline
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 1 book',
        targetCount: 1,
        deadlineAtUtc: DateTime.now().plus({ days: 1 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Complete the goal
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Manually update to simulate time passing
      await ReadingGoal.update(goal.id, {
        completedAt: DateTime.now().minus({ days: 5 }).toISO(),
      });

      // Unmark book (after deadline would have passed)
      await GoalProgressService.onBookUncompleted({
        readingEntryId: testReadingEntryId,
      });

      // Verify goal keeps completed status (historical record)
      const updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.status).toBe('completed');
    });

    it('should remove progress entries when book is unmarked', async () => {
      // Create goal
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 5 books',
        targetCount: 5,
        deadlineAtUtc: DateTime.now().plus({ days: 20 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Mark book as completed
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      // Verify progress entry created
      let progressEntries = await ReadingGoalProgress.findByGoal(goal.id);
      expect(progressEntries).toHaveLength(1);

      // Unmark book
      await GoalProgressService.onBookUncompleted({
        readingEntryId: testReadingEntryId,
      });

      // Verify progress entry removed
      progressEntries = await ReadingGoalProgress.findByGoal(goal.id);
      expect(progressEntries).toHaveLength(0);
    });

    it('should reduce bonus count when unmarking bonus books', async () => {
      // Create goal with target 1
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 1 book',
        targetCount: 1,
        deadlineAtUtc: DateTime.now().plus({ days: 10 }).toISO(),
        deadlineTimezone: 'America/New_York',
      });

      // Complete two books (second is bonus)
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
      });

      const book2Id = await createBookDirect({
        title: 'Bonus Book',
        author: 'Test Author',
      });
      const entry2Id = await createReadingEntryDirect({
        readerId: testUserId,
        bookId: book2Id,
        status: 'FINISHED',
      });
      await GoalProgressService.onBookCompleted({
        userId: testUserId,
        readingEntryId: entry2Id,
        bookId: book2Id,
      });

      let updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.progressCount).toBe(2);
      expect(updatedGoal.bonusCount).toBe(1);

      // Unmark bonus book
      await GoalProgressService.onBookUncompleted({
        readingEntryId: entry2Id,
      });

      // Verify bonus count reduced
      updatedGoal = await ReadingGoal.findById(goal.id);
      expect(updatedGoal.progressCount).toBe(1);
      expect(updatedGoal.bonusCount).toBe(0);
    });
  });
});
