/**
 * Pagination utilities for API responses
 */

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    totalCount?: number;
  };
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Parse and validate pagination parameters from query string
 */
export function parsePaginationParams(query: {
  cursor?: string;
  limit?: string;
}): PaginationParams {
  let limit = parseInt(query.limit ?? '', 10);

  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_PAGE_SIZE;
  } else if (limit > MAX_PAGE_SIZE) {
    limit = MAX_PAGE_SIZE;
  }

  return {
    cursor: query.cursor,
    limit,
  };
}

/**
 * Apply cursor-based pagination to an array of items
 * Items should be sorted by the cursor field (e.g., addedAt descending)
 *
 * @param items - Full array of items (sorted)
 * @param cursorField - Field to use as cursor (should be unique or combined with id)
 * @param params - Pagination parameters
 */
export function paginateArray<T extends Record<string, unknown>>(
  items: T[],
  cursorField: keyof T,
  params: PaginationParams
): PaginatedResult<T> {
  const { cursor, limit = DEFAULT_PAGE_SIZE } = params;

  let startIndex = 0;

  if (cursor) {
    // Find the item with the cursor value
    startIndex = items.findIndex((item) => String(item[cursorField]) === cursor);
    if (startIndex === -1) {
      startIndex = 0;
    } else {
      // Start after the cursor item
      startIndex += 1;
    }
  }

  const paginatedItems = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < items.length;
  const nextCursor = hasMore ? String(paginatedItems[paginatedItems.length - 1]?.[cursorField]) : null;

  return {
    data: paginatedItems,
    pagination: {
      nextCursor,
      hasMore,
      totalCount: items.length,
    },
  };
}

/**
 * Create pagination metadata for response
 */
export function createPaginationMeta(
  items: unknown[],
  limit: number,
  totalCount?: number
): { nextCursor: string | null; hasMore: boolean; totalCount?: number } {
  return {
    nextCursor: items.length === limit ? (items[items.length - 1] as { id: string }).id : null,
    hasMore: items.length === limit,
    ...(totalCount !== undefined && { totalCount }),
  };
}
