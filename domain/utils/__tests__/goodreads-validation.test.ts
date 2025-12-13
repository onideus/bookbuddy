import { describe, it, expect } from 'vitest';
import {
  validateCSVHeaders,
  isValidISBN,
  validateDate,
  validateRating,
  validatePageCount,
  validateExclusiveShelf,
  validateTextLength,
  sanitizeCSVField,
  validateYear,
  REQUIRED_GOODREADS_COLUMNS,
  MAX_FIELD_LENGTHS,
} from '../goodreads-validation';

describe('Goodreads Validation Utilities', () => {
  describe('validateCSVHeaders', () => {
    it('should validate when all required headers are present', () => {
      const headers = [
        'Book Id',
        'Title',
        'Author',
        'Exclusive Shelf',
        'Date Added',
        'ISBN',
        'My Rating',
      ];

      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toEqual([]);
    });

    it('should detect missing required headers', () => {
      const headers = ['Book Id', 'Title', 'Author'];

      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns).toContain('Exclusive Shelf');
      expect(result.missingColumns).toContain('Date Added');
    });

    it('should handle empty header array', () => {
      const headers: string[] = [];

      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns).toEqual([...REQUIRED_GOODREADS_COLUMNS]);
    });

    it('should trim whitespace from headers', () => {
      const headers = [
        '  Book Id  ',
        '  Title  ',
        '  Author  ',
        '  Exclusive Shelf  ',
        '  Date Added  ',
      ];

      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toEqual([]);
    });

    it('should be case-sensitive', () => {
      const headers = [
        'book id',
        'title',
        'author',
        'exclusive shelf',
        'date added',
      ];

      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns.length).toBeGreaterThan(0);
    });
  });

  describe('isValidISBN', () => {
    it('should accept valid ISBN-10', () => {
      expect(isValidISBN('1234567890')).toBe(true);
      expect(isValidISBN('0-123-45678-9')).toBe(true);
      expect(isValidISBN('0 123 45678 9')).toBe(true);
    });

    it('should accept valid ISBN-13', () => {
      expect(isValidISBN('1234567890123')).toBe(true);
      expect(isValidISBN('978-1-234-56789-0')).toBe(true);
      expect(isValidISBN('978 1 234 56789 0')).toBe(true);
    });

    it('should accept empty ISBN (optional field)', () => {
      expect(isValidISBN('')).toBe(true);
      expect(isValidISBN('   ')).toBe(true);
    });

    it('should reject invalid ISBN lengths', () => {
      expect(isValidISBN('123')).toBe(false);
      expect(isValidISBN('12345678901234')).toBe(false);
    });

    it('should reject ISBNs with non-numeric characters', () => {
      expect(isValidISBN('123456789X')).toBe(false);
      expect(isValidISBN('abcd567890')).toBe(false);
    });

    it('should handle ISBNs with mixed separators', () => {
      expect(isValidISBN('0-123 45678-9')).toBe(true);
    });
  });

  describe('validateDate', () => {
    it('should validate correct date formats', () => {
      const result1 = validateDate('2024/01/15');
      expect(result1.isValid).toBe(true);
      expect(result1.date).toBeInstanceOf(Date);

      const result2 = validateDate('2024-01-15');
      expect(result2.isValid).toBe(true);
      expect(result2.date).toBeInstanceOf(Date);
    });

    it('should accept empty dates (optional field)', () => {
      const result = validateDate('');
      expect(result.isValid).toBe(true);
      expect(result.date).toBeUndefined();
    });

    it('should reject invalid date formats', () => {
      const result = validateDate('not a date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format. Expected format: YYYY/MM/DD');
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const result = validateDate(futureDateStr);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date cannot be in the future');
    });

    it('should reject dates before 1900', () => {
      const result = validateDate('1899-12-31');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date is too far in the past (before 1900)');
    });

    it('should accept dates at boundary (1900-01-01)', () => {
      const result = validateDate('1900-01-01');
      expect(result.isValid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should accept today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = validateDate(today);
      expect(result.isValid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });
  });

  describe('validateRating', () => {
    it('should accept valid ratings (0-5)', () => {
      expect(validateRating(0).isValid).toBe(true);
      expect(validateRating(1).isValid).toBe(true);
      expect(validateRating(3).isValid).toBe(true);
      expect(validateRating(5).isValid).toBe(true);
    });

    it('should accept undefined rating (optional field)', () => {
      expect(validateRating(undefined).isValid).toBe(true);
      expect(validateRating(null as any).isValid).toBe(true);
    });

    it('should reject negative ratings', () => {
      const result = validateRating(-1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rating must be between 0 and 5');
    });

    it('should reject ratings above 5', () => {
      const result = validateRating(6);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rating must be between 0 and 5');
    });

    it('should reject non-numeric ratings', () => {
      const result = validateRating('five' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rating must be a number');
    });

    it('should reject NaN', () => {
      const result = validateRating(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rating must be a number');
    });

    it('should accept decimal ratings within range', () => {
      expect(validateRating(3.5).isValid).toBe(true);
      expect(validateRating(4.2).isValid).toBe(true);
    });
  });

  describe('validatePageCount', () => {
    it('should accept valid page counts', () => {
      expect(validatePageCount(0).isValid).toBe(true);
      expect(validatePageCount(100).isValid).toBe(true);
      expect(validatePageCount(1000).isValid).toBe(true);
    });

    it('should accept undefined page count (optional field)', () => {
      expect(validatePageCount(undefined).isValid).toBe(true);
      expect(validatePageCount(null as any).isValid).toBe(true);
    });

    it('should reject negative page counts', () => {
      const result = validatePageCount(-10);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Page count cannot be negative');
    });

    it('should reject unreasonably high page counts', () => {
      const result = validatePageCount(100000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Page count seems unreasonably high (max 50,000 pages)');
    });

    it('should accept page count at maximum boundary', () => {
      expect(validatePageCount(50000).isValid).toBe(true);
    });

    it('should reject non-numeric page counts', () => {
      const result = validatePageCount('hundred' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Page count must be a number');
    });

    it('should reject NaN', () => {
      const result = validatePageCount(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Page count must be a number');
    });
  });

  describe('validateExclusiveShelf', () => {
    it('should accept valid shelf values', () => {
      expect(validateExclusiveShelf('to-read').isValid).toBe(true);
      expect(validateExclusiveShelf('currently-reading').isValid).toBe(true);
      expect(validateExclusiveShelf('read').isValid).toBe(true);
    });

    it('should accept valid shelf values with different case', () => {
      expect(validateExclusiveShelf('TO-READ').isValid).toBe(true);
      expect(validateExclusiveShelf('Currently-Reading').isValid).toBe(true);
      expect(validateExclusiveShelf('READ').isValid).toBe(true);
    });

    it('should trim whitespace from shelf values', () => {
      expect(validateExclusiveShelf('  to-read  ').isValid).toBe(true);
      expect(validateExclusiveShelf('  read  ').isValid).toBe(true);
    });

    it('should reject empty shelf', () => {
      const result = validateExclusiveShelf('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Exclusive shelf is required');
    });

    it('should reject invalid shelf values', () => {
      const result = validateExclusiveShelf('favorites');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid shelf value');
    });

    it('should provide helpful error message', () => {
      const result = validateExclusiveShelf('invalid-shelf');
      expect(result.error).toContain('to-read, currently-reading, read');
    });
  });

  describe('validateTextLength', () => {
    it('should accept text within length limit', () => {
      const result = validateTextLength('Short text', 'Title', 100);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Short text');
    });

    it('should accept empty text (optional field)', () => {
      const result = validateTextLength('', 'Title', 100);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    it('should accept undefined text', () => {
      const result = validateTextLength(undefined, 'Title', 100);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    it('should trim whitespace', () => {
      const result = validateTextLength('  Text  ', 'Title', 100);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Text');
    });

    it('should reject text exceeding length limit', () => {
      const longText = 'A'.repeat(101);
      const result = validateTextLength(longText, 'Title', 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
      expect(result.error).toContain('100 characters');
    });

    it('should accept text at exact length limit', () => {
      const text = 'A'.repeat(100);
      const result = validateTextLength(text, 'Title', 100);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(text);
    });

    it('should handle whitespace-only text as empty', () => {
      const result = validateTextLength('     ', 'Title', 100);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeUndefined();
    });

    it('should use field name in error message', () => {
      const longText = 'A'.repeat(501);
      const result = validateTextLength(longText, 'Book Title', 500);
      expect(result.error).toContain('Book Title');
    });
  });

  describe('sanitizeCSVField', () => {
    it('should trim whitespace', () => {
      expect(sanitizeCSVField('  Text  ')).toBe('Text');
    });

    it('should return undefined for empty strings', () => {
      expect(sanitizeCSVField('')).toBeUndefined();
      expect(sanitizeCSVField('   ')).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(sanitizeCSVField(undefined)).toBeUndefined();
    });

    it('should remove null bytes', () => {
      expect(sanitizeCSVField('Text\0WithNull')).toBe('TextWithNull');
    });

    it('should normalize line endings (CRLF to LF)', () => {
      expect(sanitizeCSVField('Line1\r\nLine2')).toBe('Line1\nLine2');
    });

    it('should normalize line endings (CR to LF)', () => {
      expect(sanitizeCSVField('Line1\rLine2')).toBe('Line1\nLine2');
    });

    it('should handle multiple sanitization operations', () => {
      expect(sanitizeCSVField('  Text\0With\r\nIssues  ')).toBe('TextWith\nIssues');
    });

    it('should preserve intentional newlines', () => {
      expect(sanitizeCSVField('Line1\nLine2\nLine3')).toBe('Line1\nLine2\nLine3');
    });
  });

  describe('validateYear', () => {
    it('should accept valid years', () => {
      const currentYear = new Date().getFullYear();
      expect(validateYear(2000).isValid).toBe(true);
      expect(validateYear(currentYear).isValid).toBe(true);
      expect(validateYear(1500).isValid).toBe(true);
    });

    it('should accept undefined year (optional field)', () => {
      expect(validateYear(undefined).isValid).toBe(true);
      expect(validateYear(null as any).isValid).toBe(true);
    });

    it('should accept years up to 5 years in the future', () => {
      const currentYear = new Date().getFullYear();
      expect(validateYear(currentYear + 1).isValid).toBe(true);
      expect(validateYear(currentYear + 5).isValid).toBe(true);
    });

    it('should reject years before 1000', () => {
      const result = validateYear(999);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too far in the past');
    });

    it('should accept year at minimum boundary (1000)', () => {
      expect(validateYear(1000).isValid).toBe(true);
    });

    it('should reject years too far in future', () => {
      const currentYear = new Date().getFullYear();
      const result = validateYear(currentYear + 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too far in the future');
    });

    it('should reject non-numeric years', () => {
      const result = validateYear('two thousand' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Year must be a number');
    });

    it('should reject NaN', () => {
      const result = validateYear(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Year must be a number');
    });
  });

  describe('MAX_FIELD_LENGTHS constants', () => {
    it('should define maximum field lengths', () => {
      expect(MAX_FIELD_LENGTHS.TITLE).toBe(500);
      expect(MAX_FIELD_LENGTHS.AUTHOR).toBe(200);
      expect(MAX_FIELD_LENGTHS.REVIEW).toBe(10000);
      expect(MAX_FIELD_LENGTHS.PUBLISHER).toBe(200);
      expect(MAX_FIELD_LENGTHS.BOOKSHELF_NAME).toBe(100);
    });

    it('should use correct types for all limits', () => {
      expect(typeof MAX_FIELD_LENGTHS.TITLE).toBe('number');
      expect(typeof MAX_FIELD_LENGTHS.AUTHOR).toBe('number');
      expect(typeof MAX_FIELD_LENGTHS.REVIEW).toBe('number');
      expect(typeof MAX_FIELD_LENGTHS.PUBLISHER).toBe('number');
      expect(typeof MAX_FIELD_LENGTHS.BOOKSHELF_NAME).toBe('number');
    });
  });

  describe('integration scenarios', () => {
    it('should validate complete book data', () => {
      const isbn = '978-1-234-56789-0';
      const date = '2024-01-15';
      const rating = 4;
      const pageCount = 350;
      const shelf = 'read';
      const year = 2020;

      expect(isValidISBN(isbn)).toBe(true);
      expect(validateDate(date).isValid).toBe(true);
      expect(validateRating(rating).isValid).toBe(true);
      expect(validatePageCount(pageCount).isValid).toBe(true);
      expect(validateExclusiveShelf(shelf).isValid).toBe(true);
      expect(validateYear(year).isValid).toBe(true);
    });

    it('should handle minimal book data (all optional fields)', () => {
      expect(isValidISBN('')).toBe(true);
      expect(validateDate('').isValid).toBe(true);
      expect(validateRating(undefined).isValid).toBe(true);
      expect(validatePageCount(undefined).isValid).toBe(true);
      expect(validateYear(undefined).isValid).toBe(true);
    });

    it('should validate and sanitize text fields together', () => {
      const title = '  Test Book  ';
      const author = '  Test Author  ';
      const review = '  Great book!\r\nLoved it!  ';

      const titleResult = validateTextLength(title, 'Title', MAX_FIELD_LENGTHS.TITLE);
      const authorResult = validateTextLength(author, 'Author', MAX_FIELD_LENGTHS.AUTHOR);
      const reviewResult = validateTextLength(review, 'Review', MAX_FIELD_LENGTHS.REVIEW);

      expect(titleResult.isValid).toBe(true);
      expect(titleResult.sanitized).toBe('Test Book');
      expect(authorResult.isValid).toBe(true);
      expect(authorResult.sanitized).toBe('Test Author');
      expect(reviewResult.isValid).toBe(true);
      expect(reviewResult.sanitized).toBe('Great book!\r\nLoved it!');

      const sanitizedReview = sanitizeCSVField(reviewResult.sanitized);
      expect(sanitizedReview).toBe('Great book!\nLoved it!');
    });
  });
});