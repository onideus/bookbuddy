/**
 * Unit tests for Book model (T034)
 * Target: ≥90% code coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Book } from '../../../src/models/book.js';
import { cleanupTestData } from '../../helpers/test-data.js';

describe('Book Model', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('create', () => {
    it('should create a book with required fields', async () => {
      const bookData = {
        title: 'The Invisible Library',
        author: 'Genevieve Cogman',
      };

      const book = await Book.create(bookData);

      expect(book).toMatchObject({
        id: expect.any(String),
        title: 'The Invisible Library',
        author: 'Genevieve Cogman',
        edition: null,
        isbn: null,
        coverImageUrl: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should create a book with all fields', async () => {
      const bookData = {
        title: 'The Invisible Library',
        author: 'Genevieve Cogman',
        edition: '1st Edition',
        isbn: '978-0-123456-78-9',
        coverImageUrl: 'https://example.com/cover.jpg',
      };

      const book = await Book.create(bookData);

      expect(book).toMatchObject({
        title: 'The Invisible Library',
        author: 'Genevieve Cogman',
        edition: '1st Edition',
        isbn: '978-0-123456-78-9',
        coverImageUrl: 'https://example.com/cover.jpg',
      });
    });

    it('should reject title exceeding 500 characters', async () => {
      const bookData = {
        title: 'a'.repeat(501),
        author: 'Test Author',
      };

      await expect(Book.create(bookData)).rejects.toThrow(/title/i);
    });

    it('should reject author exceeding 200 characters', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'a'.repeat(201),
      };

      await expect(Book.create(bookData)).rejects.toThrow(/author/i);
    });

    it('should reject duplicate book (same title, author, edition)', async () => {
      const bookData = {
        title: 'Duplicate Test',
        author: 'Test Author',
        edition: '1st',
      };

      await Book.create(bookData);

      await expect(Book.create(bookData)).rejects.toThrow();
    });

    it('should allow same title/author with different editions', async () => {
      const book1 = await Book.create({
        title: 'Test Book',
        author: 'Test Author',
        edition: '1st Edition',
      });

      const book2 = await Book.create({
        title: 'Test Book',
        author: 'Test Author',
        edition: '2nd Edition',
      });

      expect(book1.id).not.toBe(book2.id);
    });
  });

  describe('findById', () => {
    it('should find a book by ID', async () => {
      const created = await Book.create({
        title: 'Find By ID Test',
        author: 'Test Author',
      });

      const found = await Book.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        title: 'Find By ID Test',
        author: 'Test Author',
      });
    });

    it('should return null for non-existent ID', async () => {
      const found = await Book.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });

    it('should reject invalid UUID format', async () => {
      await expect(Book.findById('invalid-uuid')).rejects.toThrow();
    });
  });

  describe('findByTitleAuthorEdition', () => {
    beforeEach(async () => {
      await Book.create({
        title: 'Search Test',
        author: 'Search Author',
        edition: '1st',
      });
    });

    it('should find book by exact title, author, and edition match', async () => {
      const found = await Book.findByTitleAuthorEdition(
        'Search Test',
        'Search Author',
        '1st'
      );

      expect(found).toMatchObject({
        title: 'Search Test',
        author: 'Search Author',
        edition: '1st',
      });
    });

    it('should handle null edition in search', async () => {
      await Book.create({
        title: 'No Edition Book',
        author: 'Test Author',
      });

      const found = await Book.findByTitleAuthorEdition(
        'No Edition Book',
        'Test Author',
        null
      );

      expect(found).toMatchObject({
        title: 'No Edition Book',
        author: 'Test Author',
        edition: null,
      });
    });

    it('should return null for non-matching book', async () => {
      const found = await Book.findByTitleAuthorEdition(
        'Nonexistent',
        'Nobody',
        null
      );

      expect(found).toBeNull();
    });

    it('should be case-sensitive for title and author', async () => {
      const found = await Book.findByTitleAuthorEdition(
        'search test', // lowercase
        'Search Author',
        '1st'
      );

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update book fields', async () => {
      const book = await Book.create({
        title: 'Update Test',
        author: 'Original Author',
      });

      const updated = await Book.update(book.id, {
        author: 'Updated Author',
        edition: 'Special Edition',
      });

      expect(updated).toMatchObject({
        id: book.id,
        title: 'Update Test',
        author: 'Updated Author',
        edition: 'Special Edition',
      });
      expect(updated.updatedAt.getTime()).toBeGreaterThan(book.updatedAt.getTime());
    });

    it('should reject invalid field values on update', async () => {
      const book = await Book.create({
        title: 'Valid Book',
        author: 'Valid Author',
      });

      await expect(
        Book.update(book.id, {
          title: 'a'.repeat(501),
        })
      ).rejects.toThrow(/title/i);
    });

    it('should return null when updating non-existent book', async () => {
      const updated = await Book.update('00000000-0000-0000-0000-000000000000', {
        title: 'New Title',
      });

      expect(updated).toBeNull();
    });
  });
});
