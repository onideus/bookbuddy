/**
 * Contract Test: Rating API Endpoints (T093)
 * Tests API contract for rating endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../src/server.js';
import { query } from '../../src/db/connection.js';
import { v4 as uuidv4 } from 'uuid';

describe('Rating API Contract Tests', () => {
  let app;
  let readerId;
  let sessionCookie;
  let bookId;
  let entryId;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await query('DELETE FROM progress_updates');
    await query('DELETE FROM status_transitions');
    await query('DELETE FROM reading_entries');
    await query('DELETE FROM books');
    await query('DELETE FROM reader_profiles');

    // Create test reader
    readerId = uuidv4();
    await query(
      'INSERT INTO reader_profiles (id) VALUES ($1)',
      [readerId]
    );

    // Authenticate
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/session',
      payload: { readerId: readerId },
    });
    sessionCookie = loginResponse.headers['set-cookie'];

    // Create test book
    bookId = uuidv4();
    await query(
      'INSERT INTO books (id, title, author) VALUES ($1, $2, $3)',
      [bookId, 'Test Book', 'Test Author']
    );

    // Create FINISHED reading entry
    entryId = uuidv4();
    await query(
      `INSERT INTO reading_entries (id, reader_id, book_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [entryId, readerId, bookId, 'FINISHED']
    );
  });

  describe('PUT /api/reading-entries/:entryId/rating', () => {
    it('should set rating and reflection for finished book', async () => {
      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 4,
          reflectionNote: 'Great book! Really enjoyed the character development.',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('readingEntry');
      expect(body.readingEntry.rating).toBe(4);
      expect(body.readingEntry.reflectionNote).toBe('Great book! Really enjoyed the character development.');
      expect(body.readingEntry.status).toBe('FINISHED');
    });

    it('should set rating without reflection note', async () => {
      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.readingEntry.rating).toBe(5);
      expect(body.readingEntry.reflectionNote).toBeNull();
    });

    it('should reject rating for non-finished book', async () => {
      // Create READING entry
      const readingEntryId = uuidv4();
      await query(
        `INSERT INTO reading_entries (id, reader_id, book_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [readingEntryId, readerId, bookId, 'READING']
      );

      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'PUT',
        url: `/api/reading-entries/${readingEntryId}/rating`,
        payload: {
          rating: 4,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toMatch(/only rate finished books/i);
    });

    it('should reject invalid rating values', async () => {
      const invalidRatings = [0, 6, -1, 'five', null];

      for (const rating of invalidRatings) {
        const response = await app.inject({
          headers: {
            cookie: sessionCookie,
          },
          method: 'PUT',
          url: `/api/reading-entries/${entryId}/rating`,
          payload: {
            rating,
          },
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should reject reflection note exceeding 2000 characters', async () => {
      const longNote = 'a'.repeat(2001);

      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 4,
          reflectionNote: longNote,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toMatch(/2000 characters/i);
    });

    it('should allow updating existing rating', async () => {
      // Set initial rating
      await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 3,
          reflectionNote: 'Initial thoughts',
        },
      });

      // Update rating
      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 5,
          reflectionNote: 'Revised opinion - masterpiece!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.readingEntry.rating).toBe(5);
      expect(body.readingEntry.reflectionNote).toBe('Revised opinion - masterpiece!');
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = uuidv4();

      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'PUT',
        url: `/api/reading-entries/${fakeId}/rating`,
        payload: {
          rating: 4,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/reading-entries/:entryId/rating', () => {
    beforeEach(async () => {
      // Set a rating first
      await query(
        'UPDATE reading_entries SET rating = $1, reflection_note = $2 WHERE id = $3',
        [4, 'Great book!', entryId]
      );
    });

    it('should clear rating and reflection note', async () => {
      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'DELETE',
        url: `/api/reading-entries/${entryId}/rating`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.readingEntry.rating).toBeNull();
      expect(body.readingEntry.reflectionNote).toBeNull();
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = uuidv4();

      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'DELETE',
        url: `/api/reading-entries/${fakeId}/rating`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should succeed even if no rating exists', async () => {
      // Clear rating first
      await query(
        'UPDATE reading_entries SET rating = NULL, reflection_note = NULL WHERE id = $1',
        [entryId]
      );

      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'DELETE',
        url: `/api/reading-entries/${entryId}/rating`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/readers/:readerId/reading-entries?topRated=true', () => {
    beforeEach(async () => {
      // Create multiple finished books with ratings
      const books = [
        { title: 'Book A', author: 'Author A', rating: 5 },
        { title: 'Book B', author: 'Author B', rating: 4 },
        { title: 'Book C', author: 'Author C', rating: 3 },
        { title: 'Book D', author: 'Author D', rating: 2 },
        { title: 'Book E', author: 'Author E', rating: 4 },
        { title: 'Book F', author: 'Author F', rating: null },
      ];

      for (const book of books) {
        const newBookId = uuidv4();
        await query(
          'INSERT INTO books (id, title, author) VALUES ($1, $2, $3)',
          [newBookId, book.title, book.author]
        );

        const newEntryId = uuidv4();
        await query(
          `INSERT INTO reading_entries (id, reader_id, book_id, status, rating, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [newEntryId, readerId, newBookId, 'FINISHED', book.rating]
        );
      }
    });

    it('should return only books with rating >= 4', async () => {
      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entries).toBeInstanceOf(Array);
      expect(body.entries.length).toBe(3); // Books A, B, E

      // All returned books should have rating >= 4
      body.entries.forEach((entry) => {
        expect(entry.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should order top rated books by rating DESC', async () => {
      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Check that ratings are in descending order
      const ratings = body.entries.map((e) => e.rating);
      const sortedRatings = [...ratings].sort((a, b) => b - a);
      expect(ratings).toEqual(sortedRatings);
    });

    it('should return empty array if no top rated books', async () => {
      // Delete all entries
      await query('DELETE FROM reading_entries WHERE reader_id = $1', [readerId]);

      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entries).toEqual([]);
    });

    it('should support pagination for top rated', async () => {
      const response = await app.inject({
        headers: {
          cookie: sessionCookie,
        },
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true&page=1&pageSize=2`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entries.length).toBe(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(2);
      expect(body.pagination.total).toBe(3);
      expect(body.pagination.hasMore).toBe(true);
    });
  });
});
