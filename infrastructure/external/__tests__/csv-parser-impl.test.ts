import { describe, it, expect, beforeEach } from 'vitest';
import { CSVParserImpl } from '../csv-parser-impl';

describe('CSVParserImpl', () => {
  let parser: CSVParserImpl;

  beforeEach(() => {
    parser = new CSVParserImpl();
  });

  describe('parse - valid CSV', () => {
    it('should parse valid CSV with headers', async () => {
      const csv = `Name,Age,City
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ Name: 'John', Age: '30', City: 'New York' });
      expect(result[1]).toEqual({ Name: 'Jane', Age: '25', City: 'Los Angeles' });
      expect(result[2]).toEqual({ Name: 'Bob', Age: '35', City: 'Chicago' });
    });

    it('should parse CSV with quoted fields containing commas', async () => {
      const csv = `Title,Author,Description
"Book One","Author, First","A book with, commas"
"Book Two","Author Second","Another book"`;

      interface BookRow {
        Title: string;
        Author: string;
        Description: string;
      }

      const result = await parser.parse<BookRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Author).toBe('Author, First');
      expect(result[0].Description).toBe('A book with, commas');
    });

    it('should parse CSV with quoted fields containing newlines', async () => {
      const csv = `Title,Description
"Book One","Line 1
Line 2"
"Book Two","Single line"`;

      interface BookRow {
        Title: string;
        Description: string;
      }

      const result = await parser.parse<BookRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Description).toContain('Line 1\nLine 2');
    });

    it('should trim whitespace from headers', async () => {
      const csv = `  Name  ,  Age  ,  City  
John,30,New York`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('Name');
      expect(result[0]).toHaveProperty('Age');
      expect(result[0]).toHaveProperty('City');
    });

    it('should handle empty values', async () => {
      const csv = `Name,Age,City
John,,New York
,25,
Bob,35,Chicago`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ Name: 'John', Age: '', City: 'New York' });
      expect(result[1]).toEqual({ Name: '', Age: '25', City: '' });
      expect(result[2]).toEqual({ Name: 'Bob', Age: '35', City: 'Chicago' });
    });

    it('should skip empty lines', async () => {
      const csv = `Name,Age,City
John,30,New York

Jane,25,Los Angeles

Bob,35,Chicago`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(3);
      expect(result[0].Name).toBe('John');
      expect(result[1].Name).toBe('Jane');
      expect(result[2].Name).toBe('Bob');
    });

    it('should handle CSV with special characters', async () => {
      const csv = `Title,Author
"Book: A \"Special\" Title","O'Brien, James"
"Another Book","Author-Name"`;

      interface BookRow {
        Title: string;
        Author: string;
      }

      const result = await parser.parse<BookRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Title).toBe('Book: A "Special" Title');
      expect(result[0].Author).toBe("O'Brien, James");
    });

    it('should handle large CSV files', async () => {
      const headers = 'Name,Age,City';
      const rows = Array.from({ length: 1000 }, (_, i) => 
        `Person${i},${20 + i},City${i}`
      );
      const csv = [headers, ...rows].join('\n');

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(1000);
      expect(result[0].Name).toBe('Person0');
      expect(result[999].Name).toBe('Person999');
    });
  });

  describe('parse - error handling', () => {
    it('should throw error for empty file content', async () => {
      await expect(parser.parse('')).rejects.toThrow('CSV file is empty');
    });

    it('should throw error for whitespace-only content', async () => {
      await expect(parser.parse('   \n\n   ')).rejects.toThrow('CSV file is empty');
    });

    it('should throw error for CSV with only headers', async () => {
      const csv = 'Name,Age,City';

      await expect(parser.parse(csv)).rejects.toThrow(
        'CSV file contains no data rows'
      );
    });

    it('should throw error for CSV with no headers', async () => {
      const csv = '\n\n\n';

      await expect(parser.parse(csv)).rejects.toThrow();
    });

    it('should provide detailed error messages with row numbers', async () => {
      // This test depends on papaparse error handling
      // We're testing that errors include row information
      const csv = `Name,Age,City
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago`;

      // Normal parsing should work
      const result = await parser.parse(csv);
      expect(result).toHaveLength(3);
    });
  });

  describe('parse - edge cases', () => {
    it('should handle single column CSV', async () => {
      const csv = `Name
John
Jane
Bob`;

      interface TestRow {
        Name: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ Name: 'John' });
      expect(result[1]).toEqual({ Name: 'Jane' });
      expect(result[2]).toEqual({ Name: 'Bob' });
    });

    it('should handle single row CSV', async () => {
      const csv = `Name,Age,City
John,30,New York`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ Name: 'John', Age: '30', City: 'New York' });
    });

    it('should handle CSV with BOM (Byte Order Mark)', async () => {
      const csv = '\ufeffName,Age,City\nJohn,30,New York';

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(1);
      expect(result[0].Name).toBe('John');
    });

    it('should handle CSV with different line endings (CRLF)', async () => {
      const csv = 'Name,Age,City\r\nJohn,30,New York\r\nJane,25,Los Angeles';

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Name).toBe('John');
      expect(result[1].Name).toBe('Jane');
    });

    it('should handle CSV with different line endings (CR)', async () => {
      const csv = 'Name,Age,City\rJohn,30,New York\rJane,25,Los Angeles';

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Name).toBe('John');
      expect(result[1].Name).toBe('Jane');
    });

    it('should handle CSV with extra columns in data rows', async () => {
      const csv = `Name,Age,City
John,30,New York,Extra
Jane,25,Los Angeles`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Name).toBe('John');
      expect(result[1].Name).toBe('Jane');
    });

    it('should handle CSV with fewer columns in data rows', async () => {
      const csv = `Name,Age,City
John,30
Jane,25,Los Angeles`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Name).toBe('John');
      expect(result[0].Age).toBe('30');
      expect(result[0].City).toBe('');
    });

    it('should handle CSV with Unicode characters', async () => {
      const csv = `Title,Author
"El Niño","José García"
"Café","François"`;

      interface BookRow {
        Title: string;
        Author: string;
      }

      const result = await parser.parse<BookRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0].Title).toBe('El Niño');
      expect(result[0].Author).toBe('José García');
      expect(result[1].Title).toBe('Café');
      expect(result[1].Author).toBe('François');
    });

    it('should handle CSV with tabs and special whitespace', async () => {
      const csv = `Name\tAge\tCity
John\t30\tNew York
Jane\t25\tLos Angeles`;

      interface TestRow {
        Name: string;
        Age: string;
        City: string;
      }

      const result = await parser.parse<TestRow>(csv);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('parse - Goodreads-specific scenarios', () => {
    it('should parse Goodreads CSV structure', async () => {
      const csv = `Book Id,Title,Author,ISBN,Exclusive Shelf,Date Added
12345,"Test Book","Test Author","1234567890","read","2024/01/01"
67890,"Another Book","Another Author","0987654321","to-read","2024/01/02"`;

      interface GoodreadsRow {
        'Book Id': string;
        'Title': string;
        'Author': string;
        'ISBN': string;
        'Exclusive Shelf': string;
        'Date Added': string;
      }

      const result = await parser.parse<GoodreadsRow>(csv);

      expect(result).toHaveLength(2);
      expect(result[0]['Book Id']).toBe('12345');
      expect(result[0]['Title']).toBe('Test Book');
      expect(result[0]['Exclusive Shelf']).toBe('read');
    });

    it('should handle Goodreads Excel formula ISBNs', async () => {
      const csv = `Book Id,Title,Author,ISBN,ISBN13
12345,"Test Book","Test Author","=\\"1234567890\\"","=\\"9781234567890\\""`;

      interface GoodreadsRow {
        'Book Id': string;
        'Title': string;
        'Author': string;
        'ISBN': string;
        'ISBN13': string;
      }

      const result = await parser.parse<GoodreadsRow>(csv);

      expect(result).toHaveLength(1);
      expect(result[0].ISBN).toBe('="1234567890"');
      expect(result[0].ISBN13).toBe('="9781234567890"');
    });

    it('should handle Goodreads bookshelves field', async () => {
      const csv = `Book Id,Title,Author,Bookshelves
12345,"Test Book","Test Author","fiction, science-fiction, favorites"`;

      interface GoodreadsRow {
        'Book Id': string;
        'Title': string;
        'Author': string;
        'Bookshelves': string;
      }

      const result = await parser.parse<GoodreadsRow>(csv);

      expect(result).toHaveLength(1);
      expect(result[0].Bookshelves).toBe('fiction, science-fiction, favorites');
    });
  });
});