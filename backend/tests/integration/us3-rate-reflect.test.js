/**
 * Integration Test: User Story 3 - Rate and Reflect on Finished Books (T096)
 * Tests complete user journey: finish book → rate 4 stars → add reflection → verify in Top Rated list
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../src/server.js';
import { query } from '../../src/db/connection.js';
import { v4 as uuidv4 } from 'uuid';

describe('User Story 3: Rate and Reflect on Finished Books', () => {
  let app;
  let readerId;

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
      'INSERT INTO reader_profiles (id, display_name) VALUES ($1, $2)',
      [readerId, 'Test Reader']
    );
  });

  describe('Complete Rating Journey', () => {
    it('should allow reader to finish book, rate it, and see it in Top Rated filter', async () => {
      // Step 1: Add a new book to TO_READ
      const addBookResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${readerId}/reading-entries`,
        payload: {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          edition: '1st Edition',
          status: 'TO_READ',
        },
      });

      expect(addBookResponse.statusCode).toBe(201);
      const { readingEntry: entry1 } = JSON.parse(addBookResponse.body);
      const entryId = entry1.id;

      // Step 2: Move book to READING
      const moveToReadingResponse = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/status`,
        payload: {
          newStatus: 'READING',
        },
      });

      expect(moveToReadingResponse.statusCode).toBe(200);

      // Step 3: Move book to FINISHED
      const moveToFinishedResponse = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/status`,
        payload: {
          newStatus: 'FINISHED',
        },
      });

      expect(moveToFinishedResponse.statusCode).toBe(200);
      const { readingEntry: finishedEntry } = JSON.parse(moveToFinishedResponse.body);
      expect(finishedEntry.status).toBe('FINISHED');

      // Step 4: Rate the finished book with 4 stars and reflection
      const rateResponse = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 4,
          reflectionNote: 'A captivating portrayal of the Jazz Age. Fitzgerald\'s prose is beautiful and the symbolism is rich.',
        },
      });

      expect(rateResponse.statusCode).toBe(200);
      const { readingEntry: ratedEntry } = JSON.parse(rateResponse.body);
      expect(ratedEntry.rating).toBe(4);
      expect(ratedEntry.reflectionNote).toContain('captivating portrayal');

      // Step 5: Verify book appears in Top Rated filter
      const topRatedResponse = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      expect(topRatedResponse.statusCode).toBe(200);
      const { entries: topRated } = JSON.parse(topRatedResponse.body);
      expect(topRated).toHaveLength(1);
      expect(topRated[0].id).toBe(entryId);
      expect(topRated[0].rating).toBe(4);
      expect(topRated[0].book.title).toBe('The Great Gatsby');

      // Step 6: Verify it also appears in regular FINISHED list
      const finishedResponse = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?status=FINISHED`,
      });

      expect(finishedResponse.statusCode).toBe(200);
      const finishedList = JSON.parse(finishedResponse.body);
      expect(finishedList).toHaveLength(1);
      expect(finishedList[0].rating).toBe(4);
    });

    it('should support rating without reflection note', async () => {
      // Add and finish book
      const addResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${readerId}/reading-entries`,
        payload: {
          title: 'Quick Read',
          author: 'Test Author',
          status: 'FINISHED',
        },
      });

      const { readingEntry: entry } = JSON.parse(addResponse.body);

      // Rate without reflection
      const rateResponse = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entry.id}/rating`,
        payload: {
          rating: 5,
        },
      });

      expect(rateResponse.statusCode).toBe(200);
      const { readingEntry: rated } = JSON.parse(rateResponse.body);
      expect(rated.rating).toBe(5);
      expect(rated.reflectionNote).toBeNull();

      // Verify in Top Rated
      const topRatedResponse = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      const { entries } = JSON.parse(topRatedResponse.body);
      expect(entries).toHaveLength(1);
    });

    it('should allow updating rating and reflection', async () => {
      // Add finished book
      const addResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${readerId}/reading-entries`,
        payload: {
          title: 'Changing Opinions',
          author: 'Test Author',
          status: 'FINISHED',
        },
      });

      const { readingEntry: entry } = JSON.parse(addResponse.body);

      // Initial rating
      await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entry.id}/rating`,
        payload: {
          rating: 3,
          reflectionNote: 'It was okay',
        },
      });

      // Update rating to 5
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entry.id}/rating`,
        payload: {
          rating: 5,
          reflectionNote: 'Actually, after reflection, this is brilliant!',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const { readingEntry: updated } = JSON.parse(updateResponse.body);
      expect(updated.rating).toBe(5);
      expect(updated.reflectionNote).toBe('Actually, after reflection, this is brilliant!');

      // Should now appear in Top Rated (rating >= 4)
      const topRatedResponse = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      const { entries } = JSON.parse(topRatedResponse.body);
      expect(entries).toHaveLength(1);
      expect(entries[0].rating).toBe(5);
    });

    it('should allow clearing rating (for re-reads)', async () => {
      // Add and rate book
      const addResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${readerId}/reading-entries`,
        payload: {
          title: 'Re-read Book',
          author: 'Test Author',
          status: 'FINISHED',
        },
      });

      const { readingEntry: entry } = JSON.parse(addResponse.body);

      await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entry.id}/rating`,
        payload: {
          rating: 4,
          reflectionNote: 'Great book',
        },
      });

      // Clear rating
      const clearResponse = await app.inject({
        method: 'DELETE',
        url: `/api/reading-entries/${entry.id}/rating`,
      });

      expect(clearResponse.statusCode).toBe(200);
      const { readingEntry: cleared } = JSON.parse(clearResponse.body);
      expect(cleared.rating).toBeNull();
      expect(cleared.reflectionNote).toBeNull();

      // Should no longer appear in Top Rated
      const topRatedResponse = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      const { entries } = JSON.parse(topRatedResponse.body);
      expect(entries).toHaveLength(0);
    });
  });

  describe('Top Rated Filter', () => {
    beforeEach(async () => {
      // Create multiple finished books with various ratings
      const books = [
        { title: 'Masterpiece A', author: 'Author A', rating: 5, note: 'Perfect!' },
        { title: 'Great Book B', author: 'Author B', rating: 4, note: 'Loved it' },
        { title: 'Okay Book C', author: 'Author C', rating: 3, note: 'Meh' },
        { title: 'Poor Book D', author: 'Author D', rating: 2, note: 'Disappointing' },
        { title: 'Excellent E', author: 'Author E', rating: 5, note: 'Amazing!' },
        { title: 'Good Book F', author: 'Author F', rating: 4, note: 'Solid' },
        { title: 'Unrated G', author: 'Author G', rating: null, note: null },
      ];

      for (const book of books) {
        const addResponse = await app.inject({
          method: 'POST',
          url: `/api/readers/${readerId}/reading-entries`,
          payload: {
            title: book.title,
            author: book.author,
            status: 'FINISHED',
          },
        });

        const { readingEntry: entry } = JSON.parse(addResponse.body);

        if (book.rating !== null) {
          await app.inject({
            method: 'PUT',
            url: `/api/reading-entries/${entry.id}/rating`,
            payload: {
              rating: book.rating,
              reflectionNote: book.note,
            },
          });
        }
      }
    });

    it('should return only books with rating >= 4 in correct order', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      expect(response.statusCode).toBe(200);
      const { entries } = JSON.parse(response.body);

      // Should have 4 books (2 with rating 5, 2 with rating 4)
      expect(entries).toHaveLength(4);

      // Check all have rating >= 4
      entries.forEach((entry) => {
        expect(entry.rating).toBeGreaterThanOrEqual(4);
      });

      // Check ordering (5-star books first, then 4-star)
      const ratings = entries.map((e) => e.rating);
      expect(ratings[0]).toBe(5);
      expect(ratings[1]).toBe(5);
      expect(ratings[2]).toBe(4);
      expect(ratings[3]).toBe(4);
    });

    it('should include reflection notes in Top Rated list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true`,
      });

      const { entries } = JSON.parse(response.body);

      // All top rated books should have reflection notes
      entries.forEach((entry) => {
        expect(entry.reflectionNote).toBeTruthy();
      });
    });

    it('should support pagination in Top Rated filter', async () => {
      const page1Response = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true&page=1&pageSize=2`,
      });

      const page1 = JSON.parse(page1Response.body);
      expect(page1.entries).toHaveLength(2);
      expect(page1.pagination.total).toBe(4);
      expect(page1.pagination.hasMore).toBe(true);

      const page2Response = await app.inject({
        method: 'GET',
        url: `/api/readers/${readerId}/reading-entries?topRated=true&page=2&pageSize=2`,
      });

      const page2 = JSON.parse(page2Response.body);
      expect(page2.entries).toHaveLength(2);
      expect(page2.pagination.hasMore).toBe(false);
    });
  });

  describe('Rating Validations', () => {
    let entryId;

    beforeEach(async () => {
      const addResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${readerId}/reading-entries`,
        payload: {
          title: 'Test Book',
          author: 'Test Author',
          status: 'FINISHED',
        },
      });

      const { readingEntry: entry } = JSON.parse(addResponse.body);
      entryId = entry.id;
    });

    it('should reject rating for non-FINISHED book', async () => {
      // Create READING book
      const readingResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${readerId}/reading-entries`,
        payload: {
          title: 'Currently Reading',
          author: 'Author',
          status: 'READING',
        },
      });

      const { readingEntry: reading } = JSON.parse(readingResponse.body);

      const rateResponse = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${reading.id}/rating`,
        payload: {
          rating: 4,
        },
      });

      expect(rateResponse.statusCode).toBe(400);
    });

    it('should reject invalid ratings', async () => {
      const invalidRatings = [0, 6, -1, 3.5];

      for (const rating of invalidRatings) {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/reading-entries/${entryId}/rating`,
          payload: { rating },
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should reject reflection note exceeding 2000 characters', async () => {
      const longNote = 'a'.repeat(2001);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 4,
          reflectionNote: longNote,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept reflection note at max length (2000 chars)', async () => {
      const maxNote = 'a'.repeat(2000);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/reading-entries/${entryId}/rating`,
        payload: {
          rating: 4,
          reflectionNote: maxNote,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
