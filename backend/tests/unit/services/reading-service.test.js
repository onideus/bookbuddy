/**
 * Unit tests for ReadingService (T037-T038)
 * Tests for book addition logic and status transition logic
 * Target: ≥90% code coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReadingService } from '../../../src/services/reading-service.js';
import {
  createTestReader,
  createBookDirect,
  createReadingEntryDirect,
  createStatusTransitionDirect,
  cleanupTestData,
} from '../../helpers/test-data.js';
import { logAnalyticsEvent } from '../../../src/lib/logger.js';

// Mock logger to avoid actual logging in tests
vi.mock('../../../src/lib/logger.js', () => ({
  logAnalyticsEvent: vi.fn(),
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ReadingService', () => {
  let testReaderId;

  beforeEach(async () => {
    testReaderId = await createTestReader();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('addBook (T037 - duplicate detection, unique constraint)', () => {
    it('should add a new book and create reading entry', async () => {
      const result = await ReadingService.addBook(testReaderId, {
        title: 'New Book',
        author: 'New Author',
        status: 'TO_READ',
      });

      expect(result).toMatchObject({
        readingEntry: {
          id: expect.any(String),
          readerId: testReaderId,
          status: 'TO_READ',
        },
        book: {
          id: expect.any(String),
          title: 'New Book',
          author: 'New Author',
        },
        isNew: true,
      });

      // Verify analytics event was logged (FR-016)
      expect(logAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'book_added',
          readerId: testReaderId,
          status: 'TO_READ',
        })
      );
    });

    it('should create initial status transition for new entry', async () => {
      const result = await ReadingService.addBook(testReaderId, {
        title: 'Status Transition Test',
        author: 'Test Author',
        status: 'TO_READ',
      });

      const { StatusTransition } = await import('../../../src/models/status-transition.js');
      const transitions = await StatusTransition.findByEntry(result.readingEntry.id);

      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toMatchObject({
        fromStatus: null,
        toStatus: 'TO_READ',
      });
    });

    it('should detect duplicate books by title, author, and edition', async () => {
      // Create first book
      await ReadingService.addBook(testReaderId, {
        title: 'Duplicate Book',
        author: 'Duplicate Author',
        edition: '1st Edition',
        status: 'TO_READ',
      });

      // Attempt to add same book
      await expect(
        ReadingService.addBook(testReaderId, {
          title: 'Duplicate Book',
          author: 'Duplicate Author',
          edition: '1st Edition',
          status: 'READING',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('should allow same book for different readers', async () => {
      const otherReaderId = await createTestReader(null, 'other-reader');

      await ReadingService.addBook(testReaderId, {
        title: 'Shared Book',
        author: 'Shared Author',
        status: 'TO_READ',
      });

      const result = await ReadingService.addBook(otherReaderId, {
        title: 'Shared Book',
        author: 'Shared Author',
        status: 'READING',
      });

      expect(result.readingEntry.readerId).toBe(otherReaderId);
      expect(result.readingEntry.status).toBe('READING');
      expect(result.isNew).toBe(false); // Book already exists, but new entry
    });

    it('should reuse existing book when adding for same reader with different edition', async () => {
      await ReadingService.addBook(testReaderId, {
        title: 'Multi-Edition Book',
        author: 'Test Author',
        edition: '1st Edition',
        status: 'FINISHED',
      });

      const result = await ReadingService.addBook(testReaderId, {
        title: 'Multi-Edition Book',
        author: 'Test Author',
        edition: '2nd Edition',
        status: 'TO_READ',
      });

      expect(result.isNew).toBe(true); // New edition = new book
      expect(result.book.edition).toBe('2nd Edition');
    });

    it('should validate title length (max 500)', async () => {
      await expect(
        ReadingService.addBook(testReaderId, {
          title: 'a'.repeat(501),
          author: 'Test Author',
          status: 'TO_READ',
        })
      ).rejects.toThrow(/title/i);
    });

    it('should validate author length (max 200)', async () => {
      await expect(
        ReadingService.addBook(testReaderId, {
          title: 'Valid Title',
          author: 'a'.repeat(201),
          status: 'TO_READ',
        })
      ).rejects.toThrow(/author/i);
    });
  });

  describe('getReadingEntries', () => {
    beforeEach(async () => {
      // Create sample books
      const book1 = await createBookDirect({ title: 'To Read 1', author: 'Author A' });
      const book2 = await createBookDirect({ title: 'Reading 1', author: 'Author B' });
      const book3 = await createBookDirect({ title: 'Finished 1', author: 'Author C' });

      await createReadingEntryDirect(testReaderId, book1.id, 'TO_READ');
      await createReadingEntryDirect(testReaderId, book2.id, 'READING');
      await createReadingEntryDirect(testReaderId, book3.id, 'FINISHED');
    });

    it('should get all reading entries for a reader', async () => {
      const result = await ReadingService.getReadingEntries(testReaderId);

      expect(result.entries).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });

    it('should filter by status', async () => {
      const result = await ReadingService.getReadingEntries(testReaderId, {
        status: 'READING',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe('READING');
    });

    it('should support pagination', async () => {
      const result = await ReadingService.getReadingEntries(testReaderId, {
        page: 1,
        pageSize: 2,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        page: 1,
        pageSize: 2,
        total: 3,
        hasMore: true,
      });
    });

    it('should join with book details', async () => {
      const result = await ReadingService.getReadingEntries(testReaderId);

      expect(result.entries[0].book).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        author: expect.any(String),
      });
    });
  });

  describe('updateStatus (T038 - from/to validation, history recording)', () => {
    let testEntryId;
    let testBookId;

    beforeEach(async () => {
      const book = await createBookDirect({
        title: 'Status Update Test',
        author: 'Test Author',
      });
      testBookId = book.id;

      const entry = await createReadingEntryDirect(testReaderId, testBookId, 'TO_READ');
      testEntryId = entry.id;

      // Create initial transition
      await createStatusTransitionDirect(testEntryId, null, 'TO_READ');
    });

    it('should update status and record transition', async () => {
      const result = await ReadingService.updateStatus(testReaderId, testEntryId, {
        newStatus: 'READING',
      });

      expect(result.readingEntry.status).toBe('READING');

      // Verify transition was recorded
      const { StatusTransition } = await import('../../../src/models/status-transition.js');
      const transitions = await StatusTransition.findByEntry(testEntryId);

      expect(transitions).toHaveLength(2);
      expect(transitions[0]).toMatchObject({
        fromStatus: 'TO_READ',
        toStatus: 'READING',
      });
    });

    it('should log analytics event for status change (FR-016)', async () => {
      await ReadingService.updateStatus(testReaderId, testEntryId, {
        newStatus: 'FINISHED',
      });

      expect(logAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'status_changed',
          readerId: testReaderId,
          entryId: testEntryId,
          fromStatus: 'TO_READ',
          toStatus: 'FINISHED',
        })
      );
    });

    it('should validate status transitions', async () => {
      // Valid transitions: all status changes are allowed per spec
      const validTransitions = [
        { from: 'TO_READ', to: 'READING' },
        { from: 'READING', to: 'FINISHED' },
        { from: 'FINISHED', to: 'READING' }, // Re-reading
      ];

      for (const transition of validTransitions) {
        const book = await createBookDirect({
          title: `Transition ${transition.from}-${transition.to}`,
          author: 'Test',
        });
        const entry = await createReadingEntryDirect(
          testReaderId,
          book.id,
          transition.from
        );

        const result = await ReadingService.updateStatus(testReaderId, entry.id, {
          newStatus: transition.to,
        });

        expect(result.readingEntry.status).toBe(transition.to);
      }
    });

    it('should handle last-write-wins for concurrent edits (FR-010)', async () => {
      // Get current entry with timestamp
      const { ReadingEntry } = await import('../../../src/models/reading-entry.js');
      const entry = await ReadingEntry.findById(testEntryId);
      const originalTimestamp = entry.updatedAt;

      // First update
      await ReadingService.updateStatus(testReaderId, testEntryId, {
        newStatus: 'READING',
      });

      // Second update with stale timestamp - should succeed (last-write-wins)
      const result = await ReadingService.updateStatus(testReaderId, testEntryId, {
        newStatus: 'FINISHED',
        updatedAt: originalTimestamp,
      });

      expect(result.readingEntry.status).toBe('FINISHED');
      // Note: In production, you might want to include a warning flag
      // expect(result.conflictWarning).toBe(true);
    });

    it('should update updatedAt timestamp', async () => {
      const { ReadingEntry } = await import('../../../src/models/reading-entry.js');
      const before = await ReadingEntry.findById(testEntryId);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await ReadingService.updateStatus(testReaderId, testEntryId, {
        newStatus: 'READING',
      });

      const after = await ReadingEntry.findById(testEntryId);

      expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    });

    it('should reject invalid status values', async () => {
      await expect(
        ReadingService.updateStatus(testReaderId, testEntryId, {
          newStatus: 'INVALID_STATUS',
        })
      ).rejects.toThrow();
    });

    it('should reject updates to non-existent entries', async () => {
      await expect(
        ReadingService.updateStatus(testReaderId, '00000000-0000-0000-0000-000000000000', {
          newStatus: 'READING',
        })
      ).rejects.toThrow();
    });
  });
});
