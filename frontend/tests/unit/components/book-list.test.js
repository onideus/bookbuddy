/**
 * Unit test for BookList component (T042)
 * Tests rendering and filtering logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/dom';
import '@testing-library/dom';

describe('BookList Component', () => {
  let container;

  beforeEach(() => {
    // Create a container for the component
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });

  it('should render empty state when no books provided', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const bookList = new BookList({
      container,
      books: [],
      status: 'TO_READ',
    });

    bookList.render();

    expect(container.textContent).toMatch(/no books/i);
  });

  it('should render list of books', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const books = [
      {
        id: '1',
        book: {
          title: 'Book 1',
          author: 'Author 1',
        },
        status: 'TO_READ',
      },
      {
        id: '2',
        book: {
          title: 'Book 2',
          author: 'Author 2',
        },
        status: 'TO_READ',
      },
    ];

    const bookList = new BookList({
      container,
      books,
      status: 'TO_READ',
    });

    bookList.render();

    expect(container.textContent).toContain('Book 1');
    expect(container.textContent).toContain('Author 1');
    expect(container.textContent).toContain('Book 2');
    expect(container.textContent).toContain('Author 2');
  });

  it('should filter books by status', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const books = [
      {
        id: '1',
        book: { title: 'To Read Book', author: 'Author A' },
        status: 'TO_READ',
      },
      {
        id: '2',
        book: { title: 'Reading Book', author: 'Author B' },
        status: 'READING',
      },
      {
        id: '3',
        book: { title: 'Finished Book', author: 'Author C' },
        status: 'FINISHED',
      },
    ];

    const bookList = new BookList({
      container,
      books,
      status: 'READING',
    });

    bookList.render();

    // Should only show READING book
    expect(container.textContent).toContain('Reading Book');
    expect(container.textContent).not.toContain('To Read Book');
    expect(container.textContent).not.toContain('Finished Book');
  });

  it('should support keyboard navigation', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const books = [
      {
        id: '1',
        book: { title: 'Book 1', author: 'Author 1' },
        status: 'TO_READ',
      },
      {
        id: '2',
        book: { title: 'Book 2', author: 'Author 2' },
        status: 'TO_READ',
      },
    ];

    const bookList = new BookList({
      container,
      books,
      status: 'TO_READ',
    });

    bookList.render();

    // Find first book card
    const firstCard = container.querySelector('[data-testid="book-card"]');
    expect(firstCard).toBeTruthy();

    // Should have tabindex for keyboard navigation
    expect(firstCard.getAttribute('tabindex')).toBe('0');
  });

  it('should render with ARIA live region for updates', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const bookList = new BookList({
      container,
      books: [],
      status: 'TO_READ',
    });

    bookList.render();

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it('should update when books change', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const initialBooks = [
      {
        id: '1',
        book: { title: 'Book 1', author: 'Author 1' },
        status: 'TO_READ',
      },
    ];

    const bookList = new BookList({
      container,
      books: initialBooks,
      status: 'TO_READ',
    });

    bookList.render();
    expect(container.textContent).toContain('Book 1');

    // Update with new books
    const newBooks = [
      ...initialBooks,
      {
        id: '2',
        book: { title: 'Book 2', author: 'Author 2' },
        status: 'TO_READ',
      },
    ];

    bookList.update(newBooks);

    expect(container.textContent).toContain('Book 1');
    expect(container.textContent).toContain('Book 2');
  });

  it('should emit events when book is clicked', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const books = [
      {
        id: '1',
        book: { title: 'Clickable Book', author: 'Author' },
        status: 'TO_READ',
      },
    ];

    const onBookClick = vi.fn();

    const bookList = new BookList({
      container,
      books,
      status: 'TO_READ',
      onBookClick,
    });

    bookList.render();

    const bookCard = container.querySelector('[data-testid="book-card"]');
    bookCard.click();

    expect(onBookClick).toHaveBeenCalledWith(books[0]);
  });

  it('should render status indicators with proper colors', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const statuses = ['TO_READ', 'READING', 'FINISHED'];

    for (const status of statuses) {
      const books = [
        {
          id: '1',
          book: { title: 'Test Book', author: 'Test Author' },
          status,
        },
      ];

      const bookList = new BookList({
        container,
        books,
        status,
      });

      bookList.render();

      const statusIndicator = container.querySelector(`[data-status="${status}"]`);
      expect(statusIndicator).toBeTruthy();
    }
  });

  it('should handle empty edition gracefully', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const books = [
      {
        id: '1',
        book: {
          title: 'No Edition Book',
          author: 'Test Author',
          edition: null,
        },
        status: 'TO_READ',
      },
    ];

    const bookList = new BookList({
      container,
      books,
      status: 'TO_READ',
    });

    bookList.render();

    expect(container.textContent).toContain('No Edition Book');
    expect(container.textContent).toContain('Test Author');
  });

  it('should render with accessible focus indicators', async () => {
    const { BookList } = await import('../../../src/scripts/components/book-list.js');

    const books = [
      {
        id: '1',
        book: { title: 'Focus Test', author: 'Test' },
        status: 'TO_READ',
      },
    ];

    const bookList = new BookList({
      container,
      books,
      status: 'TO_READ',
    });

    bookList.render();

    const bookCard = container.querySelector('[data-testid="book-card"]');

    // Focus the card
    bookCard.focus();

    // Check for focus styles (relies on CSS being applied)
    const computedStyles = window.getComputedStyle(bookCard);
    // This test might need adjustment based on actual focus implementation
    expect(bookCard.matches(':focus-visible') || bookCard.matches(':focus')).toBe(true);
  });
});
