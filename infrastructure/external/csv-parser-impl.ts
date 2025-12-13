import Papa from 'papaparse';
import { CSVParser } from '../../domain/interfaces/csv-parser';

/**
 * Implementation of CSVParser using the papaparse library.
 * Provides generic CSV parsing capabilities with configurable options.
 */
export class CSVParserImpl implements CSVParser {
  /**
   * Parses CSV content into an array of typed objects.
   *
   * Configuration:
   * - Uses first row as headers
   * - Skips empty lines
   * - Trims whitespace from header names
   *
   * Validation:
   * - Ensures CSV is not empty
   * - Validates header row exists
   * - Provides detailed error messages with row numbers
   *
   * @param fileContent - The raw CSV file content as a string
   * @returns A promise resolving to an array of parsed objects of type T
   * @throws Error if the CSV content is malformed or cannot be parsed
   */
  async parse<T>(fileContent: string): Promise<T[]> {
    // Validate input is not empty
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('CSV file is empty');
    }

    return new Promise((resolve, reject) => {
      Papa.parse<T>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        complete: (results) => {
          // Check for parsing errors
          if (results.errors && results.errors.length > 0) {
            const errorMessages = results.errors
              .map(err => {
                const rowInfo = err.row !== undefined ? `Row ${err.row + 2}` : 'Unknown row';
                return `${rowInfo}: ${err.message}`;
              })
              .join('; ');
            reject(new Error(`CSV parsing failed: ${errorMessages}`));
            return;
          }

          // Validate we have data
          if (!results.data || results.data.length === 0) {
            reject(new Error('CSV file contains no data rows (only headers or empty file)'));
            return;
          }

          // Validate we have headers
          if (!results.meta || !results.meta.fields || results.meta.fields.length === 0) {
            reject(new Error('CSV file has no valid headers'));
            return;
          }

          resolve(results.data);
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }
}