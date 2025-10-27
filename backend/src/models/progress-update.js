/**
 * ProgressUpdate model (T076)
 * Handles CRUD operations for progress updates (reading notes)
 */

import { pool } from '../db/connection.js';

/**
 * Create a new progress update
 * @param {Object} data - Progress update data
 * @param {string} data.readingEntryId - ID of the reading entry
 * @param {string} data.note - Progress note content (1-1000 chars)
 * @param {string} [data.pageOrChapter] - Optional page/chapter marker (max 50 chars)
 * @returns {Promise<Object>} Created progress update
 */
export async function create({ readingEntryId, note, pageOrChapter }) {
  // Validation
  if (!note || note.trim().length === 0) {
    throw new Error('Note content is required');
  }

  if (note.length > 1000) {
    throw new Error('Note must not exceed 1000 characters');
  }

  if (pageOrChapter && pageOrChapter.length > 50) {
    throw new Error('Page or chapter marker must not exceed 50 characters');
  }

  const result = await pool.query(
    `INSERT INTO progress_updates (reading_entry_id, note, page_or_chapter)
     VALUES ($1, $2, $3)
     RETURNING id, reading_entry_id, note, page_or_chapter, created_at`,
    [readingEntryId, note.trim(), pageOrChapter || null]
  );

  return result.rows[0];
}

/**
 * Find all progress updates for a reading entry
 * @param {string} readingEntryId - ID of the reading entry
 * @returns {Promise<Array>} Progress updates ordered by created_at DESC (newest first)
 */
export async function findByEntry(readingEntryId) {
  const result = await pool.query(
    `SELECT id, reading_entry_id, note, page_or_chapter, created_at
     FROM progress_updates
     WHERE reading_entry_id = $1
     ORDER BY created_at DESC`,
    [readingEntryId]
  );

  return result.rows;
}

/**
 * Find a progress update by ID
 * @param {string} id - Progress update ID
 * @returns {Promise<Object|null>} Progress update or null
 */
export async function findById(id) {
  const result = await pool.query(
    `SELECT id, reading_entry_id, note, page_or_chapter, created_at
     FROM progress_updates
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Count progress updates for a reading entry
 * @param {string} readingEntryId - ID of the reading entry
 * @returns {Promise<number>} Count of progress updates
 */
export async function countByEntry(readingEntryId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int as count
     FROM progress_updates
     WHERE reading_entry_id = $1`,
    [readingEntryId]
  );

  return result.rows[0].count;
}

/**
 * Delete a progress update by ID
 * @param {string} id - Progress update ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteById(id) {
  const result = await pool.query(
    `DELETE FROM progress_updates
     WHERE id = $1`,
    [id]
  );

  return result.rowCount > 0;
}

export default {
  create,
  findByEntry,
  findById,
  countByEntry,
  deleteById,
};
