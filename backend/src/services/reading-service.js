/**
 * ReadingService - Business logic for reading entries (T047-T049)
 * Handles book addition, status transitions, and entry queries
 */

import { Book } from '../models/book.js';
import { ReadingEntry } from '../models/reading-entry.js';
import { StatusTransition } from '../models/status-transition.js';
import * as ProgressUpdate from '../models/progress-update.js';
import { transaction } from '../db/connection.js';
import { logAnalyticsEvent } from '../lib/logger.js';

export class ReadingService {
  /**
   * Add a book to reader's library (T047)
   * Checks for duplicates, creates book + entry + initial transition
   * @param {string} readerId - Reader ID
   * @param {Object} bookData - Book and entry data
   * @returns {Promise<Object>} Created entry with book info
   */
  static async addBook(readerId, bookData) {
    const { title, author, edition, isbn, status = 'TO_READ' } = bookData;

    // Check if book already exists for this reader
    const existingBook = await Book.findByTitleAuthorEdition(title, author, edition);

    if (existingBook) {
      // Check if reader already has this book
      const entries = await ReadingEntry.findByReaderAndStatus(readerId, status);
      const duplicate = entries.find((e) => e.book.id === existingBook.id);

      if (duplicate) {
        const error = new Error(
          `Book "${title}" by ${author}${edition ? ` (${edition})` : ''} already exists in your library`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      let book;
      let isNewBook = false;

      if (existingBook) {
        book = existingBook;
      } else {
        // Create new book
        book = await Book.create({ title, author, edition, isbn });
        isNewBook = true;
      }

      // Create reading entry
      const entry = await ReadingEntry.create({
        readerId,
        bookId: book.id,
        status,
      });

      // Create initial status transition
      await StatusTransition.create({
        readingEntryId: entry.id,
        fromStatus: null,
        toStatus: status,
      });

      return { book, entry, isNewBook };
    });

    // Log analytics event (FR-016)
    logAnalyticsEvent({
      eventType: 'book_added',
      readerId,
      bookId: result.book.id,
      entryId: result.entry.id,
      status,
      isNewBook: result.isNewBook,
      timestamp: new Date().toISOString(),
    });

    return {
      readingEntry: {
        ...result.entry,
        book: result.book,
      },
      book: result.book,
      isNew: result.isNewBook,
    };
  }

  /**
   * Get reading entries for a reader (T048)
   * Supports filtering by status and pagination
   * @param {string} readerId - Reader ID
   * @param {Object} options - Query options (status, page, pageSize)
   * @returns {Promise<Object>} Entries and pagination
   */
  static async getReadingEntries(readerId, options = {}) {
    const { status, page = 1, pageSize = 50 } = options;

    if (status) {
      // Filter by status
      const entries = await ReadingEntry.findByReaderAndStatus(readerId, status);

      return {
        entries,
        pagination: {
          page: 1,
          pageSize: entries.length,
          total: entries.length,
          hasMore: false,
        },
      };
    }

    // Get all entries with pagination
    return await ReadingEntry.findByReader(readerId, { page, pageSize });
  }

  /**
   * Update reading entry status (T049)
   * Validates transition, updates entry, records transition history
   * Implements last-write-wins for concurrent edits (FR-010)
   * @param {string} readerId - Reader ID
   * @param {string} entryId - Entry ID
   * @param {Object} updates - Update data (newStatus, updatedAt)
   * @returns {Promise<Object>} Updated entry
   */
  static async updateStatus(readerId, entryId, updates) {
    const { newStatus, updatedAt } = updates;

    // Get current entry
    const currentEntry = await ReadingEntry.findById(entryId);

    if (!currentEntry) {
      const error = new Error('Reading entry not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify reader owns this entry
    if (currentEntry.readerId !== readerId) {
      const error = new Error('Access denied to this reading entry');
      error.statusCode = 403;
      throw error;
    }

    const oldStatus = currentEntry.status;

    // Check for stale update (FR-010 - last-write-wins with warning)
    let conflictWarning = false;
    if (updatedAt && new Date(updatedAt) < currentEntry.updatedAt) {
      conflictWarning = true;
      // Log warning but proceed (last-write-wins)
      logAnalyticsEvent({
        eventType: 'concurrent_edit_detected',
        readerId,
        entryId,
        clientTimestamp: updatedAt,
        serverTimestamp: currentEntry.updatedAt.toISOString(),
      });
    }

    // Use transaction for atomicity
    const result = await transaction(async (client) => {
      // Update entry status
      const updatedEntry = await ReadingEntry.updateStatus(entryId, newStatus);

      // Record status transition
      await StatusTransition.create({
        readingEntryId: entryId,
        fromStatus: oldStatus,
        toStatus: newStatus,
      });

      return updatedEntry;
    });

    // Log analytics event (FR-016)
    logAnalyticsEvent({
      eventType: 'status_changed',
      readerId,
      entryId,
      bookId: currentEntry.book.id,
      fromStatus: oldStatus,
      toStatus: newStatus,
      conflictWarning,
      timestamp: new Date().toISOString(),
    });

    return {
      readingEntry: {
        ...result,
        book: currentEntry.book,
      },
      conflictWarning,
    };
  }

  /**
   * Set rating for a finished book (T100 - for User Story 3)
   * @param {string} readerId - Reader ID
   * @param {string} entryId - Entry ID
   * @param {Object} ratingData - Rating and reflection
   * @returns {Promise<Object>} Updated entry
   */
  static async setRating(readerId, entryId, ratingData) {
    const { rating, reflectionNote } = ratingData;

    const entry = await ReadingEntry.findById(entryId);

    if (!entry) {
      const error = new Error('Reading entry not found');
      error.statusCode = 404;
      throw error;
    }

    if (entry.readerId !== readerId) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }

    if (entry.status !== 'FINISHED') {
      const error = new Error('Can only rate finished books');
      error.statusCode = 400;
      throw error;
    }

    // Update would go here - not fully implemented yet as it's for US3

    return entry;
  }

  /**
   * Add a progress note for a reading entry (User Story 2 - T077)
   * @param {string} entryId - Reading entry ID
   * @param {Object} noteData - Note data
   * @param {string} noteData.content - Note content (1-1000 chars)
   * @param {string} [noteData.progressMarker] - Optional page/chapter marker (max 50 chars)
   * @returns {Promise<Object>} Created progress note
   */
  static async addProgressNote(entryId, noteData) {
    const { content, progressMarker } = noteData;

    // Validation
    if (!content || content.trim().length === 0) {
      throw new Error('Note content is required');
    }

    if (content.length > 1000) {
      throw new Error('Note content must not exceed 1000 characters');
    }

    if (progressMarker && progressMarker.length > 50) {
      throw new Error('Progress marker must not exceed 50 characters');
    }

    // Check if reading entry exists
    const entry = await ReadingEntry.findById(entryId);
    if (!entry) {
      throw new Error('Reading entry not found or does not exist');
    }

    // Create progress note
    const progressUpdate = await ProgressUpdate.create({
      readingEntryId: entryId,
      note: content,
      pageOrChapter: progressMarker,
    });

    // Log analytics event
    logAnalyticsEvent('progress_note_added', {
      entryId,
      readerId: entry.reader_id,
      hasProgressMarker: !!progressMarker,
    });

    // Return formatted response
    return {
      noteId: progressUpdate.id,
      recordedAt: progressUpdate.created_at.toISOString(),
      content: progressUpdate.note,
      progressMarker: progressUpdate.page_or_chapter,
    };
  }

  /**
   * Get progress notes for a reading entry (User Story 2 - T078)
   * @param {string} entryId - Reading entry ID
   * @returns {Promise<Array>} Progress notes with book details, newest first
   */
  static async getProgressNotes(entryId) {
    // Check if reading entry exists
    const entry = await ReadingEntry.findById(entryId);
    if (!entry) {
      throw new Error('Reading entry not found or does not exist');
    }

    // Verify book data is included (should always be present from findById JOIN)
    if (!entry.book) {
      throw new Error('Book data not found for this reading entry');
    }

    // Get progress updates
    const updates = await ProgressUpdate.findByEntry(entryId);

    // Format response - use book data already included in entry
    return updates.map((update) => ({
      noteId: update.id,
      recordedAt: update.created_at.toISOString(),
      content: update.note,
      progressMarker: update.page_or_chapter,
      book: {
        id: entry.book.id,
        title: entry.book.title,
        author: entry.book.author,
        edition: entry.book.edition,
      },
    }));
  }

  /**
   * Get top rated books (rating >= 4) for User Story 3
   * @param {string} readerId - Reader ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Top rated entries
   */
  static async getTopRatedBooks(readerId, options = {}) {
    // Implementation for US3 - placeholder
    return {
      entries: [],
      pagination: { page: 1, pageSize: 50, total: 0, hasMore: false },
    };
  }
}

export default ReadingService;
