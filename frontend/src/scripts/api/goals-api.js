/**
 * Goals API Client (T009, T036-T038)
 * Handles communication with reading goals endpoints
 */

import { get, post, patch, del } from './client.js';

/**
 * Create a new reading goal (T036)
 * @param {Object} goalData - Goal data
 * @param {string} goalData.name - Goal name (1-255 chars)
 * @param {number} goalData.targetCount - Number of books to read (1-9999)
 * @param {number} goalData.daysFromNow - Goal timeframe in days (1-3650)
 * @param {string} [goalData.timezone] - User's IANA timezone (optional)
 * @returns {Promise<Object>} Created goal
 * @throws {ApiError} If validation fails or API request fails
 */
export async function createGoal(goalData) {
  if (!goalData || typeof goalData !== 'object') {
    throw new Error('Goal data is required');
  }

  if (!goalData.name || typeof goalData.name !== 'string') {
    throw new Error('Goal name is required and must be a string');
  }

  if (goalData.name.length < 1 || goalData.name.length > 255) {
    throw new Error('Goal name must be 1-255 characters');
  }

  if (!Number.isInteger(goalData.targetCount) || goalData.targetCount < 1 || goalData.targetCount > 9999) {
    throw new Error('Target count must be an integer between 1 and 9999');
  }

  if (!Number.isInteger(goalData.daysFromNow) || goalData.daysFromNow < 1 || goalData.daysFromNow > 3650) {
    throw new Error('Days from now must be an integer between 1 and 3650');
  }

  const requestBody = {
    name: goalData.name.trim(),
    targetCount: goalData.targetCount,
    daysFromNow: goalData.daysFromNow,
  };

  if (goalData.timezone) {
    requestBody.timezone = goalData.timezone;
  }

  const response = await post('/goals', requestBody);
  return response;
}

/**
 * Get goal details with progress history (T037)
 * @param {string} goalId - Goal ID (UUID)
 * @returns {Promise<Object>} Goal details including progress history
 * @throws {ApiError} If goal not found or API request fails
 */
export async function getGoal(goalId) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal ID is required and must be a string');
  }

  const response = await get(`/goals/${goalId}`);
  return response;
}

/**
 * List all reading goals with optional filtering (US2 - T056)
 * @param {Object} options - Query options
 * @param {string} [options.status] - Filter by status (active, completed, expired)
 * @param {number} [options.limit] - Maximum goals to return (1-100, default 50)
 * @param {number} [options.offset] - Number of goals to skip (default 0)
 * @returns {Promise<Object>} Goals list with pagination info
 */
export async function listGoals(options = {}) {
  const params = {};

  if (options.status) {
    if (!['active', 'completed', 'expired'].includes(options.status)) {
      throw new Error('Status must be one of: active, completed, expired');
    }
    params.status = options.status;
  }

  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) {
      throw new Error('Limit must be an integer between 1 and 100');
    }
    params.limit = options.limit;
  }

  if (options.offset !== undefined) {
    if (!Number.isInteger(options.offset) || options.offset < 0) {
      throw new Error('Offset must be a non-negative integer');
    }
    params.offset = options.offset;
  }

  const response = await get('/goals', params);
  return response;
}

/**
 * Update an active goal (US3 - T076)
 * @param {string} goalId - Goal ID (UUID)
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - Updated goal name (1-255 chars)
 * @param {number} [updates.targetCount] - Updated target count (1-9999)
 * @param {number} [updates.daysToAdd] - Days to extend deadline (1-365)
 * @returns {Promise<Object>} Updated goal
 * @throws {ApiError} If goal is not editable or validation fails
 */
export async function updateGoal(goalId, updates) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal ID is required and must be a string');
  }

  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    throw new Error('At least one field must be provided for update');
  }

  const requestBody = {};

  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || updates.name.length < 1 || updates.name.length > 255) {
      throw new Error('Goal name must be 1-255 characters');
    }
    requestBody.name = updates.name.trim();
  }

  if (updates.targetCount !== undefined) {
    if (!Number.isInteger(updates.targetCount) || updates.targetCount < 1 || updates.targetCount > 9999) {
      throw new Error('Target count must be an integer between 1 and 9999');
    }
    requestBody.targetCount = updates.targetCount;
  }

  if (updates.daysToAdd !== undefined) {
    if (!Number.isInteger(updates.daysToAdd) || updates.daysToAdd < 1 || updates.daysToAdd > 365) {
      throw new Error('Days to add must be an integer between 1 and 365');
    }
    requestBody.daysToAdd = updates.daysToAdd;
  }

  const response = await patch(`/goals/${goalId}`, requestBody);
  return response;
}

/**
 * Delete a reading goal (US3 - T077)
 * @param {string} goalId - Goal ID (UUID)
 * @returns {Promise<void>}
 * @throws {ApiError} If goal not found or API request fails
 */
export async function deleteGoal(goalId) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal ID is required and must be a string');
  }

  await del(`/goals/${goalId}`);
}

/**
 * Get goal progress history (books that counted toward goal)
 * @param {string} goalId - Goal ID (UUID)
 * @returns {Promise<Object>} Goal progress entries
 * @throws {ApiError} If goal not found or API request fails
 */
export async function getGoalProgress(goalId) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal ID is required and must be a string');
  }

  const response = await get(`/goals/${goalId}/progress`);
  return response;
}

export default {
  createGoal,
  getGoal,
  listGoals,
  updateGoal,
  deleteGoal,
  getGoalProgress,
};
