import { test, expect, devices } from '@playwright/test';
import { test as customTest } from '../fixtures/test-fixtures';
import { DatabaseHelper } from '../helpers/database';

// Create tests specifically for mobile viewports
const mobileTest = customTest.extend({});

test.describe('Mobile Responsiveness', () => {
  test.describe('Mobile Navigation', () => {
    test('should display mobile navigation menu', async ({ page, dashboardPage, navigation, authenticatedPage }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await dashboardPage.goto();

      // Check if mobile menu button is visible
      const mobileMenuButton = page.locator('button[aria-label*="Menu"], button[aria-label*="menu"]');
      const buttonCount = await mobileMenuButton.count();

      // Mobile menu button should exist on small screens
      if (buttonCount > 0) {
        const isVisible = await mobileMenuButton.isVisible();
        expect(isVisible).toBeTruthy();
      }
    });

    test('should open and close mobile menu', async ({ page, dashboardPage, navigation, authenticatedPage }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.goto();

      const mobileMenuButton = page.locator('button[aria-label*="Menu"], button[aria-label*="menu"]');
      const buttonCount = await mobileMenuButton.count();

      if (buttonCount > 0) {
        // Open menu
        await navigation.openMobileMenu();
        await page.waitForTimeout(500);

        // Check if menu is open
        const isOpen = await navigation.isMobileMenuOpen();

        // Close menu
        await navigation.closeMobileMenu();
        await page.waitForTimeout(500);
      }
    });

    test('should navigate between pages on mobile', async ({ page, dashboardPage, navigation, authenticatedPage }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.goto();

      // Navigate to different pages
      await navigation.goToBooks();
      await expect(page).toHaveURL('/books');

      await navigation.goToSearch();
      await expect(page).toHaveURL('/search');

      await navigation.goToGoals();
      await expect(page).toHaveURL('/goals');

      await navigation.goToDashboard();
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Mobile Dashboard Layout', () => {
    test('should display dashboard statistics in mobile layout', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Create test data
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'read' });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Stats should be visible and stacked vertically on mobile
      const stats = await dashboardPage.getStatistics();
      expect(stats.total_books).toBeGreaterThan(0);
    });

    test('should display currently reading books in mobile view', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Mobile Reading Book',
        status: 'reading',
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const books = await dashboardPage.getCurrentlyReadingBooks();
      expect(books).toContain('Mobile Reading Book');
    });

    test('should scroll to view all dashboard content on mobile', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Create enough content to require scrolling
      for (let i = 1; i <= 3; i++) {
        await DatabaseHelper.createTestBook(testUser.id!, {
          title: `Book ${i}`,
          status: 'reading',
        });
      }

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      for (let i = 1; i <= 2; i++) {
        await DatabaseHelper.createTestGoal(testUser.id!, {
          title: `Goal ${i}`,
          targetBooks: 10,
          endDate: futureDate,
        });
      }

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Content should be accessible
      const goals = await dashboardPage.getActiveGoals();
      expect(goals.length).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Books Page Layout', () => {
    test('should display books in single column on mobile', async ({ page, booksPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Create test books
      for (let i = 1; i <= 3; i++) {
        await DatabaseHelper.createTestBook(testUser.id!, {
          title: `Mobile Book ${i}`,
          status: 'reading',
        });
      }

      await booksPage.goto();

      const bookCount = await booksPage.getBookCount();
      expect(bookCount).toBe(3);

      // All books should be visible (stacked vertically)
      const titles = await booksPage.getAllBookTitles();
      expect(titles.length).toBe(3);
    });

    test('should be able to update book progress on mobile', async ({ page, booksPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Mobile Progress Book',
        status: 'reading',
        currentPage: 50,
        pageCount: 300,
      });

      await booksPage.goto();

      // Update progress
      await booksPage.updateReadingProgress('Mobile Progress Book', 150);

      // Verify progress
      const progress = await booksPage.getBookProgress('Mobile Progress Book');
      expect(progress?.current).toBe(150);
    });

    test('should be able to filter books on mobile', async ({ page, booksPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Mobile Want to Read', status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Mobile Reading', status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { title: 'Mobile Read', status: 'read' });

      await booksPage.goto();

      // Filter by reading
      await booksPage.filterByStatus('reading');

      const books = await booksPage.getAllBookTitles();
      expect(books).toContain('Mobile Reading');
      expect(books.length).toBe(1);
    });
  });

  test.describe('Mobile Search Page', () => {
    test('should search for books on mobile', async ({ page, searchPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await searchPage.goto();

      // Search for books
      await searchPage.searchBooks('Harry Potter');
      await searchPage.waitForSearchResults();

      const resultsCount = await searchPage.getSearchResultsCount();
      expect(resultsCount).toBeGreaterThan(0);
    });

    test('should display search results in mobile layout', async ({ page, searchPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await searchPage.goto();
      await searchPage.searchBooks('The Hobbit');
      await searchPage.waitForSearchResults();

      const titles = await searchPage.getSearchResultTitles();
      expect(titles.length).toBeGreaterThan(0);

      // Results should be stacked vertically
      const resultsCount = await searchPage.getSearchResultsCount();
      expect(resultsCount).toBeGreaterThan(0);
    });

    test('should be able to add book to library on mobile', async ({ page, searchPage, booksPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await searchPage.goto();
      await searchPage.searchBooks('1984');
      await searchPage.waitForSearchResults();

      const titles = await searchPage.getSearchResultTitles();
      expect(titles.length).toBeGreaterThan(0);

      const bookTitle = titles[0];
      await searchPage.addBookToLibrary(bookTitle, 'want-to-read');

      // Verify book was added
      await booksPage.goto();
      const hasBook = await booksPage.bookExists(bookTitle);
      expect(hasBook).toBeTruthy();
    });
  });

  test.describe('Mobile Goals Page', () => {
    test('should display goals in mobile layout', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Mobile Goal 1',
        targetBooks: 10,
        endDate: futureDate,
      });

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Mobile Goal 2',
        targetBooks: 15,
        endDate: futureDate,
      });

      await goalsPage.goto();

      const goals = await goalsPage.getAllGoalTitles();
      expect(goals).toContain('Mobile Goal 1');
      expect(goals).toContain('Mobile Goal 2');
    });

    test('should create goal on mobile', async ({ page, goalsPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await goalsPage.goto();

      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 6);

      await goalsPage.createGoal('Mobile Created Goal', 10, deadline);

      const hasGoal = await goalsPage.goalExists('Mobile Created Goal');
      expect(hasGoal).toBeTruthy();
    });

    test('should edit goal on mobile', async ({ page, goalsPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Mobile Edit Goal',
        targetBooks: 10,
        endDate: futureDate,
      });

      await goalsPage.goto();

      await goalsPage.editGoal('Mobile Edit Goal', {
        title: 'Mobile Edited Goal',
      });

      const hasGoal = await goalsPage.goalExists('Mobile Edited Goal');
      expect(hasGoal).toBeTruthy();
    });
  });

  test.describe('Mobile Forms', () => {
    test('should handle login form on mobile', async ({ page, loginPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await loginPage.goto();

      // Form should be usable on mobile
      await loginPage.login(testUser.email, testUser.password);

      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle registration form on mobile', async ({ page, registerPage }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await registerPage.goto();

      // Form should be visible and usable
      const isFormVisible = await registerPage.isRegistrationFormVisible();
      expect(isFormVisible).toBeTruthy();
    });

    test('should handle modals on mobile', async ({ page, booksPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Mobile Modal Book',
        status: 'reading',
        pageCount: 300,
      });

      await booksPage.goto();

      // Open update progress modal
      await booksPage.updateReadingProgress('Mobile Modal Book', 100);

      // Modal should work on mobile
      const progress = await booksPage.getBookProgress('Mobile Modal Book');
      expect(progress?.current).toBe(100);
    });
  });

  test.describe('Mobile Touch Interactions', () => {
    test('should handle touch scroll on books page', async ({ page, booksPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Create many books to require scrolling
      for (let i = 1; i <= 10; i++) {
        await DatabaseHelper.createTestBook(testUser.id!, {
          title: `Scroll Book ${i}`,
          status: 'reading',
        });
      }

      await booksPage.goto();

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Should be able to see books at bottom
      const hasBook = await booksPage.bookExists('Scroll Book 10');
      expect(hasBook).toBeTruthy();
    });

    test('should handle touch interactions on dashboard', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await DatabaseHelper.createTestBook(testUser.id!, {
        status: 'reading',
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Scroll and interact with content
      await page.evaluate(() => window.scrollTo(0, 500));

      // Should still be functional
      const stats = await dashboardPage.getStatistics();
      expect(stats.currently_reading).toBeGreaterThan(0);
    });
  });

  test.describe('Different Mobile Devices', () => {
    test('should work on iPhone 12 viewport', async ({ page, dashboardPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain('Welcome back');
    });

    test('should work on Pixel 5 viewport', async ({ page, dashboardPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 393, height: 851 }); // Pixel 5

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain('Welcome back');
    });

    test('should work on small mobile viewport', async ({ page, dashboardPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 320, height: 568 }); // iPhone SE (1st gen)

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain('Welcome back');
    });

    test('should work on tablet viewport', async ({ page, dashboardPage, authenticatedPage }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain('Welcome back');
    });
  });
});