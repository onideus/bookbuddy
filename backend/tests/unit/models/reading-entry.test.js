/**
 * Unit tests for ReadingEntry model (T035)
 * Target: ≥90% code coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadingEntry } from '../../../src/models/reading-entry.js';
import { createTestReader, createBookDirect, cleanupTestData } from '../../helpers/test-data.js';

describe('ReadingEntry Model', () => {
  let testReaderId;
  let testBookId;

  beforeEach(async () => {
    testReaderId = await createTestReader();
    const book = await createBookDirect({
      title: 'Test Book',
      author: 'Test Author',
    });
    testBookId = book.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('create', () => {
    it('should create a reading entry with valid data', async () => {
      const entry = await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'TO_READ',
      });

      expect(entry).toMatchObject({
        id: expect.any(String),
        readerId: testReaderId,
        bookId: testBookId,
        status: 'TO_READ',
        rating: null,
        reflectionNote: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should enforce unique constraint on reader_id + book_id', async () => {
      await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'TO_READ',
      });

      await expect(
        ReadingEntry.create({
          readerId: testReaderId,
          bookId: testBookId,
          status: 'READING',
        })
      ).rejects.toThrow();
    });

    it('should reject invalid status value', async () => {
      await expect(
        ReadingEntry.create({
          readerId: testReaderId,
          bookId: testBookId,
          status: 'INVALID_STATUS',
        })
      ).rejects.toThrow(/status/i);
    });

    it('should reject rating without FINISHED status', async () => {
      await expect(
        ReadingEntry.create({
          readerId: testReaderId,
          bookId: testBookId,
          status: 'READING',
          rating: 5,
        })
      ).rejects.toThrow();
    });

    it('should allow rating with FINISHED status', async () => {
      const entry = await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'FINISHED',
        rating: 4,
        reflectionNote: 'Great book!',
      });

      expect(entry.rating).toBe(4);
      expect(entry.reflectionNote).toBe('Great book!');
    });
  });

  describe('findById', () => {
    it('should find reading entry by ID', async () => {
      const created = await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'READING',
      });

      const found = await ReadingEntry.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        readerId: testReaderId,
        bookId: testBookId,
        status: 'READING',
      });
    });

    it('should return null for non-existent ID', async () => {
      const found = await ReadingEntry.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('findByReader', () => {
    beforeEach(async () => {
      const book1 = await createBookDirect({ title: 'Book 1', author: 'Author 1' });
      const book2 = await createBookDirect({ title: 'Book 2', author: 'Author 2' });
      const book3 = await createBookDirect({ title: 'Book 3', author: 'Author 3' });

      await ReadingEntry.create({
        readerId: testReaderId,
        bookId: book1.id,
        status: 'TO_READ',
      });
      await ReadingEntry.create({
        readerId: testReaderId,
        bookId: book2.id,
        status: 'READING',
      });
      await ReadingEntry.create({
        readerId: testReaderId,
        bookId: book3.id,
        status: 'FINISHED',
      });
    });

    it('should find all entries for a reader', async () => {
      const entries = await ReadingEntry.findByReader(testReaderId);

      expect(entries).toHaveLength(3);
    });

    it('should include book details in results', async () => {
      const entries = await ReadingEntry.findByReader(testReaderId);

      expect(entries[0].book).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        author: expect.any(String),
      });
    });

    it('should support pagination', async () => {
      const page1 = await ReadingEntry.findByReader(testReaderId, { page: 1, pageSize: 2 });
      const page2 = await ReadingEntry.findByReader(testReaderId, { page: 2, pageSize: 2 });

      expect(page1.entries).toHaveLength(2);
      expect(page2.entries).toHaveLength(1);
      expect(page1.pagination.total).toBe(3);
      expect(page1.pagination.hasMore).toBe(true);
      expect(page2.pagination.hasMore).toBe(false);
    });
  });

  describe('findByReaderAndStatus', () => {
    beforeEach(async () => {
      const book1 = await createBookDirect({ title: 'Reading 1', author: 'Author' });
      const book2 = await createBookDirect({ title: 'Reading 2', author: 'Author' });
      const book3 = await createBookDirect({ title: 'Finished', author: 'Author' });

      await ReadingEntry.create({
        readerId: testReaderId,
        bookId: book1.id,
        status: 'READING',
      });
      await ReadingEntry.create({
        readerId: testReaderId,
        bookId: book2.id,
        status: 'READING',
      });
      await ReadingEntry.create({
        readerId: testReaderId,
        bookId: book3.id,
        status: 'FINISHED',
      });
    });

    it('should filter entries by status', async () => {
      const readingEntries = await ReadingEntry.findByReaderAndStatus(
        testReaderId,
        'READING'
      );

      expect(readingEntries).toHaveLength(2);
      expect(readingEntries.every((e) => e.status === 'READING')).toBe(true);
    });

    it('should return empty array for status with no entries', async () => {
      const entries = await ReadingEntry.findByReaderAndStatus(testReaderId, 'TO_READ');

      expect(entries).toHaveLength(0);
    });
  });

  describe('updateStatus', () => {
    it('should update entry status', async () => {
      const entry = await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'TO_READ',
      });

      const updated = await ReadingEntry.updateStatus(entry.id, 'READING');

      expect(updated.status).toBe('READING');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(entry.updatedAt.getTime());
    });

    it('should allow updating to any valid status', async () => {
      const entry = await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'READING',
      });

      const updated = await ReadingEntry.updateStatus(entry.id, 'FINISHED');

      expect(updated.status).toBe('FINISHED');
    });

    it('should reject invalid status', async () => {
      const entry = await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'TO_READ',
      });

      await expect(ReadingEntry.updateStatus(entry.id, 'INVALID')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a reading entry', async () => {
      const entry = await ReadingEntry.create({
        readerId: testReaderId,
        bookId: testBookId,
        status: 'TO_READ',
      });

      const deleted = await ReadingEntry.delete(entry.id);

      expect(deleted).toBe(true);

      const found = await ReadingEntry.findById(entry.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent entry', async () => {
      const deleted = await ReadingEntry.delete('00000000-0000-0000-0000-000000000000');

      expect(deleted).toBe(false);
    });
  });
});
