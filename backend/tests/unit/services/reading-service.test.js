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

      await createReadingEntryDirect(testReaderId, book1, 'TO_READ');
      await createReadingEntryDirect(testReaderId, book2, 'READING');
      await createReadingEntryDirect(testReaderId, book3, 'FINISHED');
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
      testBookId = await createBookDirect({
        title: 'Status Update Test',
        author: 'Test Author',
      });

      testEntryId = await createReadingEntryDirect(testReaderId, testBookId, 'TO_READ');

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
        const bookId = await createBookDirect({
          title: `Transition ${transition.from}-${transition.to}`,
          author: 'Test',
        });
        const entryId = await createReadingEntryDirect(
          testReaderId,
          bookId,
          transition.from
        );

        const result = await ReadingService.updateStatus(testReaderId, entryId, {
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

  describe('addProgressNote (T071 - note length validation, timestamp handling)', () => {
    let testBookId;
    let testEntryId;

    beforeEach(async () => {
      // Create a book and reading entry for progress notes
      testBookId = await createBookDirect({ title: 'Progress Test Book', author: 'Progress Author' });
      testEntryId = await createReadingEntryDirect(testReaderId, testBookId, 'READING');
    });

    it('should add progress note with content and page marker', async () => {
      const result = await ReadingService.addProgressNote(testEntryId, {
        content: 'Finished Chapter 5, great plot twist!',
        progressMarker: 'Chapter 5',
      });

      expect(result).toHaveProperty('noteId');
      expect(result).toHaveProperty('recordedAt');
      expect(result).toHaveProperty('content', 'Finished Chapter 5, great plot twist!');
      expect(result).toHaveProperty('progressMarker', 'Chapter 5');
      expect(new Date(result.recordedAt)).toBeInstanceOf(Date);

      // Verify analytics event was logged
      expect(logAnalyticsEvent).toHaveBeenCalledWith('progress_note_added', expect.any(Object));
    });

    it('should add progress note without page marker', async () => {
      const result = await ReadingService.addProgressNote(testEntryId, {
        content: 'Really enjoying the character development',
      });

      expect(result.content).toBe('Really enjoying the character development');
      expect(result.progressMarker).toBeNull();
    });

    it('should reject note exceeding 1000 characters', async () => {
      const longNote = 'a'.repeat(1001);

      await expect(
        ReadingService.addProgressNote(testEntryId, {
          content: longNote,
        })
      ).rejects.toThrow(/length/i);
    });

    it('should reject empty note content', async () => {
      await expect(
        ReadingService.addProgressNote(testEntryId, {
          content: '',
        })
      ).rejects.toThrow();
    });

    it('should reject progress marker exceeding 50 characters', async () => {
      const longMarker = 'a'.repeat(51);

      await expect(
        ReadingService.addProgressNote(testEntryId, {
          content: 'Test note',
          progressMarker: longMarker,
        })
      ).rejects.toThrow(/length/i);
    });

    it('should reject note for non-existent reading entry', async () => {
      const fakeEntryId = '00000000-0000-0000-0000-000000000000';

      await expect(
        ReadingService.addProgressNote(fakeEntryId, {
          content: 'Test note',
        })
      ).rejects.toThrow(/not found|does not exist/i);
    });

    it('should set recordedAt timestamp automatically', async () => {
      const beforeTime = new Date();

      const result = await ReadingService.addProgressNote(testEntryId, {
        content: 'Test timestamp',
      });

      const afterTime = new Date();
      const recordedAt = new Date(result.recordedAt);

      expect(recordedAt >= beforeTime).toBe(true);
      expect(recordedAt <= afterTime).toBe(true);
    });
  });

  describe('getProgressNotes (T071 - chronological ordering)', () => {
    let testBookId;
    let testEntryId;

    beforeEach(async () => {
      testBookId = await createBookDirect({ title: 'Progress Book', author: 'Author' });
      testEntryId = await createReadingEntryDirect(testReaderId, testBookId, 'READING');

      // Add multiple progress notes
      await ReadingService.addProgressNote(testEntryId, {
        content: 'First note',
        progressMarker: 'Page 10',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await ReadingService.addProgressNote(testEntryId, {
        content: 'Second note',
        progressMarker: 'Page 25',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await ReadingService.addProgressNote(testEntryId, {
        content: 'Third note',
      });
    });

    it('should return progress notes in chronological DESC order (newest first)', async () => {
      const notes = await ReadingService.getProgressNotes(testEntryId);

      expect(notes).toHaveLength(3);
      expect(notes[0].content).toBe('Third note');
      expect(notes[1].content).toBe('Second note');
      expect(notes[2].content).toBe('First note');
    });

    it('should include book details with progress notes', async () => {
      const notes = await ReadingService.getProgressNotes(testEntryId);

      expect(notes[0]).toHaveProperty('book');
      expect(notes[0].book).toMatchObject({
        title: 'Progress Book',
        author: 'Author',
      });
    });

    it('should return empty array when no notes exist', async () => {
      // Create new entry without notes
      const newBookId = await createBookDirect({ title: 'New Book', author: 'New Author' });
      const newEntryId = await createReadingEntryDirect(testReaderId, newBookId, 'READING');

      const notes = await ReadingService.getProgressNotes(newEntryId);

      expect(notes).toEqual([]);
    });

    it('should reject request for non-existent entry', async () => {
      const fakeEntryId = '00000000-0000-0000-0000-000000000000';

      await expect(ReadingService.getProgressNotes(fakeEntryId)).rejects.toThrow(/not found|does not exist/i);
    });
  });

  describe('setRating (T094 - validate rating 1-5, only for FINISHED, reflection max 2000)', () => {
    let testBookId;
    let testEntryId;

    beforeEach(async () => {
      // Create finished book entry
      testBookId = await createBookDirect({ title: 'Finished Book', author: 'Author' });
      testEntryId = await createReadingEntryDirect(testReaderId, testBookId, 'FINISHED');
    });

    it('should set rating for finished book', async () => {
      const result = await ReadingService.setRating(testReaderId, testEntryId, {
        rating: 4,
      });

      expect(result.readingEntry.rating).toBe(4);
      expect(result.readingEntry.status).toBe('FINISHED');
    });

    it('should set rating with reflection note', async () => {
      const result = await ReadingService.setRating(testReaderId, testEntryId, {
        rating: 5,
        reflectionNote: 'Absolutely brilliant! A masterpiece of modern literature.',
      });

      expect(result.readingEntry.rating).toBe(5);
      expect(result.readingEntry.reflectionNote).toBe('Absolutely brilliant! A masterpiece of modern literature.');
    });

    it('should update existing rating', async () => {
      // Set initial rating
      await ReadingService.setRating(testReaderId, testEntryId, {
        rating: 3,
        reflectionNote: 'It was okay',
      });

      // Update rating
      const result = await ReadingService.setRating(testReaderId, testEntryId, {
        rating: 5,
        reflectionNote: 'Actually, on second thought, this is amazing!',
      });

      expect(result.readingEntry.rating).toBe(5);
      expect(result.readingEntry.reflectionNote).toBe('Actually, on second thought, this is amazing!');
    });

    it('should reject rating < 1', async () => {
      await expect(
        ReadingService.setRating(testReaderId, testEntryId, {
          rating: 0,
        })
      ).rejects.toThrow(/rating must be between 1 and 5/i);
    });

    it('should reject rating > 5', async () => {
      await expect(
        ReadingService.setRating(testReaderId, testEntryId, {
          rating: 6,
        })
      ).rejects.toThrow(/rating must be between 1 and 5/i);
    });

    it('should reject non-integer ratings', async () => {
      await expect(
        ReadingService.setRating(testReaderId, testEntryId, {
          rating: 3.5,
        })
      ).rejects.toThrow(/rating must be an integer/i);
    });

    it('should reject rating for non-FINISHED book', async () => {
      const readingBookId = await createBookDirect({ title: 'Reading Book', author: 'Author' });
      const readingEntryId = await createReadingEntryDirect(testReaderId, readingBookId, 'READING');

      await expect(
        ReadingService.setRating(testReaderId, readingEntryId, {
          rating: 4,
        })
      ).rejects.toThrow(/only rate finished books/i);
    });

    it('should reject reflection note exceeding 2000 characters', async () => {
      const longNote = 'a'.repeat(2001);

      await expect(
        ReadingService.setRating(testReaderId, testEntryId, {
          rating: 4,
          reflectionNote: longNote,
        })
      ).rejects.toThrow(/reflection note.*2000 characters/i);
    });

    it('should accept reflection note at max length (2000 chars)', async () => {
      const maxNote = 'a'.repeat(2000);

      const result = await ReadingService.setRating(testReaderId, testEntryId, {
        rating: 4,
        reflectionNote: maxNote,
      });

      expect(result.readingEntry.reflectionNote).toHaveLength(2000);
    });

    it('should reject request for non-existent entry', async () => {
      const fakeEntryId = '00000000-0000-0000-0000-000000000000';

      await expect(
        ReadingService.setRating(testReaderId, fakeEntryId, {
          rating: 4,
        })
      ).rejects.toThrow(/not found/i);
    });

    it('should reject if reader does not own entry', async () => {
      const otherReaderId = await createTestReader();

      await expect(
        ReadingService.setRating(otherReaderId, testEntryId, {
          rating: 4,
        })
      ).rejects.toThrow(/access denied/i);

      // Clean up
      await cleanupTestData();
    });

    it('should log analytics event for rating set', async () => {
      await ReadingService.setRating(testReaderId, testEntryId, {
        rating: 4,
      });

      expect(logAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'rating_set',
          readerId: testReaderId,
          entryId: testEntryId,
          rating: 4,
        })
      );
    });
  });

  describe('clearRating (T094 - allow rating removal)', () => {
    let testBookId;
    let testEntryId;

    beforeEach(async () => {
      testBookId = await createBookDirect({ title: 'Rated Book', author: 'Author' });
      testEntryId = await createReadingEntryDirect(testReaderId, testBookId, 'FINISHED');

      // Set a rating
      await ReadingService.setRating(testReaderId, testEntryId, {
        rating: 4,
        reflectionNote: 'Good book',
      });
    });

    it('should clear rating and reflection note', async () => {
      const result = await ReadingService.clearRating(testReaderId, testEntryId);

      expect(result.readingEntry.rating).toBeNull();
      expect(result.readingEntry.reflectionNote).toBeNull();
    });

    it('should succeed even if no rating exists', async () => {
      // Clear rating first
      await ReadingService.clearRating(testReaderId, testEntryId);

      // Clear again
      const result = await ReadingService.clearRating(testReaderId, testEntryId);

      expect(result.readingEntry.rating).toBeNull();
    });

    it('should reject request for non-existent entry', async () => {
      const fakeEntryId = '00000000-0000-0000-0000-000000000000';

      await expect(
        ReadingService.clearRating(testReaderId, fakeEntryId)
      ).rejects.toThrow(/not found/i);
    });

    it('should reject if reader does not own entry', async () => {
      const otherReaderId = await createTestReader();

      await expect(
        ReadingService.clearRating(otherReaderId, testEntryId)
      ).rejects.toThrow(/access denied/i);

      // Clean up
      await cleanupTestData();
    });

    it('should log analytics event for rating cleared', async () => {
      await ReadingService.clearRating(testReaderId, testEntryId);

      expect(logAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'rating_cleared',
          readerId: testReaderId,
          entryId: testEntryId,
        })
      );
    });
  });

  describe('getTopRatedBooks (T095 - filter rating ≥4, ordering)', () => {
    beforeEach(async () => {
      // Create multiple finished books with various ratings
      const books = [
        { title: 'Book A', author: 'Author A', rating: 5, note: 'Masterpiece!' },
        { title: 'Book B', author: 'Author B', rating: 4, note: 'Great read' },
        { title: 'Book C', author: 'Author C', rating: 3, note: 'It was okay' },
        { title: 'Book D', author: 'Author D', rating: 2, note: 'Not for me' },
        { title: 'Book E', author: 'Author E', rating: 4, note: 'Loved it' },
        { title: 'Book F', author: 'Author F', rating: 5, note: 'Perfect!' },
        { title: 'Book G', author: 'Author G', rating: null, note: null }, // No rating
      ];

      for (const book of books) {
        const bookId = await createBookDirect({ title: book.title, author: book.author });
        const entryId = await createReadingEntryDirect(testReaderId, bookId, 'FINISHED');

        if (book.rating !== null) {
          await ReadingService.setRating(testReaderId, entryId, {
            rating: book.rating,
            reflectionNote: book.note,
          });
        }
      }
    });

    it('should return only books with rating >= 4', async () => {
      const result = await ReadingService.getTopRatedBooks(testReaderId);

      expect(result.entries).toHaveLength(4); // Books A, B, E, F
      result.entries.forEach((entry) => {
        expect(entry.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should order top rated books by rating DESC', async () => {
      const result = await ReadingService.getTopRatedBooks(testReaderId);

      const ratings = result.entries.map((e) => e.rating);

      // Check descending order
      for (let i = 0; i < ratings.length - 1; i++) {
        expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
      }
    });

    it('should return empty array if no top rated books', async () => {
      // Clean all data
      await cleanupTestData();
      const newReaderId = await createTestReader();

      const result = await ReadingService.getTopRatedBooks(newReaderId);

      expect(result.entries).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should support pagination', async () => {
      const result = await ReadingService.getTopRatedBooks(testReaderId, {
        page: 1,
        pageSize: 2,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(2);
      expect(result.pagination.total).toBe(4);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should include book details and reflection notes', async () => {
      const result = await ReadingService.getTopRatedBooks(testReaderId);

      const topBook = result.entries[0];
      expect(topBook).toHaveProperty('book');
      expect(topBook.book).toHaveProperty('title');
      expect(topBook.book).toHaveProperty('author');
      expect(topBook).toHaveProperty('rating');
      expect(topBook).toHaveProperty('reflectionNote');
    });

    it('should handle second page correctly', async () => {
      const page2 = await ReadingService.getTopRatedBooks(testReaderId, {
        page: 2,
        pageSize: 2,
      });

      expect(page2.entries).toHaveLength(2);
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.hasMore).toBe(false);
    });
  });
});
