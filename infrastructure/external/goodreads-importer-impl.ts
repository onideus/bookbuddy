import { CSVParser } from '../../domain/interfaces/csv-parser';
import { GoodreadsImporter, ImportResult, ImportError } from '../../domain/interfaces/goodreads-importer';
import { IBookRepository } from '../../domain/interfaces/book-repository';
import { GoodreadsMapper } from '../../domain/services/goodreads-mapper';
import { GoodreadsBook, GoodreadsBookData, GoodreadsExclusiveShelf } from '../../domain/entities/goodreads-book';
import {
  validateCSVHeaders,
  validateDate,
  validateRating,
  validatePageCount,
  validateExclusiveShelf,
  validateTextLength,
  validateYear,
  isValidISBN,
  sanitizeCSVField,
  MAX_FIELD_LENGTHS,
  REQUIRED_GOODREADS_COLUMNS,
} from '../../domain/utils/goodreads-validation';

/**
 * Raw CSV row structure from Goodreads export.
 * Field names match Goodreads CSV column headers.
 */
interface GoodreadsCSVRow {
  'Book Id': string;
  'Title': string;
  'Author': string;
  'Author l-f': string;
  'Additional Authors': string;
  'ISBN': string;
  'ISBN13': string;
  'My Rating': string;
  'Average Rating': string;
  'Publisher': string;
  'Binding': string;
  'Number of Pages': string;
  'Year Published': string;
  'Original Publication Year': string;
  'Date Read': string;
  'Date Added': string;
  'Bookshelves': string;
  'Bookshelves with positions': string;
  'Exclusive Shelf': string;
  'My Review': string;
  'Spoiler': string;
  'Private Notes': string;
  'Read Count': string;
  'Recommended For': string;
  'Recommended By': string;
  'Owned Copies': string;
  'Original Purchase Date': string;
  'Original Purchase Location': string;
  'Condition': string;
  'Condition Description': string;
  'BCID': string;
}

/**
 * Implementation of GoodreadsImporter that handles CSV parsing and book import.
 * Implements the import logic defined in the design document sections 4.2 and 4.4.
 */
export class GoodreadsImporterImpl implements GoodreadsImporter {
  constructor(
    private readonly csvParser: CSVParser,
    private readonly bookRepository: IBookRepository,
    private readonly goodreadsMapper: GoodreadsMapper
  ) {}

  /**
   * Imports books from Goodreads CSV content for a specific user.
   * 
   * Process:
   * 1. Parse CSV using csvParser
   * 2. For each row:
   *    a. Transform to GoodreadsBook entity
   *    b. Check for duplicates (ISBN → title+author → Goodreads ID)
   *    c. If duplicate, skip
   *    d. If not duplicate, map to Book and save
   * 3. Handle errors per row (partial success strategy)
   * 
   * @param userId - The ID of the user to import books for
   * @param csvContent - The raw CSV file content as a string
   * @returns A promise resolving to the import result with counts and errors
   */
  async import(userId: string, csvContent: string): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Parse CSV content
      const rows = await this.csvParser.parse<GoodreadsCSVRow>(csvContent);

      // Validate CSV headers before processing any rows
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const headerValidation = validateCSVHeaders(headers);
        
        if (!headerValidation.isValid) {
          throw new Error(
            `Invalid Goodreads CSV format. Missing required columns: ${headerValidation.missingColumns.join(', ')}. ` +
            `Please ensure you're using a valid Goodreads library export CSV file.`
          );
        }
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 to account for 1-based indexing and header row

