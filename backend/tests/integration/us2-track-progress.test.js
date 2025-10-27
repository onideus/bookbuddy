/**
 * Integration tests for User Story 2: Track Active Reading Progress (T072)
 * 
 * Test flow: add progress note → retrieve notes chronologically → verify analytics event
 * Coverage target: ≥90%
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { pool } from '../../src/db/connection.js';
import * as ReadingService from '../../src/services/reading-service.js';
import * as Book from '../../src/models/book.js';
import * as ReadingEntry from '../../src/models/reading-entry.js';

describe('US2: Track Active Reading Progress Integration Test', () => {
  let testReaderId;
  let testBookId;
  let testEntryId;

  beforeAll(async () => {
    // Setup test reader
    const readerResult = await pool.query(
      'INSERT INTO reader_profiles (id) VALUES (gen_random_uuid()) RETURNING id'
    );
    testReaderId = readerResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test reader
    await pool.query('DELETE FROM reader_profiles WHERE id = $1', [testReaderId]);
  });

  beforeEach(async () => {
    // Create test book
    const book = await Book.create({
      title: 'Journey Through Middle-earth',
      author: 'J.R.R. Tolkien',
      edition: 'Deluxe Edition'
    });
    testBookId = book.id;

    // Add book to reading list with READING status
    const entry = await ReadingService.addBook({
      readerId: testReaderId,
      title: 'Journey Through Middle-earth',
      author: 'J.R.R. Tolkien',
      edition: 'Deluxe Edition',
      status: 'READING'
    });
    testEntryId = entry.id;
  });

  afterEach(async () => {
    // Clean up
    await pool.query('DELETE FROM progress_updates WHERE reading_entry_id = $1', [testEntryId]);
    await pool.query('DELETE FROM reading_entries WHERE id = $1', [testEntryId]);
    await pool.query('DELETE FROM books WHERE id = $1', [testBookId]);
  });

  it('should complete full user journey: add progress note → retrieve chronologically → verify analytics', async () => {
    // Step 1: Add first progress note
    const note1 = await ReadingService.addProgressNote(testEntryId, {
      note: 'Started reading. The prologue sets an interesting tone.',
      pageOrChapter: 'Prologue'
    });

    expect(note1).toBeDefined();
    expect(note1.id).toBeDefined();
    expect(note1.note).toBe('Started reading. The prologue sets an interesting tone.');
    expect(note1.page_or_chapter).toBe('Prologue');
    expect(note1.created_at).toBeInstanceOf(Date);

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Step 2: Add second progress note
    const note2 = await ReadingService.addProgressNote(testEntryId, {
      note: 'The plot is picking up. Characters are well-developed.',
      pageOrChapter: 'Chapter 5'
    });

    expect(note2.id).toBeDefined();
    expect(note2.page_or_chapter).toBe('Chapter 5');

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Step 3: Add third progress note (no page marker)
    const note3 = await ReadingService.addProgressNote(testEntryId, {
      note: 'Incredible plot twist! Did not see that coming.'
    });

    expect(note3.id).toBeDefined();
    expect(note3.page_or_chapter).toBeNull();

    // Step 4: Retrieve notes chronologically (newest first)
    const notes = await ReadingService.getProgressNotes(testEntryId);

    expect(notes).toHaveLength(3);
    
    // Verify chronological ordering (DESC - newest first)
    expect(notes[0].note).toBe('Incredible plot twist! Did not see that coming.');
    expect(notes[1].note).toBe('The plot is picking up. Characters are well-developed.');
    expect(notes[2].note).toBe('Started reading. The prologue sets an interesting tone.');

    // Verify timestamps are in descending order
    expect(notes[0].created_at.getTime()).toBeGreaterThanOrEqual(notes[1].created_at.getTime());
    expect(notes[1].created_at.getTime()).toBeGreaterThanOrEqual(notes[2].created_at.getTime());

    // Verify book details are included
    expect(notes[0]).toHaveProperty('book_title');
    expect(notes[0].book_title).toBe('Journey Through Middle-earth');
    expect(notes[0]).toHaveProperty('book_author');
    expect(notes[0].book_author).toBe('J.R.R. Tolkien');

    // Step 5: Verify analytics events were emitted
    // In a real implementation, this would check an analytics service or event log
    // For now, we verify the progress updates exist in the database
    const dbNotes = await pool.query(
      `SELECT * FROM progress_updates 
       WHERE reading_entry_id = $1 
       ORDER BY created_at DESC`,
      [testEntryId]
    );

    expect(dbNotes.rows).toHaveLength(3);
  });

  it('should handle progress notes for books in READING status', async () => {
    // Verify the entry is in READING status
    const entry = await ReadingEntry.findById(testEntryId);
    expect(entry.status).toBe('READING');

    // Add progress note
    const note = await ReadingService.addProgressNote(testEntryId, {
      note: 'Making good progress',
      pageOrChapter: 'Page 150'
    });

    expect(note).toBeDefined();
    
    // Retrieve notes
    const notes = await ReadingService.getProgressNotes(testEntryId);
    expect(notes).toHaveLength(1);
    expect(notes[0].note).toBe('Making good progress');
  });

  it('should validate note length constraints', async () => {
    // Test max length (1000 characters) - should succeed
    const validNote = 'a'.repeat(1000);
    const result = await ReadingService.addProgressNote(testEntryId, {
      note: validNote
    });
    expect(result.note).toBe(validNote);

    // Test exceeding max length (1001 characters) - should fail
    const invalidNote = 'a'.repeat(1001);
    await expect(
      ReadingService.addProgressNote(testEntryId, {
        note: invalidNote
      })
    ).rejects.toThrow();
  });

  it('should validate page/chapter marker length constraints', async () => {
    // Test max length (50 characters) - should succeed
    const validMarker = 'a'.repeat(50);
    const result = await ReadingService.addProgressNote(testEntryId, {
      note: 'Test note',
      pageOrChapter: validMarker
    });
    expect(result.page_or_chapter).toBe(validMarker);

    // Test exceeding max length (51 characters) - should fail
    const invalidMarker = 'a'.repeat(51);
    await expect(
      ReadingService.addProgressNote(testEntryId, {
        note: 'Test note',
        pageOrChapter: invalidMarker
      })
    ).rejects.toThrow();
  });

  it('should reject empty notes', async () => {
    await expect(
      ReadingService.addProgressNote(testEntryId, {
        note: ''
      })
    ).rejects.toThrow();

    await expect(
      ReadingService.addProgressNote(testEntryId, {
        note: '   '
      })
    ).rejects.toThrow();
  });

  it('should handle multiple progress notes over time', async () => {
    // Simulate a realistic reading journey with multiple updates
    const updates = [
      { note: 'Starting chapter 1', pageOrChapter: 'Chapter 1' },
      { note: 'Interesting character introduction', pageOrChapter: 'Chapter 2' },
      { note: 'Plot thickening', pageOrChapter: 'Chapter 3' },
      { note: 'Unexpected revelation', pageOrChapter: 'Chapter 4' },
      { note: 'Nearing the climax', pageOrChapter: 'Chapter 5' }
    ];

    // Add notes with small delays
    for (const update of updates) {
      await ReadingService.addProgressNote(testEntryId, update);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Retrieve all notes
    const notes = await ReadingService.getProgressNotes(testEntryId);

    expect(notes).toHaveLength(5);
    
    // Verify reverse chronological order
    expect(notes[0].page_or_chapter).toBe('Chapter 5');
    expect(notes[1].page_or_chapter).toBe('Chapter 4');
    expect(notes[2].page_or_chapter).toBe('Chapter 3');
    expect(notes[3].page_or_chapter).toBe('Chapter 2');
    expect(notes[4].page_or_chapter).toBe('Chapter 1');
  });

  it('should return empty array when no progress notes exist', async () => {
    const notes = await ReadingService.getProgressNotes(testEntryId);
    expect(notes).toEqual([]);
  });

  it('should isolate progress notes by reading entry', async () => {
    // Create a second book and reading entry
    const book2 = await Book.create({
      title: 'Another Book',
      author: 'Another Author'
    });

    const entry2 = await ReadingService.addBook({
      readerId: testReaderId,
      title: 'Another Book',
      author: 'Another Author',
      status: 'READING'
    });

    // Add progress notes to both entries
    await ReadingService.addProgressNote(testEntryId, {
      note: 'Note for first book'
    });

    await ReadingService.addProgressNote(entry2.id, {
      note: 'Note for second book'
    });

    // Retrieve notes for first entry
    const notes1 = await ReadingService.getProgressNotes(testEntryId);
    expect(notes1).toHaveLength(1);
    expect(notes1[0].note).toBe('Note for first book');

    // Retrieve notes for second entry
    const notes2 = await ReadingService.getProgressNotes(entry2.id);
    expect(notes2).toHaveLength(1);
    expect(notes2[0].note).toBe('Note for second book');

    // Clean up
    await pool.query('DELETE FROM progress_updates WHERE reading_entry_id = $1', [entry2.id]);
    await pool.query('DELETE FROM reading_entries WHERE id = $1', [entry2.id]);
    await pool.query('DELETE FROM books WHERE id = $1', [book2.id]);
  });
});
