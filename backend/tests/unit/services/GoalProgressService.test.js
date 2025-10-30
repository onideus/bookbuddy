/**
 * Unit tests for GoalProgressService (T012)
 * Feature: 003-reading-goals
 * Target: ≥90% code coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GoalProgressService } from '../../../src/services/GoalProgressService.js';
import { ReadingGoal } from '../../../src/models/reading-goal.js';
import { ReadingGoalProgress } from '../../../src/models/reading-goal-progress.js';
import {
  cleanupTestData,
  createTestReader,
  createBookDirect,
  createReadingEntryDirect,
} from '../../helpers/test-data.js';
import { DateTime } from 'luxon';

describe('GoalProgressService', () => {
  let testUserId;
  let testBookId;
  let testReadingEntryId;

  beforeEach(async () => {
    testUserId = await createTestReader();
    testBookId = await createBookDirect({
      title: 'Test Book',
      author: 'Test Author',
    });
    testReadingEntryId = await createReadingEntryDirect(
      testUserId,
      testBookId,
      'READING'
    );
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('onBookCompleted - T012', () => {
    it('should throw "Not implemented yet" until T020 is completed', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      await expect(
        GoalProgressService.onBookCompleted(
          testUserId,
          testReadingEntryId,
          testBookId,
          'READING'
        )
      ).rejects.toThrow('Not implemented yet');
    });

    // Tests for actual implementation (will pass after T020)
    it.skip('should increment progress count for active goal', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const result = await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId,
        'READING'
      );

      expect(result).toHaveLength(1);
      expect(result[0].progressCount).toBe(1);
    });

    it.skip('should mark goal as completed when target reached', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 1 book',
        targetCount: 1,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const result = await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      expect(result[0].status).toBe('completed');
      expect(result[0].completedAt).toBeInstanceOf(Date);
    });

    it.skip('should calculate bonus when progress exceeds target', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 1 book',
        targetCount: 1,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // First book - reaches target
      await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      // Second book - creates bonus
      const secondBookId = await createBookDirect({
        title: 'Second Book',
        author: 'Test Author',
      });
      const secondEntryId = await createReadingEntryDirect(
        testUserId,
        secondBookId,
        'READING'
      );

      const result = await GoalProgressService.onBookCompleted(
        testUserId,
        secondEntryId,
        secondBookId
      );

      expect(result[0].progressCount).toBe(2);
      expect(result[0].bonusCount).toBe(1);
    });

    it.skip('should not modify expired or completed goals', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Expired Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // Mark as expired
      await ReadingGoal.update(goal.id, { status: 'expired' });

      const result = await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      expect(result).toHaveLength(0);
    });

    it.skip('should create progress entry with correct metadata', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId,
        'READING'
      );

      const progressEntries = await ReadingGoalProgress.findByReadingEntry(
        testReadingEntryId
      );

      expect(progressEntries).toHaveLength(1);
      expect(progressEntries[0]).toMatchObject({
        goalId: goal.id,
        readingEntryId: testReadingEntryId,
        bookId: testBookId,
        appliedFromState: 'READING',
      });
    });

    it.skip('should handle multiple active goals', async () => {
      const goal1 = await ReadingGoal.create({
        userId: testUserId,
        name: 'Goal 1',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const goal2 = await ReadingGoal.create({
        userId: testUserId,
        name: 'Goal 2',
        targetCount: 5,
        deadlineAtUtc: DateTime.now().plus({ days: 60 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const result = await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      expect(result).toHaveLength(2);
      expect(result[0].progressCount).toBe(1);
      expect(result[1].progressCount).toBe(1);
    });

    it.skip('should not duplicate progress for same reading entry', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // First completion
      await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      // Attempt duplicate completion (should be idempotent)
      const result = await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      // Should not increase progress twice
      const updated = await ReadingGoal.findById(goal.id);
      expect(updated.progressCount).toBe(1);
    });
  });

  describe('onBookUncompleted', () => {
    it('should throw "Not implemented yet" until T021 is completed', async () => {
      await expect(
        GoalProgressService.onBookUncompleted(testUserId, testReadingEntryId)
      ).rejects.toThrow('Not implemented yet');
    });

    it.skip('should decrement progress count', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // Complete then uncomplete
      await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      const result = await GoalProgressService.onBookUncompleted(
        testUserId,
        testReadingEntryId
      );

      expect(result[0].progressCount).toBe(0);
    });

    it.skip('should remove progress entry', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 10 books',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      await GoalProgressService.onBookUncompleted(
        testUserId,
        testReadingEntryId
      );

      const progressEntries = await ReadingGoalProgress.findByReadingEntry(
        testReadingEntryId
      );

      expect(progressEntries).toHaveLength(0);
    });

    it.skip('should revert completed status if applicable', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Read 1 book',
        targetCount: 1,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // Complete goal
      await GoalProgressService.onBookCompleted(
        testUserId,
        testReadingEntryId,
        testBookId
      );

      // Uncomplete
      const result = await GoalProgressService.onBookUncompleted(
        testUserId,
        testReadingEntryId
      );

      expect(result[0].status).toBe('active');
      expect(result[0].completedAt).toBeNull();
    });
  });

  describe('determineGoalStatus', () => {
    it('should throw "Not implemented yet" until T022 is completed', () => {
      const goal = {
        status: 'active',
        progressCount: 5,
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
      };

      expect(() => GoalProgressService.determineGoalStatus(goal)).toThrow(
        'Not implemented yet'
      );
    });

    it.skip('should transition to completed when target reached', () => {
      const goal = {
        status: 'active',
        progressCount: 10,
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
      };

      const result = GoalProgressService.determineGoalStatus(goal);

      expect(result.shouldUpdate).toBe(true);
      expect(result.newStatus).toBe('completed');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it.skip('should transition to expired when past deadline', () => {
      const goal = {
        status: 'active',
        progressCount: 5,
        targetCount: 10,
        deadlineAtUtc: DateTime.now().minus({ days: 1 }).toJSDate(),
      };

      const result = GoalProgressService.determineGoalStatus(goal);

      expect(result.shouldUpdate).toBe(true);
      expect(result.newStatus).toBe('expired');
    });

    it.skip('should not update when goal is already completed', () => {
      const goal = {
        status: 'completed',
        progressCount: 10,
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
      };

      const result = GoalProgressService.determineGoalStatus(goal);

      expect(result.shouldUpdate).toBe(false);
    });
  });

  describe('calculateBonus - T023', () => {
    it('should return 0 when progress equals target', () => {
      const bonus = GoalProgressService.calculateBonus(10, 10);
      expect(bonus).toBe(0);
    });

    it('should return 0 when progress is less than target', () => {
      const bonus = GoalProgressService.calculateBonus(5, 10);
      expect(bonus).toBe(0);
    });

    it('should calculate bonus when progress exceeds target', () => {
      const bonus = GoalProgressService.calculateBonus(12, 10);
      expect(bonus).toBe(2);
    });

    it('should handle large bonus values', () => {
      const bonus = GoalProgressService.calculateBonus(100, 10);
      expect(bonus).toBe(90);
    });
  });
});
