/**
 * BookEdition Model (T008)
 * Data access layer for book_editions table
 * Edition-specific data (ISBN, format, cover image) for canonical books
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export class BookEdition {
  /**
   * Create a new book edition
   * @param {Object} editionData - Edition data
   * @returns {Promise<Object>} Created edition
   */
  static async create(editionData) {
    const {
      bookId,
      isbn10 = null,
      isbn13 = null,
      edition = null,
      format = null,
      coverImageUrl = null,
      providerId = null,
    } = editionData;

    // Validate required fields
    if (!bookId) {
      throw new Error('bookId is required');
    }

    // Validate at least one identifier exists
    if (!isbn10 && !isbn13 && !providerId) {
      throw new Error('At least one of isbn10, isbn13, or providerId is required');
    }

    // Validate ISBN formats
    if (isbn10 && !/^[0-9]{9}[0-9X]$/.test(isbn10)) {
      throw new Error('Invalid ISBN-10 format');
    }
    if (isbn13 && !/^97[89][0-9]{10}$/.test(isbn13)) {
      throw new Error('Invalid ISBN-13 format');
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO book_editions (id, book_id, isbn_10, isbn_13, edition, format, cover_image_url, provider_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [id, bookId, isbn10, isbn13, edition, format, coverImageUrl, providerId]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find edition by ID
   * @param {string} id - Edition ID
   * @returns {Promise<Object|null>} Edition or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM book_editions WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find edition by ISBN (checks both ISBN-10 and ISBN-13)
   * @param {string} isbn - ISBN-10 or ISBN-13
   * @returns {Promise<Object|null>} Edition or null
   */
  static async findByISBN(isbn) {
    const result = await query(
      'SELECT * FROM book_editions WHERE isbn_10 = $1 OR isbn_13 = $1',
      [isbn]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find edition by provider ID
   * @param {string} providerId - Provider-specific identifier
   * @returns {Promise<Object|null>} Edition or null
   */
  static async findByProviderId(providerId) {
    const result = await query('SELECT * FROM book_editions WHERE provider_id = $1', [providerId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all editions for a book
   * @param {string} bookId - Book ID
   * @returns {Promise<Array>} Array of editions
   */
  static async findByBookId(bookId) {
    const result = await query(
      'SELECT * FROM book_editions WHERE book_id = $1 ORDER BY created_at DESC',
      [bookId]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Update edition
   * @param {string} id - Edition ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated edition or null
   */
  static async update(id, updates) {
    const allowedFields = ['edition', 'format', 'cover_image_url', 'provider_id'];
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
      `UPDATE book_editions
       SET ${setClause.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete edition by ID
   * @param {string} id - Edition ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM book_editions WHERE id = $1', [id]);
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
      bookId: row.book_id,
      isbn10: row.isbn_10,
      isbn13: row.isbn_13,
      edition: row.edition,
      format: row.format,
      coverImageUrl: row.cover_image_url,
      providerId: row.provider_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default BookEdition;
