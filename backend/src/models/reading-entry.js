/**
 * ReadingEntry Model (T044)
 * Data access layer for reading_entries table
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export class ReadingEntry {
  /**
   * Create a new reading entry
   * @param {Object} entryData - Entry data
   * @returns {Promise<Object>} Created entry
   */
  static async create(entryData) {
    const {
      readerId,
      bookId,
      status,
      rating = null,
      reflectionNote = null,
    } = entryData;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO reading_entries
       (id, reader_id, book_id, status, rating, reflection_note, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, readerId, bookId, status, rating, reflectionNote]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find reading entry by ID
   * @param {string} id - Entry ID
   * @returns {Promise<Object|null>} Entry or null
   */
  static async findById(id) {
    const result = await query(
      `SELECT re.*,
              b.id as book_id, b.title, b.author, b.edition, b.isbn, b.cover_image_url
       FROM reading_entries re
       JOIN books b ON b.id = re.book_id
       WHERE re.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowWithBook(result.rows[0]);
  }

  /**
   * Find all reading entries for a reader
   * @param {string} readerId - Reader ID
   * @param {Object} options - Query options (page, pageSize)
   * @returns {Promise<Object>} Entries and pagination info
   */
  static async findByReader(readerId, options = {}) {
    const { page = 1, pageSize = 50 } = options;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM reading_entries WHERE reader_id = $1',
      [readerId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get entries with books
    const result = await query(
      `SELECT re.*,
              b.id as book_id, b.title, b.author, b.edition, b.isbn, b.cover_image_url
       FROM reading_entries re
       JOIN books b ON b.id = re.book_id
       WHERE re.reader_id = $1
       ORDER BY re.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [readerId, pageSize, offset]
    );

    const entries = result.rows.map((row) => this.mapRowWithBook(row));

    return {
      entries,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: offset + entries.length < total,
      },
    };
  }

  /**
   * Find reading entries by reader and status
   * @param {string} readerId - Reader ID
   * @param {string} status - Status filter
   * @returns {Promise<Array>} Entries
   */
  static async findByReaderAndStatus(readerId, status) {
    const result = await query(
      `SELECT re.*,
              b.id as book_id, b.title, b.author, b.edition, b.isbn, b.cover_image_url
       FROM reading_entries re
       JOIN books b ON b.id = re.book_id
       WHERE re.reader_id = $1 AND re.status = $2
       ORDER BY re.updated_at DESC`,
      [readerId, status]
    );

    return result.rows.map((row) => this.mapRowWithBook(row));
  }

  /**
   * Update entry status
   * @param {string} id - Entry ID
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} Updated entry
   */
  static async updateStatus(id, newStatus) {
    const result = await query(
      `UPDATE reading_entries
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Reading entry not found');
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete reading entry
   * @param {string} id - Entry ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM reading_entries WHERE id = $1', [id]);

    return result.rowCount > 0;
  }

  /**
   * Map database row to JavaScript object
   * @param {Object} row - Database row
   * @returns {Object} Mapped object
   */
  static mapRow(row) {
    return {
      id: row.id,
      readerId: row.reader_id,
      bookId: row.book_id,
      status: row.status,
      rating: row.rating,
      reflectionNote: row.reflection_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row with book details
   * @param {Object} row - Database row
   * @returns {Object} Mapped object with book
   */
  static mapRowWithBook(row) {
    return {
      id: row.id,
      readerId: row.reader_id,
      status: row.status,
      rating: row.rating,
      reflectionNote: row.reflection_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      book: {
        id: row.book_id,
        title: row.title,
        author: row.author,
        edition: row.edition,
        isbn: row.isbn,
        coverImageUrl: row.cover_image_url,
      },
    };
  }
}

export default ReadingEntry;
