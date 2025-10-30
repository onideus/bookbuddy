/**
 * ReadingGoalProgress Model
 * Data access layer for reading_goal_progress junction table
 * Feature: 003-reading-goals
 */

import { query } from '../db/connection.js';

export class ReadingGoalProgress {
  /**
   * Record book completion toward a goal
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Created progress entry
   */
  static async create(progressData) {
    const {
      goalId,
      readingEntryId,
      bookId,
      appliedFromState = null,
    } = progressData;

    const result = await query(
      `INSERT INTO reading_goal_progress
       (goal_id, reading_entry_id, book_id, applied_at, applied_from_state)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (goal_id, reading_entry_id) DO NOTHING
       RETURNING *`,
      [goalId, readingEntryId, bookId, appliedFromState]
    );

    if (result.rows.length === 0) {
      // Already exists (conflict)
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Remove book completion from a goal (when unmarking)
   * @param {string} goalId - Goal ID
   * @param {string} readingEntryId - Reading entry ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(goalId, readingEntryId) {
    const result = await query(
      'DELETE FROM reading_goal_progress WHERE goal_id = $1 AND reading_entry_id = $2',
      [goalId, readingEntryId]
    );

    return result.rowCount > 0;
  }

  /**
   * Delete all progress entries for a reading entry (when unmarking book)
   * @param {string} readingEntryId - Reading entry ID
   * @returns {Promise<number>} Number of goals affected
   */
  static async deleteByReadingEntry(readingEntryId) {
    const result = await query(
      'DELETE FROM reading_goal_progress WHERE reading_entry_id = $1 RETURNING goal_id',
      [readingEntryId]
    );

    return result.rows.length; // Return count of affected goals
  }

  /**
   * Get all books contributing to a goal
   * @param {string} goalId - Goal ID
   * @returns {Promise<Array>} Progress entries with book details
   */
  static async findByGoal(goalId) {
    const result = await query(
      `SELECT rgp.*,
              b.title, b.author
       FROM reading_goal_progress rgp
       JOIN books b ON b.id = rgp.book_id
       WHERE rgp.goal_id = $1
       ORDER BY rgp.applied_at DESC`,
      [goalId]
    );

    return result.rows.map((row) => this.mapRowWithBook(row));
  }

  /**
   * Get all goals a reading entry contributes to
   * @param {string} readingEntryId - Reading entry ID
   * @returns {Promise<Array>} Progress entries
   */
  static async findByReadingEntry(readingEntryId) {
    const result = await query(
      'SELECT * FROM reading_goal_progress WHERE reading_entry_id = $1',
      [readingEntryId]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Map database row to progress object
   * @param {Object} row - Database row
   * @returns {Object} Mapped progress object
   */
  static mapRow(row) {
    return {
      goalId: row.goal_id,
      readingEntryId: row.reading_entry_id,
      bookId: row.book_id,
      appliedAt: row.applied_at,
      appliedFromState: row.applied_from_state,
    };
  }

  /**
   * Map database row with book details to progress object
   * @param {Object} row - Database row with joined book data
   * @returns {Object} Mapped progress object with book info
   */
  static mapRowWithBook(row) {
    return {
      ...this.mapRow(row),
      book: {
        title: row.title,
        author: row.author,
      },
    };
  }
}
