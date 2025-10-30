/**
 * ReadingEntryOverride Model (T010)
 * Data access layer for reading_entry_overrides table
 * Per-user field modifications to book metadata
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export class ReadingEntryOverride {
  /**
   * Create or update an override for a reading entry field
   * @param {Object} overrideData - Override data
   * @returns {Promise<Object>} Created/updated override
   */
  static async upsert(overrideData) {
    const { readingEntryId, fieldName, overrideValue } = overrideData;

    // Validate required fields
    if (!readingEntryId) {
      throw new Error('readingEntryId is required');
    }
    if (!fieldName) {
      throw new Error('fieldName is required');
    }
    if (overrideValue === undefined || overrideValue === null) {
      throw new Error('overrideValue is required');
    }

    // Validate field name
    const validFields = [
      'title',
      'author',
      'subtitle',
      'page_count',
      'publisher',
      'publication_date',
      'description',
      'language',
      'edition',
    ];
    if (!validFields.includes(fieldName)) {
      throw new Error(`Invalid field_name. Must be one of: ${validFields.join(', ')}`);
    }

    const id = uuidv4();

    // Use INSERT ... ON CONFLICT to upsert
    const result = await query(
      `INSERT INTO reading_entry_overrides (id, reading_entry_id, field_name, override_value, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (reading_entry_id, field_name)
       DO UPDATE SET override_value = EXCLUDED.override_value, updated_at = NOW()
       RETURNING *`,
      [id, readingEntryId, fieldName, overrideValue]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find override by ID
   * @param {string} id - Override ID
   * @returns {Promise<Object|null>} Override or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM reading_entry_overrides WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all overrides for a reading entry
   * @param {string} readingEntryId - Reading entry ID
   * @returns {Promise<Array>} Array of overrides
   */
  static async findByReadingEntry(readingEntryId) {
    const result = await query(
      'SELECT * FROM reading_entry_overrides WHERE reading_entry_id = $1 ORDER BY field_name',
      [readingEntryId]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Find specific override for a reading entry and field
   * @param {string} readingEntryId - Reading entry ID
   * @param {string} fieldName - Field name
   * @returns {Promise<Object|null>} Override or null
   */
  static async findByReadingEntryAndField(readingEntryId, fieldName) {
    const result = await query(
      'SELECT * FROM reading_entry_overrides WHERE reading_entry_id = $1 AND field_name = $2',
      [readingEntryId, fieldName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete override by ID
   * @param {string} id - Override ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM reading_entry_overrides WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * Delete override by reading entry and field
   * @param {string} readingEntryId - Reading entry ID
   * @param {string} fieldName - Field name
   * @returns {Promise<boolean>} True if deleted
   */
  static async deleteByReadingEntryAndField(readingEntryId, fieldName) {
    const result = await query(
      'DELETE FROM reading_entry_overrides WHERE reading_entry_id = $1 AND field_name = $2',
      [readingEntryId, fieldName]
    );
    return result.rowCount > 0;
  }

  /**
   * Hydrate book data with overrides for display
   * @param {Object} bookData - Original book data
   * @param {Array} overrides - Array of override objects
   * @returns {Object} Book data with overrides applied
   */
  static hydrateBookData(bookData, overrides) {
    const hydrated = { ...bookData };

    for (const override of overrides) {
      // Convert snake_case field names to camelCase
      const camelFieldName = override.fieldName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      hydrated[camelFieldName] = override.overrideValue;
    }

    return hydrated;
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
      fieldName: row.field_name,
      overrideValue: row.override_value,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default ReadingEntryOverride;
