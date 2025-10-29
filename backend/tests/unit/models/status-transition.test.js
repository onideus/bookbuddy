/**
 * Unit tests for StatusTransition model (T036)
 * Target: ≥90% code coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatusTransition } from '../../../src/models/status-transition.js';
import {
  createTestReader,
  createBookDirect,
  createReadingEntryDirect,
  cleanupTestData,
} from '../../helpers/test-data.js';

describe('StatusTransition Model', () => {
  let testReaderId;
  let testBookId;
  let testEntryId;

  beforeEach(async () => {
    testReaderId = await createTestReader();
    testBookId = await createBookDirect({
      title: 'Transition Test Book',
      author: 'Test Author',
    });

    testEntryId = await createReadingEntryDirect(testReaderId, testBookId, 'TO_READ');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('create', () => {
    it('should create initial transition with null fromStatus', async () => {
      const transition = await StatusTransition.create({
        readingEntryId: testEntryId,
        fromStatus: null,
        toStatus: 'TO_READ',
      });

      expect(transition).toMatchObject({
        id: expect.any(String),
        readingEntryId: testEntryId,
        fromStatus: null,
        toStatus: 'TO_READ',
        transitionedAt: expect.any(Date),
      });
    });

    it('should create transition with both statuses', async () => {
      const transition = await StatusTransition.create({
        readingEntryId: testEntryId,
        fromStatus: 'TO_READ',
        toStatus: 'READING',
      });

      expect(transition).toMatchObject({
        fromStatus: 'TO_READ',
        toStatus: 'READING',
      });
    });

    it('should reject invalid fromStatus', async () => {
      await expect(
        StatusTransition.create({
          readingEntryId: testEntryId,
          fromStatus: 'INVALID',
          toStatus: 'READING',
        })
      ).rejects.toThrow();
    });

    it('should reject invalid toStatus', async () => {
      await expect(
        StatusTransition.create({
          readingEntryId: testEntryId,
          fromStatus: 'TO_READ',
          toStatus: 'INVALID',
        })
      ).rejects.toThrow();
    });

    it('should allow all valid status combinations', async () => {
      const validCombinations = [
        { from: null, to: 'TO_READ' },
        { from: 'TO_READ', to: 'READING' },
        { from: 'READING', to: 'FINISHED' },
        { from: 'FINISHED', to: 'READING' }, // Re-reading
        { from: 'READING', to: 'TO_READ' }, // Pausing
      ];

      for (const combo of validCombinations) {
        const transition = await StatusTransition.create({
          readingEntryId: testEntryId,
          fromStatus: combo.from,
          toStatus: combo.to,
        });

        expect(transition).toMatchObject({
          fromStatus: combo.from,
          toStatus: combo.to,
        });
      }
    });
  });

  describe('findByEntry', () => {
    beforeEach(async () => {
      // Create a sequence of transitions
      await StatusTransition.create({
        readingEntryId: testEntryId,
        fromStatus: null,
        toStatus: 'TO_READ',
      });

      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

      await StatusTransition.create({
        readingEntryId: testEntryId,
        fromStatus: 'TO_READ',
        toStatus: 'READING',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await StatusTransition.create({
        readingEntryId: testEntryId,
        fromStatus: 'READING',
        toStatus: 'FINISHED',
      });
    });

    it('should return all transitions for an entry', async () => {
      const transitions = await StatusTransition.findByEntry(testEntryId);

      expect(transitions).toHaveLength(3);
    });

    it('should return transitions in reverse chronological order (newest first)', async () => {
      const transitions = await StatusTransition.findByEntry(testEntryId);

      expect(transitions[0].toStatus).toBe('FINISHED');
      expect(transitions[1].toStatus).toBe('READING');
      expect(transitions[2].toStatus).toBe('TO_READ');

      // Verify timestamps are in descending order
      for (let i = 0; i < transitions.length - 1; i++) {
        expect(transitions[i].transitionedAt.getTime()).toBeGreaterThanOrEqual(
          transitions[i + 1].transitionedAt.getTime()
        );
      }
    });

    it('should return empty array for entry with no transitions', async () => {
      const anotherBook = await createBookDirect({
        title: 'Another Book',
        author: 'Another Author',
      });
      const anotherEntry = await createReadingEntryDirect(
        testReaderId,
        anotherBook,
        'TO_READ'
      );

      const transitions = await StatusTransition.findByEntry(anotherEntry);

      expect(transitions).toHaveLength(0);
    });

    it('should return empty array for non-existent entry', async () => {
      const transitions = await StatusTransition.findByEntry(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(transitions).toHaveLength(0);
    });
  });

  describe('getLatest', () => {
    it('should return the most recent transition for an entry', async () => {
      await StatusTransition.create({
        readingEntryId: testEntryId,
        fromStatus: null,
        toStatus: 'TO_READ',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await StatusTransition.create({
        readingEntryId: testEntryId,
        fromStatus: 'TO_READ',
        toStatus: 'READING',
      });

      const latest = await StatusTransition.getLatest(testEntryId);

      expect(latest).toMatchObject({
        fromStatus: 'TO_READ',
        toStatus: 'READING',
      });
    });

    it('should return null for entry with no transitions', async () => {
      const anotherBook = await createBookDirect({
        title: 'No Transitions',
        author: 'Test',
      });
      const anotherEntry = await createReadingEntryDirect(
        testReaderId,
        anotherBook,
        'TO_READ'
      );

      const latest = await StatusTransition.getLatest(anotherEntry);

      expect(latest).toBeNull();
    });
  });
});
