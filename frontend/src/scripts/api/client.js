/**
 * API client base with fetch wrapper
 * Handles error handling and correlation ID extraction (FR-017)
 */

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * API client error class
 */
export class ApiError extends Error {
  constructor(message, statusCode, correlationId, data) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.correlationId = correlationId;
    this.data = data;
  }
}

/**
 * Make an API request with error handling
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    credentials: 'include', // Include cookies for session
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const requestOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, requestOptions);

    // Extract correlation ID from response headers
    const correlationId = response.headers.get('x-correlation-id');

    // Parse response body
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle non-2xx responses
    if (!response.ok) {
      const message = data.message || data.error || `HTTP ${response.status}`;
      throw new ApiError(message, response.status, correlationId, data);
    }

    // Attach correlation ID to successful response
    if (typeof data === 'object' && data !== null) {
      data._correlationId = correlationId;
    }

    return data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors, timeout, etc.
    throw new ApiError(
      error.message || 'Network request failed',
      0,
      null,
      null
    );
  }
}

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response data
 */
export async function get(endpoint, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${endpoint}?${query}` : endpoint;

  return apiRequest(url, {
    method: 'GET',
  });
}

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
export async function post(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
export async function put(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Make a PATCH request
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
export async function patch(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
export async function del(endpoint) {
  return apiRequest(endpoint, {
    method: 'DELETE',
  });
}

/**
 * Retry a request with exponential backoff (FR-011)
 * @param {Function} requestFn - Function that returns a Promise
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<any>} Result from request
 */
export async function retryWithBackoff(requestFn, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry 4xx client errors (except 429 rate limit)
      if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export default {
  get,
  post,
  put,
  patch,
  del,
  retryWithBackoff,
  ApiError,
};
