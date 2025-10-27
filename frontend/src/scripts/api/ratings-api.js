/**
 * Ratings API Client (T112)
 * Handles communication with rating endpoints
 */

import { get, put, del } from './client.js';

/**
 * Set or update rating for a finished book
 * @param {string} entryId - Reading entry ID
 * @param {Object} ratingData - Rating data
 * @param {number} ratingData.rating - Rating (1-5)
 * @param {string} [ratingData.reflectionNote] - Optional reflection note (max 2000 chars)
 * @returns {Promise<Object>} Updated reading entry with rating
 */
export async function setRating(entryId, ratingData) {
  if (!entryId) {
    throw new Error('Entry ID is required');
  }

  if (!ratingData || typeof ratingData.rating !== 'number') {
    throw new Error('Rating is required and must be a number');
  }

  if (ratingData.rating < 1 || ratingData.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const response = await put(
    `/reading-entries/${entryId}/rating`,
    {
      rating: ratingData.rating,
      reflectionNote: ratingData.reflectionNote || undefined,
    }
  );

  return response;
}

/**
 * Clear rating for a reading entry (for re-reads)
 * @param {string} entryId - Reading entry ID
 * @returns {Promise<Object>} Updated reading entry without rating
 */
export async function clearRating(entryId) {
  if (!entryId) {
    throw new Error('Entry ID is required');
  }

  const response = await del(`/reading-entries/${entryId}/rating`);

  return response;
}

/**
 * Get top rated books (rating >= 4)
 * @param {string} readerId - Reader ID
 * @param {Object} options - Query options
 * @param {number} [options.page] - Page number
 * @param {number} [options.pageSize] - Page size
 * @returns {Promise<Object>} Top rated entries with pagination
 */
export async function getTopRatedBooks(readerId, options = {}) {
  if (!readerId) {
    throw new Error('Reader ID is required');
  }

  const params = new URLSearchParams({
    topRated: 'true',
  });

  if (options.page) {
    params.append('page', options.page.toString());
  }

  if (options.pageSize) {
    params.append('pageSize', options.pageSize.toString());
  }

  const response = await get(
    `/readers/${readerId}/reading-entries?${params.toString()}`
  );

  return response;
}

export default {
  setRating,
  clearRating,
  getTopRatedBooks,
};
