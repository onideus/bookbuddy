import { GoodreadsBook } from '../entities/goodreads-book';

/**
 * Represents an error that occurred during import of a specific row.
 */
export interface ImportError {
  /** The CSV row number where the error occurred (1-indexed, excluding header) */
  row: number;
  /** Partial book data if available for context */
  book?: Partial<GoodreadsBook>;
  /** Human-readable description of the error */
  reason: string;
}

/**
 * Result of a Goodreads import operation.
 */
export interface ImportResult {
  /** Number of books successfully imported */
  imported: number;
  /** Number of books skipped (e.g., duplicates) */
  skipped: number;
  /** Array of errors encountered during import */
  errors: ImportError[];
}

/**
 * Interface for Goodreads CSV import functionality.
 * Implementations handle parsing CSV content and importing books for a user.
 */
export interface GoodreadsImporter {
  /**
   * Imports books from Goodreads CSV content for a specific user.
   * @param userId - The ID of the user to import books for
   * @param csvContent - The raw CSV file content as a string
   * @returns A promise resolving to the import result with counts and errors
   * @throws Error if the CSV format is invalid or cannot be processed
   */
  import(userId: string, csvContent: string): Promise<ImportResult>;
}