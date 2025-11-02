import { test, expect } from '../fixtures/test-fixtures';
import { DatabaseHelper } from '../helpers/database';

test.describe('Book Management Flow', () => {
  test.describe('Search and Add Books', () => {
    test('should search for books using Google Books API', async ({ page, searchPage, authenticatedPage }) => {
      await searchPage.goto();

      // Search for a popular book
      await searchPage.searchBooks('Harry Potter');

      // Wait for results
      await searchPage.waitForSearchResults();

      // Should have search results
      const resultsCount = await searchPage.getSearchResultsCount();
      expect(resultsCount).toBeGreaterThan(0);

      // Results should contain Harry Potter books
      const titles = await searchPage.getSearchResultTitles();
      const hasHarryPotter = titles.some(title =>
        title.toLowerCase().includes('harry potter')
      );
      expect(hasHarryPotter).toBeTruthy();
    });

    test('should show no results for invalid search query', async ({ page, searchPage, authenticatedPage }) => {
      await searchPage.goto();

      // Search for nonsense
      await searchPage.searchBooks('xyzabc123invalidbookquery');

      // Wait for results or no results message
      await searchPage.waitForSearchResults();

      // Should show no results message or have zero results
      const hasNoResults = await searchPage.hasNoResults();
      const resultsCount = await searchPage.getSearchResultsCount();

      expect(hasNoResults || resultsCount === 0).toBeTruthy();
    });

    test('should add book to "Want to Read" list', async ({ page, searchPage, booksPage, authenticatedPage }) => {
      await searchPage.goto();

      // Search for a book
      await searchPage.searchBooks('The Great Gatsby');
      await searchPage.waitForSearchResults();

      // Get first result title
      const titles = await searchPage.getSearchResultTitles();
      expect(titles.length).toBeGreaterThan(0);
      const bookTitle = titles[0];

      // Add book to library
      await searchPage.addBookToLibrary(bookTitle, 'want-to-read');

      // Navigate to books page
      await booksPage.goto();

      // Book should be in library
      const hasBook = await booksPage.bookExists(bookTitle);
      expect(hasBook).toBeTruthy();

      // Book status should be "Want to Read"
      const status = await booksPage.getBookStatus(bookTitle);
      expect(status?.toLowerCase()).toContain('want to read');
    });

    test('should add book to "Reading" list', async ({ page, searchPage, booksPage, authenticatedPage }) => {
      await searchPage.goto();

      // Search for a book
      await searchPage.searchBooks('1984 George Orwell');
      await searchPage.waitForSearchResults();

      // Get first result title
      const titles = await searchPage.getSearchResultTitles();
      expect(titles.length).toBeGreaterThan(0);
      const bookTitle = titles[0];

      // Add book to library as "Reading"
      await searchPage.addBookToLibrary(bookTitle, 'reading');

      // Navigate to books page
      await booksPage.goto();

      // Book should be in library
      const hasBook = await booksPage.bookExists(bookTitle);
      expect(hasBook).toBeTruthy();

      // Book status should be "Reading"
      const status = await booksPage.getBookStatus(bookTitle);
      expect(status?.toLowerCase()).toContain('reading');
    });
  });

  test.describe('Book Progress Tracking', () => {
    test('should update reading progress for a book', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create a test book in "reading" status
      const book = await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Test Book for Progress',
        status: 'reading',
        currentPage: 0,
        pageCount: 300,
      });

      await booksPage.goto();

      // Update progress to page 150
      await booksPage.updateReadingProgress(book.title, 150);

      // Verify progress was updated
      const progress = await booksPage.getBookProgress(book.title);
      expect(progress).not.toBeNull();
      expect(progress?.current).toBe(150);
      expect(progress?.total).toBe(300);
    });

    test('should update progress to completion (last page)', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create a test book in "reading" status
      const book = await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Test Book Near Completion',
        status: 'reading',
        currentPage: 250,
        pageCount: 300,
      });

      await booksPage.goto();

      // Update progress to last page
      await booksPage.updateReadingProgress(book.title, 300);

      // Verify progress was updated
      const progress = await booksPage.getBookProgress(book.title);
      expect(progress).not.toBeNull();
      expect(progress?.current).toBe(300);
    });
  });

  test.describe('Book Status Management', () => {
    test('should mark book as "Read"', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create a test book in "reading" status
      const book = await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Book to Mark as Read',
        status: 'reading',
        currentPage: 250,
        pageCount: 300,
      });

      await booksPage.goto();

      // Mark as read
      await booksPage.markBookAsRead(book.title);

      // Verify status changed
      const status = await booksPage.getBookStatus(book.title);
      expect(status?.toLowerCase()).toContain('read');
    });

    test('should rate a finished book', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create a test book in "read" status
      const book = await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Book to Rate',
        status: 'read',
        pageCount: 300,
      });

      await booksPage.goto();

      // Rate the book 5 stars
      await booksPage.rateBook(book.title, 5);

      // Verify rating was saved
      const rating = await booksPage.getBookRating(book.title);
      expect(rating).toBe(5);
    });

    test('should rate book with different star ratings', async ({ page, booksPage, authenticatedPage, testUser }) => {
      const ratings = [1, 2, 3, 4, 5] as const;

      for (const expectedRating of ratings) {
        // Create a test book
        const book = await DatabaseHelper.createTestBook(testUser.id!, {
          title: `Book ${expectedRating} Stars`,
          status: 'read',
        });

        await booksPage.goto();

        // Rate the book
        await booksPage.rateBook(book.title, expectedRating);

        // Verify rating
        const actualRating = await booksPage.getBookRating(book.title);
        expect(actualRating).toBe(expectedRating);
      }
    });
  });

  test.describe('Book Filtering', () => {
    test('should filter books by "Want to Read" status', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create test books with different statuses
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Want to Read Book 1', status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Want to Read Book 2', status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Currently Reading Book', status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Finished Book', status: 'read' });

      await booksPage.goto();

      // Filter by "Want to Read"
      await booksPage.filterByStatus('want-to-read');

      // Should show only "Want to Read" books
      const books = await booksPage.getAllBookTitles();
      expect(books.length).toBe(2);
      expect(books).toContain('Want to Read Book 1');
      expect(books).toContain('Want to Read Book 2');
    });

    test('should filter books by "Reading" status', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create test books with different statuses
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Want to Read Book', status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Reading Book 1', status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Reading Book 2', status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Finished Book', status: 'read' });

      await booksPage.goto();

      // Filter by "Reading"
      await booksPage.filterByStatus('reading');

      // Should show only "Reading" books
      const books = await booksPage.getAllBookTitles();
      expect(books.length).toBe(2);
      expect(books).toContain('Reading Book 1');
      expect(books).toContain('Reading Book 2');
    });

    test('should filter books by "Read" status', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create test books with different statuses
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Want to Read Book', status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Reading Book', status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Finished Book 1', status: 'read' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Finished Book 2', status: 'read' });

      await booksPage.goto();

      // Filter by "Read"
      await booksPage.filterByStatus('read');

      // Should show only "Read" books
      const books = await booksPage.getAllBookTitles();
      expect(books.length).toBe(2);
      expect(books).toContain('Finished Book 1');
      expect(books).toContain('Finished Book 2');
    });

    test('should show all books when "All" filter is selected', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create test books with different statuses
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Want to Read Book', status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Reading Book', status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Finished Book', status: 'read' });

      await booksPage.goto();

      // Filter by "All"
      await booksPage.filterByStatus('all');

      // Should show all books
      const books = await booksPage.getAllBookTitles();
      expect(books.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Book Deletion', () => {
    test('should delete a book from library', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Create a test book
      const book = await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Book to Delete',
        status: 'want-to-read',
      });

      await booksPage.goto();

      // Verify book exists
      let hasBook = await booksPage.bookExists(book.title);
      expect(hasBook).toBeTruthy();

      // Delete the book
      await booksPage.deleteBook(book.title);

      // Verify book was deleted
      hasBook = await booksPage.bookExists(book.title);
      expect(hasBook).toBeFalsy();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no books exist', async ({ page, booksPage, authenticatedPage, testUser }) => {
      // Ensure user has no books (test user starts with no books)
      await booksPage.goto();

      // Should show empty state
      const hasEmptyState = await booksPage.hasEmptyState();
      expect(hasEmptyState).toBeTruthy();
    });
  });
});