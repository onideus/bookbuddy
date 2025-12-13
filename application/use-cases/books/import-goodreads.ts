import { GoodreadsImporter } from '../../../domain/interfaces/goodreads-importer';
import { ValidationError, InfrastructureError } from '../../../domain/errors/domain-errors';
import { logger } from '../../../infrastructure/logging';

/**
 * Input parameters for the ImportGoodreads use case.
 */
export interface ImportGoodreadsParams {
  /** The authenticated user's ID */
  userId: string;
  /** The CSV file content as string */
  csvContent: string;
}

/**
 * Result of the ImportGoodreads use case.
 */
export interface ImportGoodreadsResult {
  /** Whether the import was successful */
  success: boolean;
  /** Number of books successfully imported */
  imported: number;
  /** Number of books skipped (e.g., duplicates) */
  skipped: number;
  /** Array of errors encountered during import */
  errors: Array<{ row: number; reason: string; book?: any }>;
  /** User-friendly summary message */
  message: string;
}

/**
 * Use case for importing books from Goodreads CSV export.
 * 
 * This use case orchestrates the Goodreads import process by:
 * 1. Validating input parameters
 * 2. Delegating to the GoodreadsImporter infrastructure service
 * 3. Transforming the result into a user-friendly format
 * 4. Generating appropriate success/error messages
 */
export class ImportGoodreadsUseCase {
  constructor(private readonly goodreadsImporter: GoodreadsImporter) {}

  /**
   * Execute the import operation.
   * 
   * @param params - Import parameters (userId and csvContent)
   * @returns Promise resolving to import result with counts, errors, and message
   * @throws ValidationError if input validation fails
   * @throws InfrastructureError if the import operation fails
   */
  async execute(params: ImportGoodreadsParams): Promise<ImportGoodreadsResult> {
    // Validate input parameters
    this.validateParams(params);

    try {
      // Call the infrastructure importer
      const importResult = await this.goodreadsImporter.import(
        params.userId,
        params.csvContent
      );

      // Transform to user-friendly result
      const result: ImportGoodreadsResult = {
        success: importResult.imported > 0 || (importResult.imported === 0 && importResult.skipped > 0 && importResult.errors.length === 0),
        imported: importResult.imported,
        skipped: importResult.skipped,
        errors: importResult.errors,
        message: this.generateMessage(importResult),
      };

      // Log the import result for debugging
      logger.info('Goodreads import completed', {
        userId: params.userId,
        imported: result.imported,
        skipped: result.skipped,
        errorCount: result.errors.length,
      });

      return result;
    } catch (error) {
      // Wrap infrastructure errors in application-layer errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Goodreads import failed', {
        userId: params.userId,
        error: errorMessage,
      });

      throw new InfrastructureError(
        'Failed to import Goodreads data. Please check the CSV format and try again.',
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Validates the input parameters.
   * @throws ValidationError if validation fails
   */
  private validateParams(params: ImportGoodreadsParams): void {
    if (!params.userId || params.userId.trim().length === 0) {
      throw new ValidationError('User ID is required for import operation');
    }

    if (!params.csvContent || params.csvContent.trim().length === 0) {
      throw new ValidationError('CSV content is required. Please provide a valid Goodreads library export CSV file.');
    }

    // Validate CSV content appears to be valid (basic check)
    const lines = params.csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new ValidationError(
        'CSV file appears to be empty or contains only headers. Please ensure your Goodreads export contains book data.'
      );
    }

    // Validate file size (10MB max as per design doc)
    const fileSizeBytes = Buffer.byteLength(params.csvContent, 'utf8');
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (fileSizeBytes > maxSizeBytes) {
      throw new ValidationError(
        `CSV file size exceeds the maximum limit of 10MB. Your file is ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB. ` +
        `Please try exporting a smaller date range or splitting your library into multiple imports.`
      );
    }
  }

  /**
   * Generates a user-friendly message based on the import result.
   */
  private generateMessage(result: { imported: number; skipped: number; errors: Array<any> }): string {
    // If books were imported successfully
    if (result.imported > 0) {
      if (result.skipped > 0 && result.errors.length > 0) {
        return `Successfully imported ${result.imported} book${result.imported === 1 ? '' : 's'}. ` +
               `Skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}. ` +
               `${result.errors.length} book${result.errors.length === 1 ? '' : 's'} failed to import (see error details).`;
      }
      if (result.skipped > 0) {
        return `Successfully imported ${result.imported} book${result.imported === 1 ? '' : 's'}. ` +
               `Skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}.`;
      }
      if (result.errors.length > 0) {
        return `Successfully imported ${result.imported} book${result.imported === 1 ? '' : 's'}. ` +
               `${result.errors.length} book${result.errors.length === 1 ? '' : 's'} failed to import (see error details).`;
      }
      return `Successfully imported ${result.imported} book${result.imported === 1 ? '' : 's'}.`;
    }

    // If no books were imported but some were skipped (all duplicates)
    if (result.imported === 0 && result.skipped > 0) {
      return 'All books from the CSV were already in your library (duplicates).';
    }

    // If there were errors and nothing was imported
    if (result.imported === 0 && result.errors.length > 0) {
      return `Import failed. No books were imported due to validation errors. Please review the error details and fix your CSV file.`;
    }

    // Edge case: empty CSV or no valid books
    return 'No books found in the CSV file. Please ensure your Goodreads export contains book data.';
  }
}