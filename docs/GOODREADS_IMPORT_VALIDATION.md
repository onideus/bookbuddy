# Goodreads Import Validation Documentation

This document describes the validation rules and error handling implemented for the Goodreads import feature.

## Overview

The Goodreads import feature implements comprehensive validation at multiple layers to ensure data integrity and provide clear, actionable error messages to users. Validation occurs at:

1. **API Layer** - Initial request validation
2. **Application Layer** - Business logic validation
3. **Infrastructure Layer** - CSV parsing and data transformation
4. **Domain Layer** - Entity validation

## Validation Utilities

### Location
`domain/utils/goodreads-validation.ts`

### Available Validators

#### `validateCSVHeaders(headers: string[])`
Validates that all required Goodreads CSV columns are present.

**Required columns:**
- Book Id
- Title
- Author
- Exclusive Shelf
- Date Added

**Returns:** `{ isValid: boolean, missingColumns: string[] }`

#### `isValidISBN(isbn: string)`
Validates ISBN format (10 or 13 digits, with optional hyphens).

**Accepts:**
- ISBN-10: 10 digits
- ISBN-13: 13 digits
- Hyphens and spaces are ignored

**Returns:** `boolean`

#### `validateDate(dateStr: string)`
Validates date format and reasonableness.

**Rules:**
- Accepts YYYY/MM/DD format or ISO format
- Date cannot be in the future
- Date cannot be before 1900

**Returns:** `{ isValid: boolean, date?: Date, error?: string }`

#### `validateRating(rating: number | undefined)`
Validates rating value.

**Rules:**
- Must be between 0 and 5
- undefined/null is acceptable (optional field)

**Returns:** `{ isValid: boolean, error?: string }`

#### `validatePageCount(pageCount: number | undefined)`
Validates page count value.

**Rules:**
- Cannot be negative
- Maximum 50,000 pages
- undefined/null is acceptable (optional field)

**Returns:** `{ isValid: boolean, error?: string }`

#### `validateExclusiveShelf(shelf: string)`
Validates exclusive shelf value.

**Accepted values:**
- to-read
- currently-reading
- read

**Returns:** `{ isValid: boolean, error?: string }`

#### `validateYear(year: number | undefined)`
Validates publication year.

**Rules:**
- Minimum year: 1000
- Maximum year: current year + 5
- undefined/null is acceptable (optional field)

**Returns:** `{ isValid: boolean, error?: string }`

#### `validateTextLength(text: string, fieldName: string, maxLength: number)`
Validates and sanitizes text field length.

**Returns:** `{ isValid: boolean, sanitized?: string, error?: string }`

#### `sanitizeCSVField(value: string | undefined)`
Sanitizes CSV field by handling special characters.

**Operations:**
- Trims whitespace
- Removes null bytes
- Normalizes line endings

**Returns:** `string | undefined`

## Maximum Field Lengths

```typescript
MAX_FIELD_LENGTHS = {
  TITLE: 500,
  AUTHOR: 200,
  REVIEW: 10000,
  PUBLISHER: 200,
  BOOKSHELF_NAME: 100,
}
```

## Layer-by-Layer Validation

### API Layer (`api/[...path].ts`)

**Validates:**
- Request format (must include `csvContent` field)
- CSV content type (must be string)
- File not empty
- File size ≤ 10MB
- CSV has at least 2 lines (header + data)

**Error format:**
```json
{
  "error": "ValidationError",
  "message": "Descriptive error message with guidance",
  "statusCode": 400
}
```

### Application Layer (`application/use-cases/books/import-goodreads.ts`)

**Validates:**
- User ID is present and not empty
- CSV content is present and not empty
- CSV has at least 2 lines (header + data rows)
- File size ≤ 10MB

**Enhanced error messages:**
Messages include specific guidance on how to fix the issue, such as:
- "Please ensure your Goodreads export contains book data"
- "Please try exporting a smaller date range or splitting your library into multiple imports"

### Infrastructure Layer (`infrastructure/external/`)

#### CSV Parser (`csv-parser-impl.ts`)

**Validates:**
- CSV is not empty
- CSV has valid headers
- CSV has data rows (not just headers)
- CSV parsing succeeds without errors

**Error messages include:**
- Row numbers for parsing errors
- Specific parser error details

#### Goodreads Importer (`goodreads-importer-impl.ts`)

