/**
 * Test data helpers for creating and cleaning up test data
 * Used across all test types
 */

import { query } from '../../src/db/connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a test reader profile
 * @param {Object} app - Fastify instance (optional, for session setup)
 * @param {string} username - Optional username identifier
 * @returns {Promise<string>} Reader ID
 */
export async function createTestReader(app, username = 'test-reader') {
  const readerId = uuidv4();

  await query(
    `INSERT INTO reader_profiles (id, created_at, updated_at)
     VALUES ($1, NOW(), NOW())`,
    [readerId]
  );

  return readerId;
}

/**
 * Create a test book and reading entry
 * @param {Object} app - Fastify instance
 * @param {string} readerId - Reader ID
 * @param {string} sessionCookie - Session cookie
 * @param {Object} bookData - Book data
 * @returns {Promise<Object>} Created reading entry
 */
export async function createTestBook(app, readerId, sessionCookie, bookData) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/readers/${readerId}/reading-entries`,
    headers: {
      cookie: sessionCookie,
    },
    payload: bookData,
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to create test book: ${response.body}`);
  }

  return response.json();
}

/**
 * Clean up test data for a specific reader
 * @param {string} readerId - Optional reader ID to clean up (if not provided, cleans all test data)
 */
export async function cleanupTestData(readerId = null) {
  if (readerId) {
    // Delete reader-specific data (cascades to reading entries, progress, transitions)
    await query('DELETE FROM reader_profiles WHERE id = $1', [readerId]);
  } else {
    // Clean up all test data
    await query('TRUNCATE TABLE status_transitions CASCADE');
    await query('TRUNCATE TABLE progress_updates CASCADE');
    await query('TRUNCATE TABLE reading_entries CASCADE');
    await query('TRUNCATE TABLE books CASCADE');
    await query('TRUNCATE TABLE reader_profiles CASCADE');
    await query('TRUNCATE TABLE sessions CASCADE');
  }
}

/**
 * Create a test book directly in database (bypassing API)
 * @param {string} bookData - Book data
 * @returns {Promise<Object>} Created book
 */
export async function createBookDirect(bookData) {
  const bookId = uuidv4();
  const { title, author, edition = null, isbn = null } = bookData;

  const result = await query(
    `INSERT INTO books (id, title, author, edition, isbn, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [bookId, title, author, edition, isbn]
  );

  return result.rows[0].id;
}

/**
 * Create a test reading entry directly in database
 * @param {string} readerId - Reader ID
 * @param {string} bookId - Book ID
 * @param {string} status - Reading status
 * @returns {Promise<Object>} Created reading entry
 */
export async function createReadingEntryDirect(readerId, bookId, status = 'TO_READ') {
  const entryId = uuidv4();

  const result = await query(
    `INSERT INTO reading_entries (id, reader_id, book_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [entryId, readerId, bookId, status]
  );

  return result.rows[0].id;
}

/**
 * Create a status transition directly in database
 * @param {string} entryId - Reading entry ID
 * @param {string} fromStatus - From status (null for initial)
 * @param {string} toStatus - To status
 * @returns {Promise<Object>} Created transition
 */
export async function createStatusTransitionDirect(entryId, fromStatus, toStatus) {
  const transitionId = uuidv4();

  const result = await query(
    `INSERT INTO status_transitions (id, reading_entry_id, from_status, to_status, transitioned_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [transitionId, entryId, fromStatus, toStatus]
  );

  return result.rows[0];
}

export default {
  createTestReader,
  createTestBook,
  cleanupTestData,
  createBookDirect,
  createReadingEntryDirect,
  createStatusTransitionDirect,
};
