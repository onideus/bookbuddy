import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class BooksPage extends BasePage {
  // Selectors
  private selectors = {
    pageTitle: 'h1',
    searchInput: 'input[placeholder*="Search"]',
    filterDropdown: 'select[data-testid="status-filter"]',
    bookCard: '[data-testid="book-card"]',
    bookTitle: '[data-testid="book-title"]',
    bookAuthor: '[data-testid="book-author"]',
    bookStatus: '[data-testid="book-status"]',
    bookRating: '[data-testid="book-rating"]',
    progressBar: '[role="progressbar"]',
    deleteButton: '[data-testid="delete-book"]',
    editButton: '[data-testid="edit-book"]',
    updateProgressButton: '[data-testid="update-progress"]',
    markAsReadButton: '[data-testid="mark-as-read"]',
    rateBookButton: '[data-testid="rate-book"]',
    emptyState: '[data-testid="empty-state"]',
    addBookButton: 'a[href="/search"]',
    modal: '[role="dialog"]',
    modalCloseButton: '[data-testid="modal-close"]',
    modalSaveButton: '[data-testid="modal-save"]',
    currentPageInput: 'input[name="currentPage"]',
    ratingStars: '[data-testid="rating-star"]',
    confirmDeleteButton: '[data-testid="confirm-delete"]',
    cancelDeleteButton: '[data-testid="cancel-delete"]',
    statusBadge: '[data-testid="status-badge"]',
    bookGrid: '.grid',
  };

  constructor(page: Page) {
    super(page);
  }

  getPath(): string {
    return '/books';
  }

  /**
   * Get all book titles
   */
  async getAllBookTitles(): Promise<string[]> {
    const titles: string[] = [];
    const bookCards = this.page.locator('.bg-white h3, .dark\\:bg-gray-800 h3');
    const count = await bookCards.count();

    for (let i = 0; i < count; i++) {
      const title = await bookCards.nth(i).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Get book count
   */
  async getBookCount(): Promise<number> {
    const bookCards = this.page.locator('.bg-white.rounded-lg, .dark\\:bg-gray-800.rounded-lg');
    return await bookCards.count();
  }

  /**
   * Search for books
   */
  async searchBooks(query: string) {
    const searchInput = this.page.locator(this.selectors.searchInput);
    const searchExists = await searchInput.count();

    if (searchExists > 0) {
      await searchInput.fill(query);
      await this.page.waitForTimeout(500); // Debounce delay
    }
  }

  /**
   * Filter books by status
   */
  async filterByStatus(status: 'all' | 'want-to-read' | 'reading' | 'read') {
    const filterDropdown = this.page.locator(this.selectors.filterDropdown);
    const dropdownExists = await filterDropdown.count();

    if (dropdownExists > 0) {
      await filterDropdown.selectOption(status);
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Click on a book card
   */
  async clickBookCard(bookTitle: string) {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    await bookCard.click();
  }

  /**
   * Update reading progress
   */
  async updateReadingProgress(bookTitle: string, currentPage: number) {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const updateButton = bookCard.locator('button:has-text("Update Progress")');

    const buttonExists = await updateButton.count();
    if (buttonExists > 0) {
      await updateButton.click();

      // Wait for modal
      await this.waitForElement(this.selectors.modal);

      // Fill in current page
      await this.fillField(this.selectors.currentPageInput, currentPage.toString());

      // Save
      await this.clickElement(this.selectors.modalSaveButton);

      // Wait for modal to close
      await this.page.waitForSelector(this.selectors.modal, { state: 'hidden' });
    }
  }

  /**
   * Mark book as read
   */
  async markBookAsRead(bookTitle: string) {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const markAsReadButton = bookCard.locator('button:has-text("Mark as Read")');

    const buttonExists = await markAsReadButton.count();
    if (buttonExists > 0) {
      await markAsReadButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Rate a book
   */
  async rateBook(bookTitle: string, rating: 1 | 2 | 3 | 4 | 5) {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const rateButton = bookCard.locator('button:has-text("Rate")');

    const buttonExists = await rateButton.count();
    if (buttonExists > 0) {
      await rateButton.click();

      // Wait for modal
      await this.waitForElement(this.selectors.modal);

      // Click on the appropriate star
      const stars = this.page.locator(this.selectors.ratingStars);
      await stars.nth(rating - 1).click();

      // Save
      await this.clickElement(this.selectors.modalSaveButton);

      // Wait for modal to close
      await this.page.waitForSelector(this.selectors.modal, { state: 'hidden' });
    }
  }

  /**
   * Delete a book
   */
  async deleteBook(bookTitle: string) {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const deleteButton = bookCard.locator('button:has-text("Delete")');

    const buttonExists = await deleteButton.count();
    if (buttonExists > 0) {
      await deleteButton.click();

      // Confirm deletion in dialog
      const confirmButton = this.page.locator('button:has-text("Yes, delete")');
      const confirmExists = await confirmButton.count();

      if (confirmExists > 0) {
        await confirmButton.click();
        await this.page.waitForLoadState('networkidle');
      }
    }
  }

  /**
   * Get book status
   */
  async getBookStatus(bookTitle: string): Promise<string | null> {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const statusBadge = bookCard.locator('span').filter({ hasText: /Want to Read|Reading|Read/ });

    const exists = await statusBadge.count();
    if (exists > 0) {
      return await statusBadge.textContent() || null;
    }

    return null;
  }

  /**
   * Get book progress
   */
  async getBookProgress(bookTitle: string): Promise<{ current: number; total: number } | null> {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const progressBar = bookCard.locator(this.selectors.progressBar);

    const exists = await progressBar.count();
    if (exists > 0) {
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      const ariaValueMax = await progressBar.getAttribute('aria-valuemax');

      if (ariaValueNow && ariaValueMax) {
        return {
          current: parseInt(ariaValueNow),
          total: parseInt(ariaValueMax),
        };
      }
    }

    return null;
  }

  /**
   * Get book rating
   */
  async getBookRating(bookTitle: string): Promise<number | null> {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const ratingStars = bookCard.locator('svg.text-yellow-400, svg.fill-yellow-400');

    const count = await ratingStars.count();
    return count > 0 ? count : null;
  }

  /**
   * Check if empty state is displayed
   */
  async hasEmptyState(): Promise<boolean> {
    const emptyStateText = await this.page.locator('text="No books found"').count();
    const noBookYet = await this.page.locator('text="No books yet"').count();
    return emptyStateText > 0 || noBookYet > 0;
  }

  /**
   * Click add book button
   */
  async clickAddBook() {
    await this.clickElement(this.selectors.addBookButton);
  }

  /**
   * Check if book exists
   */
  async bookExists(bookTitle: string): Promise<boolean> {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const count = await bookCard.count();
    return count > 0;
  }

  /**
   * Get books by status
   */
  async getBooksByStatus(status: 'Want to Read' | 'Reading' | 'Read'): Promise<string[]> {
    await this.filterByStatus(status.toLowerCase().replace(/\s+/g, '-') as any);
    await this.page.waitForTimeout(1000); // Wait for filter to apply
    return await this.getAllBookTitles();
  }
}