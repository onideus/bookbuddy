/**
 * Unit tests for ProgressUpdate model (T070)
 * Tests CRUD operations for progress updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool } from '../../../src/db/connection.js';
import * as ProgressUpdate from '../../../src/models/progress-update.js';

describe('ProgressUpdate Model', () => {
  let testReaderId;
  let testBookId;
  let testEntryId;

  beforeEach(async () => {
    // Create test reader
    const readerResult = await pool.query(
      'INSERT INTO reader_profiles (id) VALUES (gen_random_uuid()) RETURNING id'
    );
    testReaderId = readerResult.rows[0].id;

    // Create test book
    const bookResult = await pool.query(
      `INSERT INTO books (title, author)
       VALUES ($1, $2)
       RETURNING id`,
      ['Test Book', 'Test Author']
    );
    testBookId = bookResult.rows[0].id;

    // Create reading entry
    const entryResult = await pool.query(
      `INSERT INTO reading_entries (reader_id, book_id, status)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [testReaderId, testBookId, 'READING']
    );
    testEntryId = entryResult.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM progress_updates WHERE reading_entry_id = $1', [testEntryId]);
    await pool.query('DELETE FROM reading_entries WHERE id = $1', [testEntryId]);
    await pool.query('DELETE FROM books WHERE id = $1', [testBookId]);
    await pool.query('DELETE FROM reader_profiles WHERE id = $1', [testReaderId]);
  });

  describe('create', () => {
    it('should create progress update with note and page marker', async () => {
      const progressUpdate = await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Finished Chapter 5',
        pageOrChapter: 'Chapter 5',
      });

      expect(progressUpdate).toBeDefined();
      expect(progressUpdate.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(progressUpdate.reading_entry_id).toBe(testEntryId);
      expect(progressUpdate.note).toBe('Finished Chapter 5');
      expect(progressUpdate.page_or_chapter).toBe('Chapter 5');
      expect(progressUpdate.created_at).toBeInstanceOf(Date);
    });

    it('should create progress update without page marker', async () => {
      const progressUpdate = await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Great plot twist!',
      });

      expect(progressUpdate.note).toBe('Great plot twist!');
      expect(progressUpdate.page_or_chapter).toBeNull();
    });

    it('should reject empty note', async () => {
      await expect(
        ProgressUpdate.create({
          readingEntryId: testEntryId,
          note: '',
        })
      ).rejects.toThrow();
    });

    it('should reject note exceeding 1000 characters', async () => {
      const longNote = 'a'.repeat(1001);

      await expect(
        ProgressUpdate.create({
          readingEntryId: testEntryId,
          note: longNote,
        })
      ).rejects.toThrow();
    });

    it('should reject page marker exceeding 50 characters', async () => {
      const longMarker = 'a'.repeat(51);

      await expect(
        ProgressUpdate.create({
          readingEntryId: testEntryId,
          note: 'Test note',
          pageOrChapter: longMarker,
        })
      ).rejects.toThrow();
    });

    it('should reject invalid reading entry ID', async () => {
      const fakeEntryId = '00000000-0000-0000-0000-000000000000';

      await expect(
        ProgressUpdate.create({
          readingEntryId: fakeEntryId,
          note: 'Test note',
        })
      ).rejects.toThrow();
    });
  });

  describe('findByEntry', () => {
    let progressId1, progressId2, progressId3;

    beforeEach(async () => {
      // Create multiple progress updates
      const p1 = await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'First note',
        pageOrChapter: 'Page 10',
      });
      progressId1 = p1.id;

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const p2 = await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Second note',
        pageOrChapter: 'Page 25',
      });
      progressId2 = p2.id;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const p3 = await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Third note',
      });
      progressId3 = p3.id;
    });

    it('should return progress updates in DESC order (newest first)', async () => {
      const updates = await ProgressUpdate.findByEntry(testEntryId);

      expect(updates).toHaveLength(3);
      expect(updates[0].note).toBe('Third note');
      expect(updates[1].note).toBe('Second note');
      expect(updates[2].note).toBe('First note');
    });

    it('should return all progress update fields', async () => {
      const updates = await ProgressUpdate.findByEntry(testEntryId);

      expect(updates[0]).toHaveProperty('id');
      expect(updates[0]).toHaveProperty('reading_entry_id');
      expect(updates[0]).toHaveProperty('note');
      expect(updates[0]).toHaveProperty('page_or_chapter');
      expect(updates[0]).toHaveProperty('created_at');
    });

    it('should return empty array when no updates exist', async () => {
      // Delete all updates
      await pool.query('DELETE FROM progress_updates WHERE reading_entry_id = $1', [testEntryId]);

      const updates = await ProgressUpdate.findByEntry(testEntryId);

      expect(updates).toEqual([]);
    });

    it('should only return updates for the specified entry', async () => {
      // Create another reading entry
      const otherEntryResult = await pool.query(
        `INSERT INTO reading_entries (reader_id, book_id, status)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [testReaderId, testBookId, 'READING']
      );
      const otherEntryId = otherEntryResult.rows[0].id;

      // Add update to other entry
      await ProgressUpdate.create({
        readingEntryId: otherEntryId,
        note: 'Other entry note',
      });

      const updates = await ProgressUpdate.findByEntry(testEntryId);

      expect(updates).toHaveLength(3);
      expect(updates.every((u) => u.reading_entry_id === testEntryId)).toBe(true);

      // Cleanup
      await pool.query('DELETE FROM reading_entries WHERE id = $1', [otherEntryId]);
    });
  });

  describe('findById', () => {
    let progressId;

    beforeEach(async () => {
      const progress = await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Test note',
        pageOrChapter: 'Chapter 1',
      });
      progressId = progress.id;
    });

    it('should find progress update by ID', async () => {
      const update = await ProgressUpdate.findById(progressId);

      expect(update).toBeDefined();
      expect(update.id).toBe(progressId);
      expect(update.note).toBe('Test note');
      expect(update.page_or_chapter).toBe('Chapter 1');
    });

    it('should return null for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const update = await ProgressUpdate.findById(fakeId);

      expect(update).toBeNull();
    });
  });

  describe('countByEntry', () => {
    it('should return correct count of progress updates', async () => {
      // Create 3 updates
      await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Note 1',
      });
      await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Note 2',
      });
      await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Note 3',
      });

      const count = await ProgressUpdate.countByEntry(testEntryId);

      expect(count).toBe(3);
    });

    it('should return 0 when no updates exist', async () => {
      const count = await ProgressUpdate.countByEntry(testEntryId);

      expect(count).toBe(0);
    });
  });

  describe('delete', () => {
    let progressId;

    beforeEach(async () => {
      const progress = await ProgressUpdate.create({
        readingEntryId: testEntryId,
        note: 'Test note to delete',
      });
      progressId = progress.id;
    });

    it('should delete progress update by ID', async () => {
      const result = await ProgressUpdate.deleteById(progressId);

      expect(result).toBe(true);

      // Verify deletion
      const update = await ProgressUpdate.findById(progressId);
      expect(update).toBeNull();
    });

    it('should return false when deleting non-existent update', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const result = await ProgressUpdate.deleteById(fakeId);

      expect(result).toBe(false);
    });
  });
});
