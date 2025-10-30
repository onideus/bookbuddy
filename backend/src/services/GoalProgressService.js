/**
 * GoalProgressService
 * Business logic for reading goal progress tracking
 * Feature: 003-reading-goals
 */

import { ReadingGoal } from '../models/reading-goal.js';
import { ReadingGoalProgress } from '../models/reading-goal-progress.js';
import { transaction } from '../db/connection.js';
import { DateTime } from 'luxon';

export class GoalProgressService {
  /**
   * Handle book completion event - update all active goals
   * @param {string} userId - User ID
   * @param {string} readingEntryId - Reading entry ID
   * @param {string} bookId - Book ID
   * @param {string} fromState - Previous reading state
   * @returns {Promise<Array>} Updated goals
   */
  static async onBookCompleted(userId, readingEntryId, bookId, fromState = null) {
    return await transaction(async (client) => {
      // 1. Find all active goals for the user
      const activeGoalsResult = await client.query(
        'SELECT * FROM reading_goals WHERE user_id = $1 AND status = $2 ORDER BY created_at',
        [userId, 'active']
      );

      const updatedGoals = [];

      for (const goalRow of activeGoalsResult.rows) {
        // 2. Add progress entry (idempotent - won't duplicate)
        await client.query(
          `INSERT INTO reading_goal_progress
           (goal_id, reading_entry_id, book_id, applied_at, applied_from_state)
           VALUES ($1, $2, $3, NOW(), $4)
           ON CONFLICT (goal_id, reading_entry_id) DO NOTHING`,
          [goalRow.id, readingEntryId, bookId, fromState]
        );

        // 3. Count total progress entries for this goal
        const progressCountResult = await client.query(
          'SELECT COUNT(*) FROM reading_goal_progress WHERE goal_id = $1',
          [goalRow.id]
        );
        const newProgressCount = parseInt(progressCountResult.rows[0].count, 10);

        // 4. Calculate bonus
        const bonusCount = this.calculateBonus(newProgressCount, goalRow.target_count);

        // 5. Check if goal should be completed
        const goal = ReadingGoal.mapRow(goalRow);
        goal.progressCount = newProgressCount;
        goal.bonusCount = bonusCount;

        const statusUpdate = this.determineGoalStatus(goal);

        // 6. Update goal with new progress and status
        const updateResult = await client.query(
          `UPDATE reading_goals
           SET progress_count = $1,
               bonus_count = $2,
               status = COALESCE($3, status),
               completed_at = $4,
               updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [
            newProgressCount,
            bonusCount,
            statusUpdate.shouldUpdate ? statusUpdate.newStatus : null,
            statusUpdate.shouldUpdate ? statusUpdate.completedAt : null,
            goalRow.id,
          ]
        );

        updatedGoals.push(ReadingGoal.mapRow(updateResult.rows[0]));
      }

      return updatedGoals;
    });
  }

  /**
   * Handle book uncompletion event - reverse progress from all goals
   * @param {string} userId - User ID
   * @param {string} readingEntryId - Reading entry ID
   * @returns {Promise<Array>} Updated goals
   */
  static async onBookUncompleted(userId, readingEntryId) {
    return await transaction(async (client) => {
      // 1. Find all goals that have progress entries for this reading entry
      const affectedGoalsResult = await client.query(
        `SELECT DISTINCT rg.*
         FROM reading_goals rg
         JOIN reading_goal_progress rgp ON rgp.goal_id = rg.id
         WHERE rgp.reading_entry_id = $1 AND rg.user_id = $2`,
        [readingEntryId, userId]
      );

      // 2. Delete progress entries for this reading entry
      await client.query(
        'DELETE FROM reading_goal_progress WHERE reading_entry_id = $1',
        [readingEntryId]
      );

      const updatedGoals = [];

      for (const goalRow of affectedGoalsResult.rows) {
        // 3. Recount progress entries for this goal
        const progressCountResult = await client.query(
          'SELECT COUNT(*) FROM reading_goal_progress WHERE goal_id = $1',
          [goalRow.id]
        );
        const newProgressCount = parseInt(progressCountResult.rows[0].count, 10);

        // 4. Recalculate bonus
        const bonusCount = this.calculateBonus(newProgressCount, goalRow.target_count);

        // 5. Determine if status should revert
        let newStatus = goalRow.status;
        let completedAt = goalRow.completed_at;

        // If goal was completed but progress is now below target, revert to active
        if (goalRow.status === 'completed' && newProgressCount < goalRow.target_count) {
          newStatus = 'active';
          completedAt = null;
        }

        // 6. Update goal
        const updateResult = await client.query(
          `UPDATE reading_goals
           SET progress_count = $1,
               bonus_count = $2,
               status = $3,
               completed_at = $4,
               updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [newProgressCount, bonusCount, newStatus, completedAt, goalRow.id]
        );

        updatedGoals.push(ReadingGoal.mapRow(updateResult.rows[0]));
      }

      return updatedGoals;
    });
  }

  /**
   * Check and update goal status based on current state
   * @param {Object} goal - Goal object
   * @returns {Object} Updated status info { shouldUpdate: boolean, newStatus: string, completedAt: Date|null }
   */
  static determineGoalStatus(goal) {
    // Don't transition if already completed or expired
    if (goal.status === 'completed' || goal.status === 'expired') {
      return { shouldUpdate: false };
    }

    // Check if goal should be completed (progress >= target)
    if (goal.progressCount >= goal.targetCount) {
      return {
        shouldUpdate: true,
        newStatus: 'completed',
        completedAt: new Date(),
      };
    }

    // Check if goal is past deadline (expired)
    const deadline = new Date(goal.deadlineAtUtc);
    const now = new Date();

    if (now > deadline) {
      return {
        shouldUpdate: true,
        newStatus: 'expired',
        completedAt: null,
      };
    }

    // No status change needed
    return { shouldUpdate: false };
  }

  /**
   * Calculate bonus count when progress exceeds target
   * @param {number} progressCount - Current progress
   * @param {number} targetCount - Target count
   * @returns {number} Bonus count
   */
  static calculateBonus(progressCount, targetCount) {
    // TODO: Implement in T023
    return Math.max(0, progressCount - targetCount);
  }

  /**
   * Expire overdue goals (for scheduled job)
   * @returns {Promise<Array>} Expired goal IDs
   */
  static async expireOverdueGoals() {
    // TODO: Implement in T052 (User Story 2)
    throw new Error('Not implemented yet');
  }
}
