import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoodreadsImporterImpl } from '../goodreads-importer-impl';
import { CSVParser } from '../../../domain/interfaces/csv-parser';
import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { GoodreadsMapper } from '../../../domain/services/goodreads-mapper';
import { Book } from '../../../domain/entities/book';

describe('GoodreadsImporterImpl', () => {
  let importer: GoodreadsImporterImpl;
  let mockCSVParser: CSVParser;
  let mockBookRepository: IBookRepository;
  let mockMapper: GoodreadsMapper;
  const userId = 'user-123';

  beforeEach(() => {
    // Create mock CSV parser
    mockCSVParser = {
      parse: vi.fn(),
    };

    // Create mock book repository
    mockBookRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findByUserIdPaginated: vi.fn(),
      findByISBN: vi.fn(),
      findByTitleAndAuthor: vi.fn(),
      findByGoodreadsId: vi.fn(),
      findByStatus: vi.fn(),
      findByGenre: vi.fn(),
      getUniqueGenres: vi.fn(),
      countByUserId: vi.fn(),
      existsByGoogleBooksId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // Create mock mapper
    mockMapper = new GoodreadsMapper();

    importer = new GoodreadsImporterImpl(
      mockCSVParser,
      mockBookRepository,
      mockMapper
    );
  });

  describe('import - successful scenarios', () => {
    it('should import a single book successfully', async () => {
      const csvRows = [
        {
          'Book Id': '12345',
          'Title': 'Test Book',
          'Author': 'Test Author',
          'Additional Authors': '',
          'ISBN': '1234567890',
          'ISBN13': '9781234567890',
          'My Rating': '4',
          'Average Rating': '3.5',
          'Publisher': 'Test Publisher',
          'Binding': 'Hardcover',
          'Number of Pages': '300',
          'Year Published': '2020',
          'Original Publication Year': '2019',
          'Date Read': '2024/01/15',
          'Date Added': '2024/01/01',
          'Bookshelves': 'fiction, science-fiction',
          'Bookshelves with positions': '',
          'Exclusive Shelf': 'read',
          'My Review': 'Great book!',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '1',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '1',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByTitleAndAuthor).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByGoodreadsId).mockResolvedValue(null);
      vi.mocked(mockBookRepository.create).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockBookRepository.create).toHaveBeenCalledOnce();
    });

    it('should import multiple books', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': 'Book One',
          'Author': 'Author One',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
        {
          'Book Id': '2',
          'Title': 'Book Two',
          'Author': 'Author Two',
          'Date Added': '2024/01/02',
          'Exclusive Shelf': 'to-read',
          'Additional Authors': '',
          'ISBN': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByTitleAndAuthor).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByGoodreadsId).mockResolvedValue(null);
      vi.mocked(mockBookRepository.create).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockBookRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('import - duplicate detection', () => {
    it('should skip duplicate by ISBN', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': 'Test Book',
          'Author': 'Test Author',
          'ISBN': '1234567890',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockBookRepository.create).not.toHaveBeenCalled();
    });

    it('should skip duplicate by ISBN13', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': 'Test Book',
          'Author': 'Test Author',
          'ISBN': '',
          'ISBN13': '9781234567890',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValueOnce(null).mockResolvedValueOnce({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBookRepository.create).not.toHaveBeenCalled();
    });

    it('should skip duplicate by title and author', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': 'Test Book',
          'Author': 'Test Author',
          'ISBN': '',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByTitleAndAuthor).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBookRepository.create).not.toHaveBeenCalled();
    });

    it('should skip duplicate by Goodreads ID', async () => {
      const csvRows = [
        {
          'Book Id': '12345',
          'Title': 'Test Book',
          'Author': 'Test Author',
          'ISBN': '',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByTitleAndAuthor).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByGoodreadsId).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBookRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('import - partial success', () => {
    it('should continue importing after row error', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': '', // Invalid: empty title
          'Author': 'Author One',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
        {
          'Book Id': '2',
          'Title': 'Book Two',
          'Author': 'Author Two',
          'Date Added': '2024/01/02',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByTitleAndAuthor).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByGoodreadsId).mockResolvedValue(null);
      vi.mocked(mockBookRepository.create).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(2); // First data row after header
      expect(result.errors[0].reason).toContain('Row 2');
    });

    it('should collect multiple errors', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': '', // Invalid
          'Author': 'Author',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
        {
          'Book Id': '2',
          'Title': 'Book',
          'Author': '', // Invalid
          'Date Added': '2024/01/02',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'ISBN': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[1].row).toBe(3);
    });
  });

  describe('import - ISBN extraction', () => {
    it('should extract ISBN from Excel formula format', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': 'Test Book',
          'Author': 'Test Author',
          'ISBN': '="1234567890"',
          'ISBN13': '="9781234567890"',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'Additional Authors': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByTitleAndAuthor).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByGoodreadsId).mockResolvedValue(null);
      vi.mocked(mockBookRepository.create).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(1);
      expect(mockBookRepository.findByISBN).toHaveBeenCalledWith(userId, '1234567890');
    });
  });

  describe('import - validation errors', () => {
    it('should throw error for invalid CSV headers', async () => {
      const csvRows = [
        {
          'InvalidHeader': 'value',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);

      await expect(importer.import(userId, 'csv content')).rejects.toThrow(
        'Invalid Goodreads CSV format'
      );
    });

    it('should throw error for CSV parsing failure', async () => {
      vi.mocked(mockCSVParser.parse).mockRejectedValue(new Error('Parse error'));

      await expect(importer.import(userId, 'csv content')).rejects.toThrow(
        'Failed to parse CSV'
      );
    });
  });

  describe('import - edge cases', () => {
    it('should handle mixed success, skipped, and errors', async () => {
      const csvRows = [
        {
          'Book Id': '1',
          'Title': 'Success Book',
          'Author': 'Author',
          'Date Added': '2024/01/01',
          'Exclusive Shelf': 'read',
          'ISBN': '1111111111',
          'Additional Authors': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
        {
          'Book Id': '2',
          'Title': 'Duplicate Book',
          'Author': 'Author',
          'Date Added': '2024/01/02',
          'Exclusive Shelf': 'read',
          'ISBN': '2222222222',
          'Additional Authors': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
        {
          'Book Id': '3',
          'Title': '', // Error
          'Author': 'Author',
          'Date Added': '2024/01/03',
          'Exclusive Shelf': 'read',
          'ISBN': '',
          'Additional Authors': '',
          'ISBN13': '',
          'My Rating': '',
          'Average Rating': '',
          'Publisher': '',
          'Binding': '',
          'Number of Pages': '',
          'Year Published': '',
          'Original Publication Year': '',
          'Date Read': '',
          'Bookshelves': '',
          'Bookshelves with positions': '',
          'My Review': '',
          'Spoiler': '',
          'Private Notes': '',
          'Read Count': '',
          'Recommended For': '',
          'Recommended By': '',
          'Owned Copies': '',
          'Original Purchase Date': '',
          'Original Purchase Location': '',
          'Condition': '',
          'Condition Description': '',
          'BCID': '',
          'Author l-f': '',
        },
      ];

      vi.mocked(mockCSVParser.parse).mockResolvedValue(csvRows);
      vi.mocked(mockBookRepository.findByISBN)
        .mockResolvedValueOnce(null) // First book: no duplicate
        .mockResolvedValueOnce({} as Book); // Second book: duplicate
      vi.mocked(mockBookRepository.findByTitleAndAuthor).mockResolvedValue(null);
      vi.mocked(mockBookRepository.findByGoodreadsId).mockResolvedValue(null);
      vi.mocked(mockBookRepository.create).mockResolvedValue({} as Book);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty CSV (no data rows)', async () => {
      vi.mocked(mockCSVParser.parse).mockResolvedValue([]);

      const result = await importer.import(userId, 'csv content');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});