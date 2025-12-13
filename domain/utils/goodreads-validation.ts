/**
 * Validation utilities for Goodreads import.
 * Centralizes validation logic to avoid duplication and ensure consistency.
 */

/**
 * Required CSV column headers from Goodreads export.
 * These columns must be present in the CSV file.
 */
export const REQUIRED_GOODREADS_COLUMNS = [
  'Book Id',
  'Title',
  'Author',
  'Exclusive Shelf',
  'Date Added',
] as const;

/**
 * All expected CSV column headers from Goodreads export.
 * Used for validation and parsing.
 */
export const ALL_GOODREADS_COLUMNS = [
  'Book Id',
  'Title',
  'Author',
  'Author l-f',
  'Additional Authors',
  'ISBN',
  'ISBN13',
  'My Rating',
  'Average Rating',
  'Publisher',
  'Binding',
  'Number of Pages',
  'Year Published',
  'Original Publication Year',
  'Date Read',
  'Date Added',
  'Bookshelves',
  'Bookshelves with positions',
  'Exclusive Shelf',
  'My Review',
  'Spoiler',
  'Private Notes',
  'Read Count',
  'Recommended For',
  'Recommended By',
  'Owned Copies',
  'Original Purchase Date',
  'Original Purchase Location',
  'Condition',
  'Condition Description',
  'BCID',
] as const;

/**
 * Maximum field lengths to prevent excessively long data.
 */
export const MAX_FIELD_LENGTHS = {
  TITLE: 500,
  AUTHOR: 200,
  REVIEW: 10000,
  PUBLISHER: 200,
  BOOKSHELF_NAME: 100,
} as const;

/**
 * Validates that all required CSV headers are present.
 * @param headers - Array of column headers from the CSV
 * @returns Object with isValid flag and missing columns if any
 */
export function validateCSVHeaders(headers: string[]): {
  isValid: boolean;
  missingColumns: string[];
} {
  const normalizedHeaders = headers.map(h => h.trim());
  const missingColumns = REQUIRED_GOODREADS_COLUMNS.filter(
    required => !normalizedHeaders.includes(required)
  );

  return {
    isValid: missingColumns.length === 0,
    missingColumns,
  };
}

/**
 * Validates ISBN format (10 or 13 digits, with optional hyphens).
 * @param isbn - The ISBN string to validate
 * @returns true if valid ISBN format, false otherwise
 */
export function isValidISBN(isbn: string): boolean {
  if (!isbn || isbn.trim().length === 0) {
    return true; // Empty ISBN is acceptable (optional field)
  }

  // Remove hyphens and whitespace
  const cleaned = isbn.replace(/[-\s]/g, '');

  // Check if it's 10 or 13 digits
  const isbn10Pattern = /^\d{10}$/;
  const isbn13Pattern = /^\d{13}$/;

  return isbn10Pattern.test(cleaned) || isbn13Pattern.test(cleaned);
}

/**
 * Validates date format (YYYY/MM/DD or ISO format).
 * @param dateStr - The date string to validate
 * @returns Object with isValid flag and parsed date if valid
 */
export function validateDate(dateStr: string): {
  isValid: boolean;
  date?: Date;
  error?: string;
} {
  if (!dateStr || dateStr.trim().length === 0) {
    return { isValid: true }; // Empty date is acceptable (optional field)
  }

  // Try parsing the date
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date format. Expected format: YYYY/MM/DD',
    };
  }

  // Check if date is reasonable (not in future, not too far in past)
  const now = new Date();
  const minDate = new Date('1900-01-01');
  
  if (date > now) {
    return {
      isValid: false,
      error: 'Date cannot be in the future',
    };
  }
  
  if (date < minDate) {
    return {
      isValid: false,
      error: 'Date is too far in the past (before 1900)',
    };
  }

  return { isValid: true, date };
}

/**
 * Validates rating value (must be 0-5).
 * @param rating - The rating value to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateRating(rating: number | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (rating === undefined || rating === null) {
    return { isValid: true }; // Empty rating is acceptable
  }

  if (typeof rating !== 'number' || isNaN(rating)) {
    return {
      isValid: false,
      error: 'Rating must be a number',
    };
  }

  if (rating < 0 || rating > 5) {
    return {
      isValid: false,
      error: 'Rating must be between 0 and 5',
    };
  }

  return { isValid: true };
}

/**
 * Validates page count (must be positive).
 * @param pageCount - The page count to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePageCount(pageCount: number | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (pageCount === undefined || pageCount === null) {
    return { isValid: true }; // Empty page count is acceptable
  }

  if (typeof pageCount !== 'number' || isNaN(pageCount)) {
    return {
      isValid: false,
      error: 'Page count must be a number',
    };
  }

  if (pageCount < 0) {
    return {
      isValid: false,
      error: 'Page count cannot be negative',
    };
  }

  if (pageCount > 50000) {
    return {
      isValid: false,
      error: 'Page count seems unreasonably high (max 50,000 pages)',
    };
  }

  return { isValid: true };
}

/**
 * Validates exclusive shelf value.
 * @param shelf - The shelf value to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateExclusiveShelf(shelf: string): {
  isValid: boolean;
  error?: string;
} {
  if (!shelf || shelf.trim().length === 0) {
    return {
      isValid: false,
      error: 'Exclusive shelf is required',
    };
  }

  const validShelves = ['to-read', 'currently-reading', 'read'];
  const normalized = shelf.toLowerCase().trim();

  if (!validShelves.includes(normalized)) {
    return {
      isValid: false,
      error: `Invalid shelf value "${shelf}". Must be one of: to-read, currently-reading, read`,
    };
  }

  return { isValid: true };
}

/**
 * Validates and sanitizes text field length.
 * @param text - The text to validate
 * @param fieldName - Name of the field (for error messages)
 * @param maxLength - Maximum allowed length
 * @returns Object with isValid flag, sanitized text, and error message if invalid
 */
export function validateTextLength(
  text: string | undefined,
  fieldName: string,
  maxLength: number
): {
  isValid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return { isValid: true, sanitized: undefined };
  }

  const trimmed = text.trim();

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} exceeds maximum length of ${maxLength} characters (current: ${trimmed.length})`,
    };
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Sanitizes CSV field by handling special characters and escaping.
 * @param value - The value to sanitize
 * @returns Sanitized string
 */
export function sanitizeCSVField(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  // Trim whitespace
  let sanitized = value.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return sanitized;
}

/**
 * Validates year value (must be reasonable).
 * @param year - The year to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateYear(year: number | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (year === undefined || year === null) {
    return { isValid: true }; // Empty year is acceptable
  }

  if (typeof year !== 'number' || isNaN(year)) {
    return {
      isValid: false,
      error: 'Year must be a number',
    };
  }

  const currentYear = new Date().getFullYear();
  const minYear = 1000; // Books before this are rare

  if (year < minYear) {
    return {
      isValid: false,
      error: `Year ${year} seems too far in the past (minimum: ${minYear})`,
    };
  }

  if (year > currentYear + 5) {
    return {
      isValid: false,
      error: `Year ${year} is too far in the future (maximum: ${currentYear + 5})`,
    };
  }

  return { isValid: true };
}