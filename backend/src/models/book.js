/**
 * Book Model (T043)
 * Data access layer for books table
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export class Book {
  /**
   * Create a new book
   * @param {Object} bookData - Book data
   * @returns {Promise<Object>} Created book
   */
  static async create(bookData) {
    const { title, author, edition = null, isbn = null, coverImageUrl = null } = bookData;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO books (id, title, author, edition, isbn, cover_image_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, title, author, edition, isbn, coverImageUrl]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find book by ID
   * @param {string} id - Book ID
   * @returns {Promise<Object|null>} Book or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM books WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find book by title, author, and edition (for duplicate detection)
   * @param {string} title - Book title
   * @param {string} author - Author name
   * @param {string|null} edition - Edition
   * @returns {Promise<Object|null>} Book or null
   */
  static async findByTitleAuthorEdition(title, author, edition = null) {
    const result = await query(
      `SELECT * FROM books
       WHERE title = $1
       AND author = $2
       AND COALESCE(edition, '') = COALESCE($3, '')`,
      [title, author, edition]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update book
   * @param {string} id - Book ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated book or null
   */
  static async update(id, updates) {
    const allowedFields = ['title', 'author', 'edition', 'isbn', 'cover_image_url'];
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
      `UPDATE books
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
   * Map database row to JavaScript object
   * @param {Object} row - Database row
   * @returns {Object} Mapped object
   */
  static mapRow(row) {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      edition: row.edition,
      isbn: row.isbn,
      coverImageUrl: row.cover_image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default Book;
