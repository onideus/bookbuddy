/**
 * ReaderProfile Model (T046)
 * Data access layer for reader_profiles table
 */

import { query } from '../db/connection.js';

export class ReaderProfile {
  /**
   * Create a new reader profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  static async create(profileData) {
    const {
      id,
      defaultSort = null,
      notificationPreferences = null,
      accessibilitySettings = null,
    } = profileData;

    const result = await query(
      `INSERT INTO reader_profiles
       (id, default_sort, notification_preferences, accessibility_settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [id, defaultSort, notificationPreferences, accessibilitySettings]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find reader profile by ID
   * @param {string} id - Reader ID
   * @returns {Promise<Object|null>} Profile or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM reader_profiles WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update reader profile preferences
   * @param {string} id - Reader ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated profile
   */
  static async update(id, updates) {
    const allowedFields = [
      'default_sort',
      'notification_preferences',
      'accessibility_settings',
    ];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClause.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE reader_profiles
       SET ${setClause.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

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
      defaultSort: row.default_sort,
      notificationPreferences: row.notification_preferences,
      accessibilitySettings: row.accessibility_settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default ReaderProfile;