        try {
          // Transform CSV row to GoodreadsBook entity
          const goodreadsBook = this.transformRow(row);

          // Check for duplicates
          const isDuplicate = await this.checkDuplicate(userId, goodreadsBook);

          if (isDuplicate) {
            result.skipped++;
            continue;
          }

          // Map to Book entity and save
          const book = this.goodreadsMapper.mapToBook(goodreadsBook, userId);
          await this.bookRepository.create(book);
          result.imported++;
        } catch (error) {
          // Record error and continue processing (partial success strategy)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Enhance error message with row number context
          const contextualError = `Row ${rowNumber}: ${errorMessage}`;
          
          result.errors.push({
            row: rowNumber,
            book: this.extractPartialBookData(row),
            reason: contextualError,
          });
        }
      }
    } catch (error) {
      // CSV parsing error - rethrow as it's a fatal error
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Transforms a CSV row into a GoodreadsBook entity.
   * Handles ISBN extraction from Excel formula format.
   */
  private transformRow(row: GoodreadsCSVRow): GoodreadsBook {
    // Validate and sanitize text fields
    const titleValidation = validateTextLength(row['Title'], 'Title', MAX_FIELD_LENGTHS.TITLE);
    if (!titleValidation.isValid) {
      throw new Error(titleValidation.error!);
    }

    const authorValidation = validateTextLength(row['Author'], 'Author', MAX_FIELD_LENGTHS.AUTHOR);
    if (!authorValidation.isValid) {
      throw new Error(authorValidation.error!);
    }

    const reviewValidation = validateTextLength(row['My Review'], 'Review', MAX_FIELD_LENGTHS.REVIEW);
    if (!reviewValidation.isValid) {
      throw new Error(reviewValidation.error!);
    }

    const publisherValidation = validateTextLength(row['Publisher'], 'Publisher', MAX_FIELD_LENGTHS.PUBLISHER);
    if (!publisherValidation.isValid) {
      throw new Error(publisherValidation.error!);
    }

    // Extract and validate ISBNs
    const isbn = this.extractISBN(row['ISBN']);
    const isbn13 = this.extractISBN(row['ISBN13']);
    
    if (isbn && !isValidISBN(isbn)) {
      throw new Error(`Invalid ISBN format: "${isbn}". ISBN must be 10 or 13 digits.`);
    }
    
    if (isbn13 && !isValidISBN(isbn13)) {
      throw new Error(`Invalid ISBN13 format: "${isbn13}". ISBN must be 10 or 13 digits.`);
    }

    // Parse and validate dates
    const dateAdded = this.parseDate(row['Date Added']);
    const dateRead = this.parseDate(row['Date Read']);

    // Validate date added is required and valid
    if (!dateAdded) {
      throw new Error('Date Added is required but was not provided or is invalid');
    }

    // Parse numeric fields with validation
    const myRating = this.parseNumber(row['My Rating']);
    const averageRating = this.parseNumber(row['Average Rating']);
    const numberOfPages = this.parseInt(row['Number of Pages']);
    const yearPublished = this.parseInt(row['Year Published']);
    const originalPublicationYear = this.parseInt(row['Original Publication Year']);

    // Validate rating
    const ratingValidation = validateRating(myRating);
    if (!ratingValidation.isValid) {
      throw new Error(ratingValidation.error!);
    }

    // Validate page count
    const pageCountValidation = validatePageCount(numberOfPages);
    if (!pageCountValidation.isValid) {
      throw new Error(pageCountValidation.error!);
    }

    // Validate years
    const yearPublishedValidation = validateYear(yearPublished);
    if (!yearPublishedValidation.isValid) {
      throw new Error(`Year Published: ${yearPublishedValidation.error!}`);
    }

    const originalYearValidation = validateYear(originalPublicationYear);
    if (!originalYearValidation.isValid) {
      throw new Error(`Original Publication Year: ${originalYearValidation.error!}`);
    }

    // Parse bookshelves (comma-separated list) with length validation
    const bookshelves = row['Bookshelves']
      ? row['Bookshelves'].split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(shelf => {
            const validation = validateTextLength(shelf, 'Bookshelf name', MAX_FIELD_LENGTHS.BOOKSHELF_NAME);
            if (!validation.isValid) {
              throw new Error(validation.error!);
            }
            return shelf;
          })
      : [];

    // Validate and parse exclusive shelf
    const shelfValidation = validateExclusiveShelf(row['Exclusive Shelf']);
    if (!shelfValidation.isValid) {
      throw new Error(shelfValidation.error!);
    }
    const exclusiveShelf = this.parseExclusiveShelf(row['Exclusive Shelf']);

    const bookData: GoodreadsBookData = {
      bookId: sanitizeCSVField(row['Book Id']) || '',
      title: titleValidation.sanitized || row['Title'],
      author: authorValidation.sanitized || row['Author'],
      authorAdditional: sanitizeCSVField(row['Additional Authors']),
      isbn,
      isbn13,
      myRating,
      averageRating,
      publisher: publisherValidation.sanitized,
      binding: sanitizeCSVField(row['Binding']),
      yearPublished,
      originalPublicationYear,
      dateRead,
      dateAdded,
      bookshelves,
      exclusiveShelf,
      myReview: reviewValidation.sanitized,
      numberOfPages,
    };

    return new GoodreadsBook(bookData);
  }

  /**
   * Extracts ISBN from a field, handling Excel formula format.
   * Excel exports ISBNs as formulas like: =\"123456789\"
   */
  private extractISBN(value: string): string | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }

    // Handle Excel formula format: =\"123456789\"
    const formulaMatch = value.match(/^=\"(.+)"$/);
    if (formulaMatch) {
      return formulaMatch[1].trim();
    }

    return value.trim();
  }

  /**
   * Parses a date string in YYYY/MM/DD format.
   */
  private parseDate(value: string): Date | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }

    // Use the centralized validation
    const validation = validateDate(value);
    
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid date format');
    }

    return validation.date;
  }

  /**
   * Parses a string to a number (float).
   */
  private parseNumber(value: string): number | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }

    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parses a string to an integer.
   */
  private parseInt(value: string): number | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }

    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parses and validates the exclusive shelf value.
   */
  private parseExclusiveShelf(value: string): GoodreadsExclusiveShelf {
    const normalized = value?.toLowerCase().trim();
    
    if (normalized === 'to-read' || normalized === 'currently-reading' || normalized === 'read') {
      return normalized as GoodreadsExclusiveShelf;
    }

    // Enhanced error message with valid options
    throw new Error(
      `Invalid exclusive shelf value: "${value}". Must be one of: to-read, currently-reading, read`
    );
  }

  /**
   * Checks if a book is a duplicate by checking ISBN, title+author, and Goodreads ID.
   * Duplicate detection strategy from design doc section 4.2.
   */
  private async checkDuplicate(userId: string, goodreadsBook: GoodreadsBook): Promise<boolean> {
    // 1. Check by ISBN (ISBN-10 or ISBN-13)
    if (goodreadsBook.isbn) {
      const existingByISBN = await this.bookRepository.findByISBN(userId, goodreadsBook.isbn);
      if (existingByISBN) return true;
    }

    if (goodreadsBook.isbn13) {
      const existingByISBN13 = await this.bookRepository.findByISBN(userId, goodreadsBook.isbn13);
      if (existingByISBN13) return true;
    }

    // 2. Check by title and author
    const existingByTitleAuthor = await this.bookRepository.findByTitleAndAuthor(
      userId,
      goodreadsBook.title,
      goodreadsBook.author
    );
    if (existingByTitleAuthor) return true;

    // 3. Check by Goodreads ID
    const existingByGoodreadsId = await this.bookRepository.findByGoodreadsId(
      userId,
      goodreadsBook.bookId
    );
    if (existingByGoodreadsId) return true;

    return false;
  }

  /**
   * Extracts partial book data from a CSV row for error reporting.
   * Safely handles potentially undefined or malformed data.
   */
  private extractPartialBookData(row: GoodreadsCSVRow): Partial<GoodreadsBookData> {
    try {
      return {
        bookId: sanitizeCSVField(row['Book Id']) || 'Unknown',
        title: sanitizeCSVField(row['Title']) || 'Unknown',
        author: sanitizeCSVField(row['Author']) || 'Unknown',
      };
    } catch {
      // If sanitization fails, return minimal safe data
      return {
        bookId: 'Unknown',
        title: 'Unknown',
        author: 'Unknown',
      };
    }
  }
}