**Validates:**
- All required CSV headers are present
- Each field meets validation rules:
  - Title length ≤ 500 characters
  - Author length ≤ 200 characters
  - Review length ≤ 10,000 characters
  - Publisher length ≤ 200 characters
  - Bookshelf names ≤ 100 characters
  - ISBN format (10 or 13 digits)
  - Date formats (YYYY/MM/DD)
  - Rating (0-5)
  - Page count (non-negative, ≤ 50,000)
  - Years (1000 to current+5)
  - Exclusive shelf (valid value)

**Error handling:**
- Row numbers included in all error messages (e.g., "Row 15: Invalid ISBN format")
- Partial success strategy: continues processing after individual row errors
- Detailed error context with book title/author for failed rows

### Domain Layer (`domain/entities/goodreads-book.ts`)

**Validates:**
- All required fields are present and non-empty:
  - Title
  - Author
  - Book ID
  - Exclusive Shelf
  - Date Added
- Rating between 0-5
- Page count non-negative
- Average rating between 0-5

**Error messages:**
Clear, actionable messages that guide users to fix their CSV, e.g.:
- "Title is required and cannot be empty. Please ensure the CSV contains a valid title."
- "Exclusive shelf is required. Valid values are: to-read, currently-reading, read."

## Error Message Guidelines

All error messages follow these principles:

1. **Specific**: Clearly state what went wrong
2. **Actionable**: Tell the user how to fix it
3. **Contextual**: Include row numbers and field names where applicable
4. **Helpful**: Suggest valid values or formats

### Examples

**Good error messages:**
- ✅ "Row 15: Invalid ISBN format: \"abc123\". ISBN must be 10 or 13 digits."
- ✅ "Rating must be between 0 and 5. Received: 7"
- ✅ "CSV file appears to be empty or contains only headers. Please ensure your Goodreads export contains book data."

**Bad error messages:**
- ❌ "Invalid data"
- ❌ "Error at row 15"
- ❌ "Bad ISBN"

## Edge Cases Handled

1. **Empty CSV file** - Detected at API and CSV parser layers
2. **CSV with only headers** - Validated before processing
3. **Missing required columns** - Validated at infrastructure layer
4. **Very long text fields** - Length limits enforced
5. **Special characters in CSV** - Sanitized during parsing
6. **Excel formula format ISBNs** - Extracted correctly (e.g., `="123456789"`)
7. **Missing optional fields** - Handled gracefully with undefined
8. **Malformed dates** - Validated with specific error messages
9. **Books without ISBN** - Allowed (ISBN is optional)
10. **Books with missing authors** - Rejected with clear error
11. **Invalid shelf values** - Clear error with valid options listed
12. **Duplicate books** - Skipped with counter in result
13. **Partial import failures** - Individual row errors don't stop the entire import

## Import Result Structure

```typescript
{
  success: boolean,
  imported: number,
  skipped: number,
  errors: Array<{
    row: number,
    book: { bookId: string, title: string, author: string },
    reason: string
  }>,
  message: string
}
```

## User-Facing Messages

The `generateMessage()` function creates contextual success messages:

- **Full success**: "Successfully imported 50 books."
- **With duplicates**: "Successfully imported 45 books. Skipped 5 duplicates."
- **With errors**: "Successfully imported 40 books. 10 books failed to import (see error details)."
- **All duplicates**: "All books from the CSV were already in your library (duplicates)."
- **All failed**: "Import failed. No books were imported due to validation errors. Please review the error details and fix your CSV file."

## Testing Recommendations

When testing import validation, verify:

1. **Happy path**: Valid CSV imports successfully
2. **Empty file**: Clear error message
3. **Missing headers**: Specific columns listed in error
4. **Invalid ISBN**: Row number and format guidance in error
5. **Invalid dates**: Format guidance in error
6. **Invalid ratings**: Range specified in error
7. **Invalid shelf values**: Valid options listed in error
8. **Text too long**: Field name and max length in error
9. **File too large**: Current size and limit in error
10. **Partial success**: Some books import, some fail with details

## Future Enhancements

Potential improvements to validation:

1. **ISBN checksum validation**: Validate ISBN check digit
2. **Batch validation**: Validate entire CSV before processing
3. **Preview mode**: Show validation errors without importing
4. **Custom field mappings**: Allow users to map non-standard columns
5. **Duplicate handling options**: Let users choose to update or skip duplicates
6. **Data transformation**: Automatically fix common issues (e.g., normalize dates)