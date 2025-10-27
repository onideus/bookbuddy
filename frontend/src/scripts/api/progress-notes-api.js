/**
 * Progress Notes API Client (T084)
 * Handles communication with progress notes endpoints
 */

import { get, post } from './client.js';

/**
 * Add a progress note to a reading entry
 * @param {string} entryId - Reading entry ID
 * @param {Object} noteData - Progress note data
 * @param {string} noteData.content - Note content (1-1000 characters)
 * @param {string} [noteData.progressMarker] - Optional page/chapter marker (max 50 chars)
 * @returns {Promise<Object>} Created progress note
 */
export async function addProgressNote(entryId, noteData) {
  if (!entryId) {
    throw new Error('Entry ID is required');
  }

  if (!noteData || !noteData.content) {
    throw new Error('Note content is required');
  }

  const response = await post(
    `/reading-entries/${entryId}/progress-notes`,
    {
      content: noteData.content,
      progressMarker: noteData.progressMarker || null,
    }
  );

  return response;
}

/**
 * Get all progress notes for a reading entry
 * @param {string} entryId - Reading entry ID
 * @returns {Promise<Array>} List of progress notes (newest first)
 */
export async function getProgressNotes(entryId) {
  if (!entryId) {
    throw new Error('Entry ID is required');
  }

  const response = await get(
    `/reading-entries/${entryId}/progress-notes`
  );

  return response;
}

export default {
  addProgressNote,
  getProgressNotes,
};
