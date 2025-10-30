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
    const {
      title,
      author,
      edition = null,
      isbn = null,
      coverImageUrl = null,
      subtitle = null,
      language = null,
      publisher = null,
      publicationDate = null,
      pageCount = null,
      description = null,
      categories = null,
    } = bookData;

    // Validate field lengths
    if (title && title.length > 500) {
      throw new Error('Title must not exceed 500 characters');
    }
    if (author && author.length > 200) {
      throw new Error('Author must not exceed 200 characters');
    }
    if (edition && edition.length > 100) {
      throw new Error('Edition must not exceed 100 characters');
    }
    if (isbn && isbn.length > 20) {
      throw new Error('ISBN must not exceed 20 characters');
    }
    if (subtitle && subtitle.length > 500) {
      throw new Error('Subtitle must not exceed 500 characters');
    }
    if (publisher && publisher.length > 200) {
      throw new Error('Publisher must not exceed 200 characters');
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO books (id, title, author, edition, isbn, cover_image_url,
        subtitle, language, publisher, publication_date, page_count, description, categories,
        created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING *`,
      [
        id,
        title,
        author,
        edition,
        isbn,
        coverImageUrl,
        subtitle,
        language,
        publisher,
        publicationDate,
        pageCount,
        description,
        categories,
      ]
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
    // Validate field lengths
    if (updates.title && updates.title.length > 500) {
      throw new Error('Title must not exceed 500 characters');
    }
    if (updates.author && updates.author.length > 200) {
      throw new Error('Author must not exceed 200 characters');
    }
    if (updates.edition && updates.edition.length > 100) {
      throw new Error('Edition must not exceed 100 characters');
    }
    if (updates.isbn && updates.isbn.length > 20) {
      throw new Error('ISBN must not exceed 20 characters');
    }
    if (updates.subtitle && updates.subtitle.length > 500) {
      throw new Error('Subtitle must not exceed 500 characters');
    }
    if (updates.publisher && updates.publisher.length > 200) {
      throw new Error('Publisher must not exceed 200 characters');
    }

    const allowedFields = [
      'title',
      'author',
      'edition',
      'isbn',
      'cover_image_url',
      'subtitle',
      'language',
      'publisher',
      'publication_date',
      'page_count',
      'description',
      'categories',
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
   * Find book by fingerprint (for duplicate detection)
   * @param {string} fingerprint - Book fingerprint
   * @returns {Promise<Object|null>} Book or null
   */
  static async findByFingerprint(fingerprint) {
    const result = await query('SELECT * FROM books WHERE fingerprint = $1', [fingerprint]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Fuzzy search by normalized title and author using pg_trgm
   * @param {string} normalizedTitle - Normalized title
   * @param {string} primaryAuthor - Primary author
   * @param {number} threshold - Similarity threshold (0.0-1.0, default 0.8)
   * @returns {Promise<Array>} Array of matching books with similarity scores
   */
  static async fuzzySearch(normalizedTitle, primaryAuthor, threshold = 0.8) {
    const result = await query(
      `SELECT *,
        similarity(normalized_title, $1) as title_similarity,
        similarity(primary_author, $2) as author_similarity,
        (similarity(normalized_title, $1) + similarity(primary_author, $2)) / 2 as avg_similarity
       FROM books
       WHERE similarity(normalized_title, $1) > $3
         OR similarity(primary_author, $2) > $3
       ORDER BY avg_similarity DESC
       LIMIT 10`,
      [normalizedTitle, primaryAuthor, threshold]
    );

    return result.rows.map((row) => ({
      ...this.mapRow(row),
      titleSimilarity: parseFloat(row.title_similarity),
      authorSimilarity: parseFloat(row.author_similarity),
      avgSimilarity: parseFloat(row.avg_similarity),
    }));
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
      normalizedTitle: row.normalized_title,
      primaryAuthor: row.primary_author,
      subtitle: row.subtitle,
      language: row.language,
      publisher: row.publisher,
      publicationDate: row.publication_date,
      pageCount: row.page_count,
      description: row.description,
      categories: row.categories,
      fingerprint: row.fingerprint,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default Book;
