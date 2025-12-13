/**
 * Generic interface for parsing CSV files into typed objects.
 * This interface defines the contract for CSV parsing implementations.
 */
export interface CSVParser {
  /**
   * Parses CSV content into an array of typed objects.
   * @param fileContent - The raw CSV file content as a string
   * @returns A promise resolving to an array of parsed objects of type T
   * @throws Error if the CSV content is malformed or cannot be parsed
   */
  parse<T>(fileContent: string): Promise<T[]>;
}