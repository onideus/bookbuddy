/**
 * Integration test for User Story 1: Organize Reading Pipeline (T039)
 * Complete user journey: add book → move TO_READ → move READING → verify status_transitions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../helpers/server-helper.js';
import { createTestReader, cleanupTestData } from '../helpers/test-data.js';
import { query } from '../../src/db/connection.js';

describe('US1: Organize Reading Pipeline - Integration Test', () => {
  let app;
  let testReaderId;
  let sessionCookie;

  beforeAll(async () => {
    app = await build();
    testReaderId = await createTestReader(app);

    // Simulate authenticated session
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/session',
      payload: { readerId: testReaderId },
    });
    sessionCookie = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData(testReaderId);
  });

  it('should complete full reading journey: add → TO_READ → READING → verify transitions', async () => {
    // Step 1: Add a new book to TO_READ
    const addResponse = await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: {
        title: 'The Invisible Library',
        author: 'Genevieve Cogman',
        edition: '1st Edition',
        status: 'TO_READ',
      },
    });

    expect(addResponse.statusCode).toBe(201);
    const addedEntry = addResponse.json();
    expect(addedEntry.status).toBe('TO_READ');

    const entryId = addedEntry.id;
    const bookId = addedEntry.book.id;

    // Step 2: Verify initial status transition was recorded
    const initialTransitions = await query(
      'SELECT * FROM status_transitions WHERE reading_entry_id = $1 ORDER BY transitioned_at DESC',
      [entryId]
    );

    expect(initialTransitions.rows).toHaveLength(1);
    expect(initialTransitions.rows[0]).toMatchObject({
      from_status: null,
      to_status: 'TO_READ',
    });

    // Step 3: Move book to READING
    const moveToReadingResponse = await app.inject({
      method: 'PATCH',
      url: `/api/reading-entries/${entryId}`,
      headers: { cookie: sessionCookie },
      payload: {
        status: 'READING',
      },
    });

    expect(moveToReadingResponse.statusCode).toBe(200);
    expect(moveToReadingResponse.json().status).toBe('READING');

    // Step 4: Verify status transition was recorded
    const afterReadingTransitions = await query(
      'SELECT * FROM status_transitions WHERE reading_entry_id = $1 ORDER BY transitioned_at DESC',
      [entryId]
    );

    expect(afterReadingTransitions.rows).toHaveLength(2);
    expect(afterReadingTransitions.rows[0]).toMatchObject({
      from_status: 'TO_READ',
      to_status: 'READING',
    });

    // Step 5: Move book to FINISHED
    const moveToFinishedResponse = await app.inject({
      method: 'PATCH',
      url: `/api/reading-entries/${entryId}`,
      headers: { cookie: sessionCookie },
      payload: {
        status: 'FINISHED',
      },
    });

    expect(moveToFinishedResponse.statusCode).toBe(200);

    // Step 6: Verify complete transition history
    const finalTransitions = await query(
      'SELECT * FROM status_transitions WHERE reading_entry_id = $1 ORDER BY transitioned_at ASC',
      [entryId]
    );

    expect(finalTransitions.rows).toHaveLength(3);

    const transitionSequence = finalTransitions.rows.map((t) => ({
      from: t.from_status,
      to: t.to_status,
    }));

    expect(transitionSequence).toEqual([
      { from: null, to: 'TO_READ' },
      { from: 'TO_READ', to: 'READING' },
      { from: 'READING', to: 'FINISHED' },
    ]);

    // Step 7: Verify reading entry has latest status
    const finalEntry = await query(
      'SELECT * FROM reading_entries WHERE id = $1',
      [entryId]
    );

    expect(finalEntry.rows[0].status).toBe('FINISHED');
  });

  it('should support filtering books by status', async () => {
    // Add books in different statuses
    await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: { title: 'To Read Book', author: 'Author A', status: 'TO_READ' },
    });

    await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: { title: 'Reading Book', author: 'Author B', status: 'READING' },
    });

    await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: { title: 'Finished Book', author: 'Author C', status: 'FINISHED' },
    });

    // Filter by each status
    const toReadResponse = await app.inject({
      method: 'GET',
      url: `/api/readers/${testReaderId}/reading-entries?status=TO_READ`,
      headers: { cookie: sessionCookie },
    });

    const readingResponse = await app.inject({
      method: 'GET',
      url: `/api/readers/${testReaderId}/reading-entries?status=READING`,
      headers: { cookie: sessionCookie },
    });

    const finishedResponse = await app.inject({
      method: 'GET',
      url: `/api/readers/${testReaderId}/reading-entries?status=FINISHED`,
      headers: { cookie: sessionCookie },
    });

    expect(toReadResponse.json().entries).toHaveLength(1);
    expect(readingResponse.json().entries).toHaveLength(1);
    expect(finishedResponse.json().entries).toHaveLength(1);

    expect(toReadResponse.json().entries[0].book.title).toBe('To Read Book');
    expect(readingResponse.json().entries[0].book.title).toBe('Reading Book');
    expect(finishedResponse.json().entries[0].book.title).toBe('Finished Book');
  });

  it('should prevent duplicate book entries for same reader', async () => {
    // Add book first time
    const firstResponse = await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: {
        title: 'Duplicate Test',
        author: 'Duplicate Author',
        status: 'TO_READ',
      },
    });

    expect(firstResponse.statusCode).toBe(201);

    // Attempt to add same book again
    const duplicateResponse = await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: {
        title: 'Duplicate Test',
        author: 'Duplicate Author',
        status: 'READING',
      },
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json().message).toMatch(/already exists/i);
  });

  it('should handle re-reading scenario (FINISHED → READING)', async () => {
    // Add and finish a book
    const addResponse = await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: {
        title: 'Re-read Test',
        author: 'Test Author',
        status: 'FINISHED',
      },
    });

    const entryId = addResponse.json().id;

    // Move back to READING (re-reading)
    const reReadResponse = await app.inject({
      method: 'PATCH',
      url: `/api/reading-entries/${entryId}`,
      headers: { cookie: sessionCookie },
      payload: {
        status: 'READING',
      },
    });

    expect(reReadResponse.statusCode).toBe(200);
    expect(reReadResponse.json().status).toBe('READING');

    // Verify transition was recorded
    const transitions = await query(
      'SELECT * FROM status_transitions WHERE reading_entry_id = $1 ORDER BY transitioned_at DESC',
      [entryId]
    );

    expect(transitions.rows[0]).toMatchObject({
      from_status: 'FINISHED',
      to_status: 'READING',
    });
  });

  it('should maintain book metadata across status changes', async () => {
    const bookData = {
      title: 'Metadata Test',
      author: 'Test Author',
      edition: 'Special Edition',
      status: 'TO_READ',
    };

    const addResponse = await app.inject({
      method: 'POST',
      url: `/api/readers/${testReaderId}/reading-entries`,
      headers: { cookie: sessionCookie },
      payload: bookData,
    });

    const entryId = addResponse.json().id;
    const bookId = addResponse.json().book.id;

    // Change status multiple times
    await app.inject({
      method: 'PATCH',
      url: `/api/reading-entries/${entryId}`,
      headers: { cookie: sessionCookie },
      payload: { status: 'READING' },
    });

    await app.inject({
      method: 'PATCH',
      url: `/api/reading-entries/${entryId}`,
      headers: { cookie: sessionCookie },
      payload: { status: 'FINISHED' },
    });

    // Verify book metadata unchanged
    const finalBook = await query('SELECT * FROM books WHERE id = $1', [bookId]);

    expect(finalBook.rows[0]).toMatchObject({
      title: 'Metadata Test',
      author: 'Test Author',
      edition: 'Special Edition',
    });
  });
});
