import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportGoodreadsUseCase } from '../import-goodreads';
import { GoodreadsImporter, ImportResult } from '../../../../domain/interfaces/goodreads-importer';
import { ValidationError, InfrastructureError } from '../../../../domain/errors/domain-errors';

describe('ImportGoodreadsUseCase', () => {
  let useCase: ImportGoodreadsUseCase;
  let mockImporter: GoodreadsImporter;
  const userId = 'user-123';

  beforeEach(() => {
    mockImporter = {
      import: vi.fn(),
    };

    useCase = new ImportGoodreadsUseCase(mockImporter);
  });

  describe('execute - successful scenarios', () => {
    it('should successfully import books', async () => {
      const importResult: ImportResult = {
        imported: 5,
        skipped: 2,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'Book Id,Title,Author\n1,Book1,Author1\n2,Book2,Author2',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(5);
      expect(result.skipped).toBe(2);
      expect(result.errors).toEqual([]);
      expect(result.message).toContain('Successfully imported 5 books');
      expect(result.message).toContain('Skipped 2 duplicates');
    });

    it('should handle import with no duplicates', async () => {
      const importResult: ImportResult = {
        imported: 3,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'Book Id,Title,Author\n1,Book1,Author1',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.message).toBe('Successfully imported 3 books.');
    });

    it('should handle import with some errors', async () => {
      const importResult: ImportResult = {
        imported: 2,
        skipped: 1,
        errors: [
          { row: 3, book: { title: 'Bad Book' }, reason: 'Invalid data' },
        ],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'Book Id,Title,Author\n1,Book1,Author1',
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.message).toContain('Successfully imported 2 books');
      expect(result.message).toContain('1 book failed to import');
    });
  });

  describe('execute - validation errors', () => {
    it('should throw ValidationError when userId is empty', async () => {
      await expect(
        useCase.execute({
          userId: '',
          csvContent: 'valid csv',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId: '',
          csvContent: 'valid csv',
        })
      ).rejects.toThrow('User ID is required');
    });

    it('should throw ValidationError when userId is whitespace', async () => {
      await expect(
        useCase.execute({
          userId: '   ',
          csvContent: 'valid csv',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when csvContent is empty', async () => {
      await expect(
        useCase.execute({
          userId,
          csvContent: '',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId,
          csvContent: '',
        })
      ).rejects.toThrow('CSV content is required');
    });

    it('should throw ValidationError when CSV has only headers', async () => {
      await expect(
        useCase.execute({
          userId,
          csvContent: 'Book Id,Title,Author',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId,
          csvContent: 'Book Id,Title,Author',
        })
      ).rejects.toThrow('contains only headers');
    });

    it('should throw ValidationError when CSV exceeds size limit', async () => {
      const largeCsv = 'Header\n' + 'x'.repeat(11 * 1024 * 1024); // 11MB

      await expect(
        useCase.execute({
          userId,
          csvContent: largeCsv,
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId,
          csvContent: largeCsv,
        })
      ).rejects.toThrow('exceeds the maximum limit');
    });

    it('should accept CSV at exactly 10MB limit', async () => {
      const importResult: ImportResult = {
        imported: 1,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      // Create CSV slightly under 10MB
      const header = 'Book Id,Title,Author\n';
      const row = '1,Book,Author\n';
      const targetSize = 10 * 1024 * 1024 - header.length - 100; // Slightly under
      const numRows = Math.floor(targetSize / row.length);
      const largeCsv = header + row.repeat(numRows);

      const result = await useCase.execute({
        userId,
        csvContent: largeCsv,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - infrastructure errors', () => {
    it('should wrap infrastructure errors in InfrastructureError', async () => {
      vi.mocked(mockImporter.import).mockRejectedValue(
        new Error('CSV parsing failed')
      );

      await expect(
        useCase.execute({
          userId,
          csvContent: 'Book Id,Title,Author\n1,Book1,Author1',
        })
      ).rejects.toThrow(InfrastructureError);
    });

    it('should provide user-friendly error message', async () => {
      vi.mocked(mockImporter.import).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        useCase.execute({
          userId,
          csvContent: 'Book Id,Title,Author\n1,Book1,Author1',
        })
      ).rejects.toThrow('Failed to import Goodreads data');
    });
  });

  describe('execute - message generation', () => {
    it('should generate message for all books imported', async () => {
      const importResult: ImportResult = {
        imported: 10,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.message).toBe('Successfully imported 10 books.');
    });

    it('should generate message for single book imported', async () => {
      const importResult: ImportResult = {
        imported: 1,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.message).toBe('Successfully imported 1 book.');
    });

    it('should generate message for all duplicates', async () => {
      const importResult: ImportResult = {
        imported: 0,
        skipped: 5,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'All books from the CSV were already in your library (duplicates).'
      );
    });

    it('should generate message for all errors', async () => {
      const importResult: ImportResult = {
        imported: 0,
        skipped: 0,
        errors: [
          { row: 2, book: {}, reason: 'Error 1' },
          { row: 3, book: {}, reason: 'Error 2' },
        ],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Import failed');
      expect(result.message).toContain('No books were imported');
    });

    it('should generate message for empty CSV result', async () => {
      const importResult: ImportResult = {
        imported: 0,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'Header\nData',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'No books found in the CSV file. Please ensure your Goodreads export contains book data.'
      );
    });

    it('should use plural forms correctly', async () => {
      const importResult: ImportResult = {
        imported: 2,
        skipped: 3,
        errors: [{ row: 1, book: {}, reason: 'Error' }],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.message).toContain('2 books');
      expect(result.message).toContain('3 duplicates');
      expect(result.message).toContain('1 book failed');
    });

    it('should handle singular book in error message', async () => {
      const importResult: ImportResult = {
        imported: 1,
        skipped: 1,
        errors: [{ row: 1, book: {}, reason: 'Error' }],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.message).toContain('1 book');
      expect(result.message).toContain('1 duplicate');
    });
  });

  describe('execute - success determination', () => {
    it('should mark as success when books are imported', async () => {
      const importResult: ImportResult = {
        imported: 1,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.success).toBe(true);
    });

    it('should mark as success when all are duplicates', async () => {
      const importResult: ImportResult = {
        imported: 0,
        skipped: 5,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.success).toBe(true);
    });

    it('should mark as failure when no books imported and errors exist', async () => {
      const importResult: ImportResult = {
        imported: 0,
        skipped: 0,
        errors: [{ row: 1, book: {}, reason: 'Error' }],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.success).toBe(false);
    });

    it('should mark as success even with some errors if books were imported', async () => {
      const importResult: ImportResult = {
        imported: 5,
        skipped: 2,
        errors: [{ row: 1, book: {}, reason: 'Error' }],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'valid csv\nwith data',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - edge cases', () => {
    it('should handle CSV with Windows line endings', async () => {
      const importResult: ImportResult = {
        imported: 1,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'Book Id,Title,Author\r\n1,Book1,Author1\r\n',
      });

      expect(result.success).toBe(true);
    });

    it('should handle CSV with Unicode content', async () => {
      const importResult: ImportResult = {
        imported: 1,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const result = await useCase.execute({
        userId,
        csvContent: 'Book Id,Title,Author\n1,Café,José García\n',
      });

      expect(result.success).toBe(true);
    });

    it('should call importer with correct parameters', async () => {
      const importResult: ImportResult = {
        imported: 1,
        skipped: 0,
        errors: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(importResult);

      const csvContent = 'Book Id,Title,Author\n1,Book1,Author1';
      await useCase.execute({
        userId,
        csvContent,
      });

      expect(mockImporter.import).toHaveBeenCalledWith(userId, csvContent);
      expect(mockImporter.import).toHaveBeenCalledOnce();
    });
  });
});