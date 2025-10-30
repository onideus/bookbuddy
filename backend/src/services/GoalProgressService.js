/**
 * GoalProgressService
 * Handles reading goal progress tracking, state transitions, and book completion events
 * Feature: 003-reading-goals
 * Tasks: T020-T023
 */

import { ReadingGoal } from '../models/reading-goal.js';
import { ReadingGoalProgress } from '../models/reading-goal-progress.js';
import { query, getClient } from '../db/connection.js';
import { DateTime } from 'luxon';
import logger from '../lib/logger.js';

export class GoalProgressService {
  /**
   * Handle book completion event - increment progress for all active goals (T020)
   * Uses transaction to ensure atomicity
   *
   * @param {Object} params - Event parameters
   * @param {string} params.userId - User ID
   * @param {string} params.readingEntryId - Reading entry ID
   * @param {string} params.bookId - Book ID
   * @returns {Promise<Array>} Updated goals
   */
  static async onBookCompleted({ userId, readingEntryId, bookId }) {
    const client = await getClient();
    const updatedGoals = [];

    try {
      await client.query('BEGIN');

      // Find all active goals for this user
      const activeGoalsResult = await client.query(
        `SELECT * FROM reading_goals
         WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at`,
        [userId]
      );

      for (const goalRow of activeGoalsResult.rows) {
        const goal = ReadingGoal.mapRow(goalRow);

        // Create progress entry (idempotent due to unique constraint)
        await client.query(
          `INSERT INTO reading_goal_progress
           (goal_id, reading_entry_id, book_id, applied_at, applied_from_state)
           VALUES ($1, $2, $3, NOW(), 'FINISHED')
           ON CONFLICT (goal_id, reading_entry_id) DO NOTHING`,
          [goal.id, readingEntryId, bookId]
        );

        // Increment progress count
        const newProgressCount = goal.progressCount + 1;

        // Calculate bonus count (T023)
        let newBonusCount = goal.bonusCount;
        if (newProgressCount > goal.targetCount) {
          newBonusCount = newProgressCount - goal.targetCount;
        }

        // Check if goal should transition to completed (T022)
        let newStatus = goal.status;
        let completedAt = goal.completedAt;

        if (newProgressCount >= goal.targetCount && goal.status === 'active') {
          newStatus = 'completed';
          completedAt = DateTime.now().toISO();

          logger.info({
            goalId: goal.id,
            userId,
            targetCount: goal.targetCount,
            progressCount: newProgressCount,
          }, 'Goal completed');
        }

        // Update goal with new progress
        const updateResult = await client.query(
          `UPDATE reading_goals
           SET progress_count = $1,
               bonus_count = $2,
               status = $3,
               completed_at = $4,
               updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [newProgressCount, newBonusCount, newStatus, completedAt, goal.id]
        );

        if (updateResult.rows.length > 0) {
          updatedGoals.push(ReadingGoal.mapRow(updateResult.rows[0]));
        }

        logger.debug({
          goalId: goal.id,
          userId,
          readingEntryId,
          bookId,
          newProgressCount,
          newBonusCount,
          status: newStatus,
        }, 'Goal progress incremented');
      }

      await client.query('COMMIT');
      return updatedGoals;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        error: error.message,
        userId,
        readingEntryId,
        bookId,
      }, 'Failed to update goal progress on book completion');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle book uncompletion event - decrement progress for all affected goals (T021)
   * Uses transaction to ensure atomicity
   * Implements reversal logic including status reversion
   *
   * @param {Object} params - Event parameters
   * @param {string} params.readingEntryId - Reading entry ID to remove
   * @returns {Promise<Array>} Updated goals
   */
  static async onBookUncompleted({ readingEntryId }) {
    const client = await getClient();
    const updatedGoals = [];

    try {
      await client.query('BEGIN');

      // Find all goals affected by this reading entry
      const affectedProgressResult = await client.query(
        `SELECT goal_id FROM reading_goal_progress
         WHERE reading_entry_id = $1`,
        [readingEntryId]
      );

      const affectedGoalIds = affectedProgressResult.rows.map(row => row.goal_id);

      // Delete progress entries for this reading entry
      await client.query(
        `DELETE FROM reading_goal_progress
         WHERE reading_entry_id = $1`,
        [readingEntryId]
      );

      // Update each affected goal
      for (const goalId of affectedGoalIds) {
        const goalResult = await client.query(
          'SELECT * FROM reading_goals WHERE id = $1',
          [goalId]
        );

        if (goalResult.rows.length === 0) continue;

        const goal = ReadingGoal.mapRow(goalResult.rows[0]);

        // Decrement progress count
        const newProgressCount = Math.max(0, goal.progressCount - 1);

        // Recalculate bonus count (T023)
        let newBonusCount = 0;
        if (newProgressCount > goal.targetCount) {
          newBonusCount = newProgressCount - goal.targetCount;
        }

        // Check if we need to revert status (T022)
        let newStatus = goal.status;
        let completedAt = goal.completedAt;

        // If goal was completed and progress drops below target
        if (goal.status === 'completed' && newProgressCount < goal.targetCount) {
          // Check if deadline has passed
          const deadline = DateTime.fromISO(goal.deadlineAtUtc);
          const now = DateTime.now();

          if (now < deadline) {
            // Before deadline: revert to active
            newStatus = 'active';
            completedAt = null;

            logger.info({
              goalId: goal.id,
              newProgressCount,
              targetCount: goal.targetCount,
            }, 'Goal reverted from completed to active');
          }
          // After deadline: keep completed status (historical record)
        }

        // Update goal with decremented progress
        const updateResult = await client.query(
          `UPDATE reading_goals
           SET progress_count = $1,
               bonus_count = $2,
               status = $3,
               completed_at = $4,
               updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [newProgressCount, newBonusCount, newStatus, completedAt, goalId]
        );

        if (updateResult.rows.length > 0) {
          updatedGoals.push(ReadingGoal.mapRow(updateResult.rows[0]));
        }

        logger.debug({
          goalId,
          readingEntryId,
          newProgressCount,
          newBonusCount,
          status: newStatus,
        }, 'Goal progress decremented');
      }

      await client.query('COMMIT');
      return updatedGoals;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        error: error.message,
        readingEntryId,
      }, 'Failed to update goal progress on book uncompletion');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Expire overdue goals (for scheduled job - User Story 2, T052)
   * Marks goals as expired when deadline has passed without completion
   *
   * @returns {Promise<number>} Number of goals expired
   */
  static async expireOverdueGoals() {
    try {
      const now = DateTime.now().toISO();

      const result = await query(
        `UPDATE reading_goals
         SET status = 'expired',
             updated_at = NOW()
         WHERE status = 'active'
           AND deadline_at_utc < $1
         RETURNING id`,
        [now]
      );

      const expiredCount = result.rowCount;

      if (expiredCount > 0) {
        logger.info({ expiredCount }, 'Expired overdue goals');
      }

      return expiredCount;
    } catch (error) {
      logger.error({
        error: error.message,
      }, 'Failed to expire overdue goals');
      throw error;
    }
  }
}
