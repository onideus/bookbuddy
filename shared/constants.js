/**
 * Shared constants for BookBuddy Reading Journey Tracker
 * Ensures consistency between frontend and backend
 */

// Reading status enums (per spec FR-001)
export const ReadingStatus = {
  TO_READ: 'TO_READ',
  READING: 'READING',
  FINISHED: 'FINISHED',
};

// Display labels for UI
export const ReadingStatusLabels = {
  [ReadingStatus.TO_READ]: 'To Read',
  [ReadingStatus.READING]: 'Reading',
  [ReadingStatus.FINISHED]: 'Finished',
};

// Validation constants
export const Limits = {
  TITLE_MAX: 500,
  AUTHOR_MAX: 200,
  EDITION_MAX: 100,
  ISBN_MAX: 17,
  NOTE_MAX: 1000,
  REFLECTION_MAX: 2000,
  PAGE_MARKER_MAX: 50,
  RATING_MIN: 1,
  RATING_MAX: 5,
};

// Pagination defaults (FR-012)
export const Pagination = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  TRIGGER_PAGINATION_AT: 100,
};

// Rate limiting (FR-019)
export const RateLimits = {
  BOOK_ADDITIONS_PER_HOUR: 100,
  PROGRESS_NOTES_PER_HOUR: 500,
};
