/**
 * ReadingGoal Model
 * Data access layer for reading_goals table
 * Feature: 003-reading-goals
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

export class ReadingGoal {
  /**
   * Validate goal data before creation/update
   * @param {Object} data - Goal data to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Goal name is required');
    }

    if (!Number.isInteger(data.targetCount) || data.targetCount <= 0) {
      errors.push('Target count must be a positive integer');
    }

    if (data.targetCount > 9999) {
      errors.push('Target count cannot exceed 9999');
    }

    if (!data.deadlineAtUtc || new Date(data.deadlineAtUtc) <= new Date()) {
      errors.push('Deadline must be in the future');
    }

    if (!data.deadlineTimezone) {
      errors.push('Deadline timezone is required');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create a new reading goal
   * @param {Object} goalData - Goal data
   * @returns {Promise<Object>} Created goal
   */
  static async create(goalData) {
    const {
      userId,
      name,
      targetCount,
      deadlineAtUtc,
      deadlineTimezone,
    } = goalData;

    // Validate before creation
    const validation = this.validate(goalData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO reading_goals
       (id, user_id, name, target_count, progress_count, bonus_count, status,
        deadline_at_utc, deadline_timezone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, 0, 'active', $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, userId, name, targetCount, deadlineAtUtc, deadlineTimezone]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find goal by ID
   * @param {string} id - Goal ID
   * @returns {Promise<Object|null>} Goal or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM reading_goals WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all goals for a user with optional status filter
   * @param {string} userId - User ID
   * @param {Object} options - Query options { status, page, pageSize }
   * @returns {Promise<Object>} Goals and pagination info
   */
  static async findByUser(userId, options = {}) {
    const { status, page = 1, pageSize = 50 } = options;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM reading_goals ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get goals with ordering (active first, then by deadline)
    const orderClause = `
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'completed' THEN 2
          WHEN 'expired' THEN 3
        END,
        deadline_at_utc ASC
    `;

    const result = await query(
      `SELECT * FROM reading_goals ${whereClause} ${orderClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const goals = result.rows.map((row) => this.mapRow(row));

    return {
      goals,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: offset + goals.length < total,
      },
    };
  }

  /**
   * Update goal progress and status
   * @param {string} goalId - Goal ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated goal
   */
  static async update(goalId, updates) {
    const {
      progressCount,
      bonusCount,
      status,
      completedAt,
    } = updates;

    const result = await query(
      `UPDATE reading_goals
       SET progress_count = COALESCE($1, progress_count),
           bonus_count = COALESCE($2, bonus_count),
           status = COALESCE($3, status),
           completed_at = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [progressCount, bonusCount, status, completedAt, goalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete a goal
   * @param {string} goalId - Goal ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(goalId) {
    const result = await query(
      'DELETE FROM reading_goals WHERE id = $1',
      [goalId]
    );

    return result.rowCount > 0;
  }

  /**
   * Map database row to goal object with computed properties
   * @param {Object} row - Database row
   * @returns {Object} Mapped goal object
   */
  static mapRow(row) {
    const goal = {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      targetCount: row.target_count,
      progressCount: row.progress_count,
      bonusCount: row.bonus_count,
      status: row.status,
      deadlineAtUtc: row.deadline_at_utc,
      deadlineTimezone: row.deadline_timezone,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Add computed properties
    goal.progressPercentage = Math.min(
      100,
      Math.floor((goal.progressCount / goal.targetCount) * 100)
    );
    goal.isCompleted = goal.status === 'completed';
    goal.isActive = goal.status === 'active';
    goal.isExpired = goal.status === 'expired';
    goal.hasBonus = goal.bonusCount > 0;

    return goal;
  }
}
