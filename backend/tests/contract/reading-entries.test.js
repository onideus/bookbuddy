/**
 * Contract tests for Reading Entries API endpoints
 * Tests T031-T033: POST, GET, and PATCH endpoints
 * Following OpenAPI specification in shared/contracts/openapi.yaml
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../helpers/server-helper.js';
import { createTestReader, createTestBook, cleanupTestData } from '../helpers/test-data.js';

describe('Reading Entries API - Contract Tests', () => {
  let app;
  let testReaderId;
  let sessionCookie;

  beforeAll(async () => {
    app = await build();
    // Create test reader and authenticate
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

  describe('POST /api/readers/:readerId/reading-entries (T031)', () => {
    it('should create a new reading entry with valid book data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/readers/${testReaderId}/reading-entries`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          title: 'The Invisible Library',
          author: 'Genevieve Cogman',
          edition: '1st Edition',
          status: 'TO_READ',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        id: expect.any(String),
        readerId: testReaderId,
        book: {
          id: expect.any(String),
          title: 'The Invisible Library',
          author: 'Genevieve Cogman',
          edition: '1st Edition',
        },
        status: 'TO_READ',
        rating: null,
        reflectionNote: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should reject invalid status value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/readers/${testReaderId}/reading-entries`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          title: 'Test Book',
          author: 'Test Author',
          status: 'INVALID_STATUS',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        statusCode: 400,
        error: expect.any(String),
        message: expect.stringMatching(/status/i),
        correlationId: expect.any(String),
      });
    });

    it('should reject title exceeding 500 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/readers/${testReaderId}/reading-entries`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          title: 'a'.repeat(501),
          author: 'Test Author',
          status: 'TO_READ',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toMatch(/title/i);
    });

    it('should detect duplicate books (same title, author, edition)', async () => {
      // Create first entry
      const firstResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${testReaderId}/reading-entries`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          title: 'Duplicate Test',
          author: 'Test Author',
          edition: '1st',
          status: 'TO_READ',
        },
      });

      expect(firstResponse.statusCode).toBe(201);

      // Attempt to create duplicate
      const duplicateResponse = await app.inject({
        method: 'POST',
        url: `/api/readers/${testReaderId}/reading-entries`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          title: 'Duplicate Test',
          author: 'Test Author',
          edition: '1st',
          status: 'READING',
        },
      });

      expect(duplicateResponse.statusCode).toBe(409);
      expect(duplicateResponse.json().message).toMatch(/already exists/i);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/readers/${testReaderId}/reading-entries`,
        payload: {
          title: 'Test Book',
          author: 'Test Author',
          status: 'TO_READ',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/readers/:readerId/reading-entries (T032)', () => {
    beforeEach(async () => {
      // Create sample reading entries
      await createTestBook(app, testReaderId, sessionCookie, {
        title: 'To Read Book',
        author: 'Author A',
        status: 'TO_READ',
      });
      await createTestBook(app, testReaderId, sessionCookie, {
        title: 'Reading Book',
        author: 'Author B',
        status: 'READING',
      });
      await createTestBook(app, testReaderId, sessionCookie, {
        title: 'Finished Book',
        author: 'Author C',
        status: 'FINISHED',
      });
    });

    it('should return all reading entries for a reader', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/readers/${testReaderId}/reading-entries`,
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.entries).toHaveLength(3);
      expect(data.pagination).toMatchObject({
        page: 1,
        pageSize: expect.any(Number),
        total: 3,
      });
    });

    it('should filter reading entries by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/readers/${testReaderId}/reading-entries?status=READING`,
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].status).toBe('READING');
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/readers/${testReaderId}/reading-entries?page=1&pageSize=2`,
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.entries).toHaveLength(2);
      expect(data.pagination).toMatchObject({
        page: 1,
        pageSize: 2,
        total: 3,
        hasMore: true,
      });
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/readers/${testReaderId}/reading-entries`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should enforce reader access control', async () => {
      const otherReaderId = await createTestReader(app, 'other-reader');

      const response = await app.inject({
        method: 'GET',
        url: `/api/readers/${otherReaderId}/reading-entries`,
        headers: {
          cookie: sessionCookie, // Using testReaderId's session
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/reading-entries/:entryId (T033)', () => {
    let entryId;

    beforeEach(async () => {
      const entry = await createTestBook(app, testReaderId, sessionCookie, {
        title: 'Status Transition Test',
        author: 'Test Author',
        status: 'TO_READ',
      });
      entryId = entry.id;
    });

    it('should update entry status and record transition', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/reading-entries/${entryId}`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          status: 'READING',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: entryId,
        status: 'READING',
        updatedAt: expect.any(String),
      });

      // Verify status transition was recorded
      const transitionsResponse = await app.inject({
        method: 'GET',
        url: `/api/reading-entries/${entryId}/transitions`,
        headers: {
          cookie: sessionCookie,
        },
      });

      expect(transitionsResponse.statusCode).toBe(200);
      const transitions = transitionsResponse.json();
      expect(transitions).toContainEqual(
        expect.objectContaining({
          fromStatus: 'TO_READ',
          toStatus: 'READING',
        })
      );
    });

    it('should handle concurrent edit conflicts (last-write-wins)', async () => {
      // Get current entry
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/reading-entries/${entryId}`,
        headers: {
          cookie: sessionCookie,
        },
      });

      const originalUpdatedAt = getResponse.json().updatedAt;

      // First update
      await app.inject({
        method: 'PATCH',
        url: `/api/reading-entries/${entryId}`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          status: 'READING',
        },
      });

      // Second update with stale timestamp should still succeed (last-write-wins)
      // but may include a warning in the response
      const staleUpdateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/reading-entries/${entryId}`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          status: 'FINISHED',
          updatedAt: originalUpdatedAt, // Stale timestamp
        },
      });

      expect(staleUpdateResponse.statusCode).toBe(200);
      expect(staleUpdateResponse.json().status).toBe('FINISHED');
    });

    it('should reject invalid status transition', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/reading-entries/${entryId}`,
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          status: 'INVALID',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/reading-entries/${entryId}`,
        payload: {
          status: 'READING',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
