/**
 * API client for reading entries endpoints (T057)
 */

import { get, post, patch, retryWithBackoff } from './client.js';

/**
 * Add a new book to reader's library
 * @param {string} readerId - Reader ID
 * @param {Object} bookData - Book data
 * @returns {Promise<Object>} Created entry
 */
export async function addBook(readerId, bookData) {
  return await retryWithBackoff(() =>
    post(`/readers/${readerId}/reading-entries`, bookData)
  );
}

/**
 * Get reading entries for a reader
 * @param {string} readerId - Reader ID
 * @param {Object} params - Query parameters (status, page, pageSize)
 * @returns {Promise<Object>} Entries and pagination
 */
export async function getEntries(readerId, params = {}) {
  return await get(`/readers/${readerId}/reading-entries`, params);
}

/**
 * Update reading entry status
 * @param {string} entryId - Entry ID
 * @param {string} newStatus - New status
 * @param {string} updatedAt - Current updatedAt timestamp
 * @returns {Promise<Object>} Updated entry
 */
export async function updateStatus(entryId, newStatus, updatedAt = null) {
  return await retryWithBackoff(() =>
    patch(`/reading-entries/${entryId}`, {
      status: newStatus,
      updatedAt,
    })
  );
}

/**
 * Get status transition history for an entry
 * @param {string} entryId - Entry ID
 * @returns {Promise<Array>} Transitions
 */
export async function getTransitions(entryId) {
  return await get(`/reading-entries/${entryId}/transitions`);
}

export default {
  addBook,
  getEntries,
  updateStatus,
  getTransitions,
};
