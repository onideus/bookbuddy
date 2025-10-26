/**
 * StatusTransition Model (T045)
 * Data access layer for status_transitions table
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export class StatusTransition {
  /**
   * Create a new status transition
   * @param {Object} transitionData - Transition data
   * @returns {Promise<Object>} Created transition
   */
  static async create(transitionData) {
    const { readingEntryId, fromStatus, toStatus } = transitionData;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO status_transitions
       (id, reading_entry_id, from_status, to_status, transitioned_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id, readingEntryId, fromStatus, toStatus]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all transitions for a reading entry
   * @param {string} readingEntryId - Reading entry ID
   * @returns {Promise<Array>} Transitions in reverse chronological order
   */
  static async findByEntry(readingEntryId) {
    const result = await query(
      `SELECT * FROM status_transitions
       WHERE reading_entry_id = $1
       ORDER BY transitioned_at DESC`,
      [readingEntryId]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get the latest transition for a reading entry
   * @param {string} readingEntryId - Reading entry ID
   * @returns {Promise<Object|null>} Latest transition or null
   */
  static async getLatest(readingEntryId) {
    const result = await query(
      `SELECT * FROM status_transitions
       WHERE reading_entry_id = $1
       ORDER BY transitioned_at DESC
       LIMIT 1`,
      [readingEntryId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Map database row to JavaScript object
   * @param {Object} row - Database row
   * @returns {Object} Mapped object
   */
  static mapRow(row) {
    return {
      id: row.id,
      readingEntryId: row.reading_entry_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      transitionedAt: row.transitioned_at,
    };
  }
}

export default StatusTransition;
