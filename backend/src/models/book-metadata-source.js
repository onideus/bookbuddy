/**
 * BookMetadataSource Model (T009)
 * Data access layer for book_metadata_sources table
 * Tracks provenance of external API data for accuracy auditing
 */

import { query } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export class BookMetadataSource {
  /**
   * Create a new metadata source record
   * @param {Object} sourceData - Source data
   * @returns {Promise<Object>} Created source
   */
  static async create(sourceData) {
    const {
      bookEditionId,
      provider,
      providerRequestId = null,
      etag = null,
      rawPayload,
    } = sourceData;

    // Validate required fields
    if (!bookEditionId) {
      throw new Error('bookEditionId is required');
    }
    if (!provider) {
      throw new Error('provider is required');
    }
    if (!rawPayload) {
      throw new Error('rawPayload is required');
    }

    // Validate provider
    const validProviders = ['google_books', 'open_library', 'manual'];
    if (!validProviders.includes(provider)) {
      throw new Error(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO book_metadata_sources
       (id, book_edition_id, provider, provider_request_id, etag, raw_payload, fetched_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, bookEditionId, provider, providerRequestId, etag, JSON.stringify(rawPayload)]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find source by ID
   * @param {string} id - Source ID
   * @returns {Promise<Object|null>} Source or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM book_metadata_sources WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all sources for a book edition
   * @param {string} bookEditionId - Book edition ID
   * @returns {Promise<Array>} Array of sources
   */
  static async findByEdition(bookEditionId) {
    const result = await query(
      'SELECT * FROM book_metadata_sources WHERE book_edition_id = $1 ORDER BY fetched_at DESC',
      [bookEditionId]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Find latest source for a book edition by provider
   * @param {string} bookEditionId - Book edition ID
   * @param {string} provider - Provider name
   * @returns {Promise<Object|null>} Source or null
   */
  static async findLatestByEditionAndProvider(bookEditionId, provider) {
    const result = await query(
      `SELECT * FROM book_metadata_sources
       WHERE book_edition_id = $1 AND provider = $2
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [bookEditionId, provider]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete old metadata sources (for cleanup/retention)
   * @param {number} daysOld - Delete sources older than this many days
   * @returns {Promise<number>} Number of records deleted
   */
  static async deleteOlderThan(daysOld) {
    const result = await query(
      `DELETE FROM book_metadata_sources
       WHERE created_at < NOW() - INTERVAL '${daysOld} days'`
    );

    return result.rowCount;
  }

  /**
   * Map database row to JavaScript object
   * @param {Object} row - Database row
   * @returns {Object} Mapped object
   */
  static mapRow(row) {
    return {
      id: row.id,
      bookEditionId: row.book_edition_id,
      provider: row.provider,
      providerRequestId: row.provider_request_id,
      fetchedAt: row.fetched_at,
      etag: row.etag,
      payloadHash: row.payload_hash,
      rawPayload: row.raw_payload,
      createdAt: row.created_at,
    };
  }
}

export default BookMetadataSource;
