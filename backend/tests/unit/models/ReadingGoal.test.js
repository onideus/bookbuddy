/**
 * Unit tests for ReadingGoal model (T010-T011)
 * Feature: 003-reading-goals
 * Target: ≥90% code coverage
 */

import { describe, it, expect, afterEach } from 'vitest';
import { ReadingGoal } from '../../../src/models/reading-goal.js';
import { cleanupTestData, createTestReader } from '../../helpers/test-data.js';
import { DateTime } from 'luxon';

describe('ReadingGoal Model', () => {
  let testUserId;

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('validate - T010', () => {
    it('should validate goal with all required fields', () => {
      const validData = {
        name: 'Read 10 books in 30 days',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing name', () => {
      const invalidData = {
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Goal name is required');
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '   ',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Goal name is required');
    });

    it('should reject non-positive target count', () => {
      const invalidData = {
        name: 'Test Goal',
        targetCount: 0,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Target count must be a positive integer');
    });

    it('should reject negative target count', () => {
      const invalidData = {
        name: 'Test Goal',
        targetCount: -5,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Target count must be a positive integer');
    });

    it('should reject non-integer target count', () => {
      const invalidData = {
        name: 'Test Goal',
        targetCount: 10.5,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Target count must be a positive integer');
    });

    it('should reject target count exceeding 9999', () => {
      const invalidData = {
        name: 'Test Goal',
        targetCount: 10000,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Target count cannot exceed 9999');
    });

    it('should accept target count of 9999', () => {
      const validData = {
        name: 'Test Goal',
        targetCount: 9999,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(validData);

      expect(result.valid).toBe(true);
    });

    it('should reject past deadline', () => {
      const invalidData = {
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().minus({ days: 1 }).toISO(),
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deadline must be in the future');
    });

    it('should reject missing deadline', () => {
      const invalidData = {
        name: 'Test Goal',
        targetCount: 10,
        deadlineTimezone: 'America/New_York',
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deadline must be in the future');
    });

    it('should reject missing timezone', () => {
      const invalidData = {
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toISO(),
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deadline timezone is required');
    });

    it('should return multiple errors for multiple violations', () => {
      const invalidData = {
        name: '',
        targetCount: -1,
        deadlineAtUtc: DateTime.now().minus({ days: 1 }).toISO(),
      };

      const result = ReadingGoal.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('computed properties - T011', () => {
    beforeEach(async () => {
      testUserId = await createTestReader();
    });

    it('should calculate progressPercentage correctly', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // Update progress to 3/10 (30%)
      const updated = await ReadingGoal.update(goal.id, {
        progressCount: 3,
      });

      expect(updated.progressPercentage).toBe(30);
    });

    it('should calculate progressPercentage of 0 for new goal', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      expect(goal.progressPercentage).toBe(0);
    });

    it('should cap progressPercentage at 100', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // Update progress to 15/10 (150%, but should cap at 100)
      const updated = await ReadingGoal.update(goal.id, {
        progressCount: 15,
        bonusCount: 5,
      });

      expect(updated.progressPercentage).toBe(100);
    });

    it('should floor progressPercentage to integer', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 3,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      // Update progress to 1/3 (33.333%)
      const updated = await ReadingGoal.update(goal.id, {
        progressCount: 1,
      });

      expect(updated.progressPercentage).toBe(33);
    });

    it('should set isCompleted to true when status is completed', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const completed = await ReadingGoal.update(goal.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      expect(completed.isCompleted).toBe(true);
      expect(completed.isActive).toBe(false);
    });

    it('should set isActive to true when status is active', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      expect(goal.isActive).toBe(true);
      expect(goal.isCompleted).toBe(false);
      expect(goal.isExpired).toBe(false);
    });

    it('should set isExpired to true when status is expired', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const expired = await ReadingGoal.update(goal.id, {
        status: 'expired',
      });

      expect(expired.isExpired).toBe(true);
      expect(expired.isActive).toBe(false);
    });

    it('should set hasBonus to true when bonus count > 0', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const withBonus = await ReadingGoal.update(goal.id, {
        progressCount: 12,
        bonusCount: 2,
      });

      expect(withBonus.hasBonus).toBe(true);
    });

    it('should set hasBonus to false when bonus count is 0', async () => {
      const goal = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      expect(goal.hasBonus).toBe(false);
    });
  });

  describe('create', () => {
    beforeEach(async () => {
      testUserId = await createTestReader();
    });

    it('should create a goal with valid data', async () => {
      const goalData = {
        userId: testUserId,
        name: 'Read 10 books in 30 days',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      };

      const goal = await ReadingGoal.create(goalData);

      expect(goal).toMatchObject({
        id: expect.any(String),
        userId: testUserId,
        name: 'Read 10 books in 30 days',
        targetCount: 10,
        progressCount: 0,
        bonusCount: 0,
        status: 'active',
        deadlineTimezone: 'America/New_York',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should reject creation with invalid data', async () => {
      const invalidData = {
        userId: testUserId,
        name: '',
        targetCount: -1,
        deadlineAtUtc: DateTime.now().minus({ days: 1 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      };

      await expect(ReadingGoal.create(invalidData)).rejects.toThrow(/Validation failed/);
    });
  });

  describe('findById', () => {
    beforeEach(async () => {
      testUserId = await createTestReader();
    });

    it('should find goal by ID', async () => {
      const created = await ReadingGoal.create({
        userId: testUserId,
        name: 'Test Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const found = await ReadingGoal.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        name: 'Test Goal',
        targetCount: 10,
      });
    });

    it('should return null for non-existent ID', async () => {
      const found = await ReadingGoal.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('findByUser', () => {
    beforeEach(async () => {
      testUserId = await createTestReader();
    });

    it('should find all goals for a user', async () => {
      await ReadingGoal.create({
        userId: testUserId,
        name: 'Goal 1',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      await ReadingGoal.create({
        userId: testUserId,
        name: 'Goal 2',
        targetCount: 5,
        deadlineAtUtc: DateTime.now().plus({ days: 60 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const result = await ReadingGoal.findByUser(testUserId);

      expect(result.goals).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter goals by status', async () => {
      const goal1 = await ReadingGoal.create({
        userId: testUserId,
        name: 'Active Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const goal2 = await ReadingGoal.create({
        userId: testUserId,
        name: 'Completed Goal',
        targetCount: 5,
        deadlineAtUtc: DateTime.now().plus({ days: 60 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      await ReadingGoal.update(goal2.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      const activeResult = await ReadingGoal.findByUser(testUserId, { status: 'active' });

      expect(activeResult.goals).toHaveLength(1);
      expect(activeResult.goals[0].name).toBe('Active Goal');
    });

    it('should order active goals first', async () => {
      const completed = await ReadingGoal.create({
        userId: testUserId,
        name: 'Completed Goal',
        targetCount: 10,
        deadlineAtUtc: DateTime.now().plus({ days: 30 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      await ReadingGoal.update(completed.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      await ReadingGoal.create({
        userId: testUserId,
        name: 'Active Goal',
        targetCount: 5,
        deadlineAtUtc: DateTime.now().plus({ days: 60 }).toJSDate(),
        deadlineTimezone: 'America/New_York',
      });

      const result = await ReadingGoal.findByUser(testUserId);

      expect(result.goals[0].name).toBe('Active Goal');
      expect(result.goals[1].name).toBe('Completed Goal');
    });
  });
});
