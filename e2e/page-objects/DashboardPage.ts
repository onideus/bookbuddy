import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Selectors
  private selectors = {
    welcomeMessage: 'h1',
    totalBooksCard: '[data-testid="total-books-card"]',
    currentlyReadingCard: '[data-testid="currently-reading-card"]',
    booksReadCard: '[data-testid="books-read-card"]',
    activeGoalsCard: '[data-testid="active-goals-card"]',
    currentlyReadingSection: '[data-testid="currently-reading-section"]',
    activeGoalsSection: '[data-testid="active-goals-section"]',
    emptyState: '[data-testid="empty-state"]',
    searchBooksButton: 'a[href="/search"]',
    viewAllBooksLink: 'a[href="/books"]',
    viewAllGoalsLink: 'a[href="/goals"]',
    bookCard: '[data-testid="book-card"]',
    goalCard: '[data-testid="goal-card"]',
    progressBar: '[data-testid="progress-bar"]',
    statsGrid: '.grid', // Stats grid container
  };

  constructor(page: Page) {
    super(page);
  }

  getPath(): string {
    return '/dashboard';
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    return await this.getElementText(this.selectors.welcomeMessage);
  }

  /**
   * Get statistics values
   */
  async getStatistics() {
    // Look for stat values in the grid
    const statsGrid = this.page.locator(this.selectors.statsGrid).first();
    const statCards = statsGrid.locator('.bg-white, .dark\\:bg-gray-800');

    const stats: any = {};
    const count = await statCards.count();

    for (let i = 0; i < count; i++) {
      const card = statCards.nth(i);
      const label = await card.locator('p.text-sm').textContent();
      const value = await card.locator('p.text-3xl').textContent();

      if (label && value) {
        const key = label.toLowerCase().replace(/\s+/g, '_');
        stats[key] = parseInt(value);
      }
    }

    return stats;
  }

  /**
   * Check if empty state is displayed
   */
  async hasEmptyState(): Promise<boolean> {
    // Check for "No books yet" text
    const emptyStateText = await this.page.locator('text="No books yet"').count();
    return emptyStateText > 0;
  }

  /**
   * Click search for books button
   */
  async clickSearchBooks() {
    await this.clickElement(this.selectors.searchBooksButton);
  }

  /**
   * Get currently reading books
   */
  async getCurrentlyReadingBooks(): Promise<string[]> {
    const bookTitles: string[] = [];
    const bookCards = this.page.locator('.bg-white h3, .dark\\:bg-gray-800 h3');
    const count = await bookCards.count();

    for (let i = 0; i < count; i++) {
      const title = await bookCards.nth(i).textContent();
      if (title) {
        bookTitles.push(title);
      }
    }

    return bookTitles;
  }

  /**
   * Get active goals
   */
  async getActiveGoals(): Promise<string[]> {
    const goalTitles: string[] = [];
    const goalCards = this.page.locator('.bg-white h3, .dark\\:bg-gray-800 h3');
    const count = await goalCards.count();

    for (let i = 0; i < count; i++) {
      const title = await goalCards.nth(i).textContent();
      if (title && !goalTitles.includes(title)) {
        goalTitles.push(title);
      }
    }

    return goalTitles;
  }

  /**
   * Check if currently reading section is visible
   */
  async hasCurrentlyReadingSection(): Promise<boolean> {
    const heading = await this.page.locator('h2:has-text("Currently Reading")').count();
    return heading > 0;
  }

  /**
   * Check if active goals section is visible
   */
  async hasActiveGoalsSection(): Promise<boolean> {
    const heading = await this.page.locator('h2:has-text("Active Goals")').count();
    return heading > 0;
  }

  /**
   * Click view all books link
   */
  async clickViewAllBooks() {
    await this.clickElement(this.selectors.viewAllBooksLink);
  }

  /**
   * Click view all goals link
   */
  async clickViewAllGoals() {
    await this.clickElement(this.selectors.viewAllGoalsLink);
  }

  /**
   * Get reading progress for a book
   */
  async getBookProgress(bookTitle: string): Promise<{ current: number; total: number } | null> {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const exists = await bookCard.count();

    if (exists > 0) {
      const progressBar = bookCard.locator('[role="progressbar"]');
      const progressExists = await progressBar.count();

      if (progressExists > 0) {
        const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
        const ariaValueMax = await progressBar.getAttribute('aria-valuemax');

        if (ariaValueNow && ariaValueMax) {
          return {
            current: parseInt(ariaValueNow),
            total: parseInt(ariaValueMax),
          };
        }
      }
    }

    return null;
  }

  /**
   * Get goal progress
   */
  async getGoalProgress(goalTitle: string): Promise<{ current: number; total: number } | null> {
    const goalCard = this.page.locator(`.bg-white:has(h3:text("${goalTitle}")), .dark\\:bg-gray-800:has(h3:text("${goalTitle}"))`);
    const exists = await goalCard.count();

    if (exists > 0) {
      const progressBar = goalCard.locator('[role="progressbar"]');
      const progressExists = await progressBar.count();

      if (progressExists > 0) {
        const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
        const ariaValueMax = await progressBar.getAttribute('aria-valuemax');

        if (ariaValueNow && ariaValueMax) {
          return {
            current: parseInt(ariaValueNow),
            total: parseInt(ariaValueMax),
          };
        }
      }
    }

    return null;
  }

  /**
   * Wait for dashboard to load
   */
  async waitForDashboardToLoad() {
    await this.waitForElement('h1');
    await this.page.waitForLoadState('networkidle');
  }
}