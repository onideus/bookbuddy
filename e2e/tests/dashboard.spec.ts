import { test, expect } from '../fixtures/test-fixtures';
import { DatabaseHelper } from '../helpers/database';

test.describe('Dashboard Flow', () => {
  test.describe('Welcome and User Info', () => {
    test('should display welcome message with user name', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      await dashboardPage.goto();

      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain(testUser.name);
    });

    test('should load dashboard successfully after login', async ({ page, loginPage, dashboardPage, testUser }) => {
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);

      await expect(page).toHaveURL('/dashboard');
      await dashboardPage.waitForDashboardToLoad();

      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain('Welcome back');
    });
  });

  test.describe('Statistics Display', () => {
    test('should display correct book statistics', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      // Create test books with different statuses
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'want-to-read' });
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'reading' });
      await DatabaseHelper.createTestBook(testUser.id!, { status: 'read' });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const stats = await dashboardPage.getStatistics();

      expect(stats.total_books).toBe(6);
      expect(stats.currently_reading).toBe(3);
      expect(stats.books_read).toBe(1);
    });

    test('should show zero statistics for new user', async ({ page, dashboardPage, authenticatedPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const stats = await dashboardPage.getStatistics();

      expect(stats.total_books).toBe(0);
      expect(stats.currently_reading).toBe(0);
      expect(stats.books_read).toBe(0);
    });

    test('should display active goals count', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      // Create active goals
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Active Goal 1',
        targetBooks: 10,
        endDate: futureDate,
        completed: false,
      });

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Active Goal 2',
        targetBooks: 15,
        endDate: futureDate,
        completed: false,
      });

      // Create completed goal (should not count)
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Completed Goal',
        targetBooks: 5,
        completed: true,
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const stats = await dashboardPage.getStatistics();
      expect(stats.active_goals).toBe(2);
    });

    test('should update statistics when books are added', async ({ page, dashboardPage, booksPage, searchPage, authenticatedPage, testUser }) => {
      // Get initial stats
      await dashboardPage.goto();
      let stats = await dashboardPage.getStatistics();
      const initialTotal = stats.total_books || 0;

      // Add a book manually to database
      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'New Book',
        status: 'want-to-read',
      });

      // Refresh dashboard
      await dashboardPage.goto();
      stats = await dashboardPage.getStatistics();

      expect(stats.total_books).toBe(initialTotal + 1);
    });
  });

  test.describe('Currently Reading Section', () => {
    test('should display currently reading books', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      // Create books in "reading" status
      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Reading Book 1',
        status: 'reading',
        currentPage: 50,
        pageCount: 300,
      });

      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Reading Book 2',
        status: 'reading',
        currentPage: 100,
        pageCount: 400,
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Check if currently reading section is visible
      const hasSection = await dashboardPage.hasCurrentlyReadingSection();
      expect(hasSection).toBeTruthy();

      // Get currently reading books
      const books = await dashboardPage.getCurrentlyReadingBooks();
      expect(books.length).toBeGreaterThanOrEqual(2);
      expect(books).toContain('Reading Book 1');
      expect(books).toContain('Reading Book 2');
    });

    test('should display reading progress for books', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      const bookTitle = 'Progress Test Book';
      await DatabaseHelper.createTestBook(testUser.id!, {
        title: bookTitle,
        status: 'reading',
        currentPage: 150,
        pageCount: 300,
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Get book progress
      const progress = await dashboardPage.getBookProgress(bookTitle);
      expect(progress).not.toBeNull();
      expect(progress?.current).toBe(150);
      expect(progress?.total).toBe(300);
    });

    test('should show up to 3 currently reading books', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      // Create more than 3 books
      for (let i = 1; i <= 5; i++) {
        await DatabaseHelper.createTestBook(testUser.id!, {
          title: `Reading Book ${i}`,
          status: 'reading',
        });
      }

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const books = await dashboardPage.getCurrentlyReadingBooks();

      // Should display maximum 3 books
      expect(books.length).toBeLessThanOrEqual(3);
    });

    test('should not show currently reading section when no books are being read', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      // Create books in other statuses
      await DatabaseHelper.createTestBook(testUser.id!, {
        status: 'want-to-read',
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const hasSection = await dashboardPage.hasCurrentlyReadingSection();
      expect(hasSection).toBeFalsy();
    });

    test('should navigate to books page from "View all" link', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      // Create a reading book
      await DatabaseHelper.createTestBook(testUser.id!, {
        status: 'reading',
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Click view all link
      await dashboardPage.clickViewAllBooks();

      // Should navigate to books page
      await expect(page).toHaveURL('/books');
    });
  });

  test.describe('Active Goals Section', () => {
    test('should display active goals', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Dashboard Goal 1',
        targetBooks: 10,
        currentBooks: 3,
        endDate: futureDate,
        completed: false,
      });

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Dashboard Goal 2',
        targetBooks: 15,
        currentBooks: 7,
        endDate: futureDate,
        completed: false,
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Check if active goals section is visible
      const hasSection = await dashboardPage.hasActiveGoalsSection();
      expect(hasSection).toBeTruthy();

      // Get active goals
      const goals = await dashboardPage.getActiveGoals();
      expect(goals.length).toBeGreaterThanOrEqual(2);
      expect(goals).toContain('Dashboard Goal 1');
      expect(goals).toContain('Dashboard Goal 2');
    });

    test('should display goal progress', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      const goalTitle = 'Progress Goal Test';
      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: goalTitle,
        targetBooks: 20,
        currentBooks: 8,
        endDate: futureDate,
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Get goal progress
      const progress = await dashboardPage.getGoalProgress(goalTitle);
      expect(progress).not.toBeNull();
      expect(progress?.current).toBe(8);
      expect(progress?.total).toBe(20);
    });

    test('should show up to 2 active goals', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create more than 2 goals
      for (let i = 1; i <= 4; i++) {
        await DatabaseHelper.createTestGoal(testUser.id!, {
          title: `Goal ${i}`,
          targetBooks: 10,
          endDate: futureDate,
        });
      }

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const goals = await dashboardPage.getActiveGoals();

      // Should display maximum 2 goals
      expect(goals.length).toBeLessThanOrEqual(2);
    });

    test('should not show completed goals in active section', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Active Goal',
        targetBooks: 10,
        endDate: futureDate,
        completed: false,
      });

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Completed Goal',
        targetBooks: 5,
        completed: true,
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const goals = await dashboardPage.getActiveGoals();
      expect(goals).toContain('Active Goal');
      expect(goals).not.toContain('Completed Goal');
    });

    test('should navigate to goals page from "View all" link', async ({ page, dashboardPage, authenticatedPage, testUser }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      await DatabaseHelper.createTestGoal(testUser.id!, {
        title: 'Test Goal',
        targetBooks: 10,
        endDate: futureDate,
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Click view all goals link
      await dashboardPage.clickViewAllGoals();

      // Should navigate to goals page
      await expect(page).toHaveURL('/goals');
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no books exist', async ({ page, dashboardPage, authenticatedPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      const hasEmptyState = await dashboardPage.hasEmptyState();
      expect(hasEmptyState).toBeTruthy();
    });

    test('should navigate to search from empty state button', async ({ page, dashboardPage, authenticatedPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardToLoad();

      // Click search books button
      await dashboardPage.clickSearchBooks();

      // Should navigate to search page
      await expect(page).toHaveURL('/search');
    });
  });

  test.describe('Navigation Integration', () => {
    test('should navigate between pages using navigation menu', async ({ page, dashboardPage, navigation, authenticatedPage }) => {
      await dashboardPage.goto();

      // Navigate to books
      await navigation.goToBooks();
      await expect(page).toHaveURL('/books');

      // Navigate to search
      await navigation.goToSearch();
      await expect(page).toHaveURL('/search');

      // Navigate to goals
      await navigation.goToGoals();
      await expect(page).toHaveURL('/goals');

      // Navigate back to dashboard
      await navigation.goToDashboard();
      await expect(page).toHaveURL('/dashboard');
    });

    test('should maintain user session across page navigation', async ({ page, dashboardPage, navigation, authenticatedPage, testUser }) => {
      await dashboardPage.goto();

      // Verify user is logged in
      const isLoggedIn = await navigation.isUserLoggedIn();
      expect(isLoggedIn).toBeTruthy();

      // Navigate to different pages
      await navigation.goToBooks();
      await navigation.goToGoals();
      await navigation.goToDashboard();

      // Should still be logged in
      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain(testUser.name);
    });
  });

  test.describe('Real-time Updates', () => {
    test('should reflect changes after adding a book', async ({ page, dashboardPage, booksPage, searchPage, authenticatedPage, testUser }) => {
      // Get initial stats
      await dashboardPage.goto();
      let stats = await dashboardPage.getStatistics();
      const initialReading = stats.currently_reading || 0;

      // Add a book in "reading" status
      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'New Reading Book',
        status: 'reading',
      });

      // Go back to dashboard
      await dashboardPage.goto();
      stats = await dashboardPage.getStatistics();

      expect(stats.currently_reading).toBe(initialReading + 1);
    });

    test('should reflect changes after completing a book', async ({ page, dashboardPage, booksPage, authenticatedPage, testUser }) => {
      // Create a book in reading status
      await DatabaseHelper.createTestBook(testUser.id!, {
        title: 'Book to Complete',
        status: 'reading',
      });

      // Get initial stats
      await dashboardPage.goto();
      let stats = await dashboardPage.getStatistics();
      const initialReading = stats.currently_reading || 0;
      const initialRead = stats.books_read || 0;

      // Mark book as read
      await booksPage.goto();
      await booksPage.markBookAsRead('Book to Complete');

      // Go back to dashboard
      await dashboardPage.goto();
      stats = await dashboardPage.getStatistics();

      expect(stats.currently_reading).toBe(initialReading - 1);
      expect(stats.books_read).toBe(initialRead + 1);
    });
  });
});