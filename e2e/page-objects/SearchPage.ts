import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SearchPage extends BasePage {
  // Selectors
  private selectors = {
    pageTitle: 'h1',
    searchInput: 'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]',
    searchButton: 'button[type="submit"]',
    searchResults: '[data-testid="search-results"]',
    bookResult: '[data-testid="book-result"]',
    bookTitle: '[data-testid="book-title"]',
    bookAuthor: '[data-testid="book-author"]',
    bookDescription: '[data-testid="book-description"]',
    addButton: 'button:has-text("Add to Library")',
    loadingIndicator: '[data-testid="loading"]',
    noResultsMessage: '[data-testid="no-results"]',
    errorMessage: '[data-testid="error-message"]',
    bookCover: 'img[alt*="cover"], img[alt*="Cover"]',
    pagination: '[data-testid="pagination"]',
    nextPageButton: 'button:has-text("Next")',
    prevPageButton: 'button:has-text("Previous")',
    statusDropdown: 'select[name="status"]',
    successMessage: '[data-testid="success-message"]',
    searchResultCard: '.bg-white.rounded-lg, .dark\\:bg-gray-800.rounded-lg',
  };

  constructor(page: Page) {
    super(page);
  }

  getPath(): string {
    return '/search';
  }

  /**
   * Search for books
   */
  async searchBooks(query: string) {
    const searchInput = this.page.locator(this.selectors.searchInput);
    await searchInput.fill(query);

    // Check if there's a search button or if it's auto-search
    const searchButton = this.page.locator(this.selectors.searchButton);
    const buttonExists = await searchButton.count();

    if (buttonExists > 0) {
      await searchButton.click();
    } else {
      // Auto-search - press Enter or wait for debounce
      await this.page.keyboard.press('Enter');
    }

    // Wait for results to load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Additional wait for API response
  }

  /**
   * Get search results count
   */
  async getSearchResultsCount(): Promise<number> {
    const results = this.page.locator(this.selectors.searchResultCard);
    return await results.count();
  }

  /**
   * Get all book titles from search results
   */
  async getSearchResultTitles(): Promise<string[]> {
    const titles: string[] = [];
    const titleElements = this.page.locator('h3');
    const count = await titleElements.count();

    for (let i = 0; i < count; i++) {
      const title = await titleElements.nth(i).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Add a book to library
   */
  async addBookToLibrary(bookTitle: string, status?: 'want-to-read' | 'reading' | 'read') {
    // Find the book card with the title
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);

    // If status dropdown exists, select status first
    if (status) {
      const statusDropdown = bookCard.locator(this.selectors.statusDropdown);
      const dropdownExists = await statusDropdown.count();

      if (dropdownExists > 0) {
        await statusDropdown.selectOption(status);
      }
    }

    // Click add button
    const addButton = bookCard.locator(this.selectors.addButton);
    await addButton.click();

    // Wait for success message or navigation
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    const loadingElement = this.page.locator('text="Searching..." , text="Loading..."');
    return await loadingElement.isVisible().catch(() => false);
  }

  /**
   * Check if no results message is displayed
   */
  async hasNoResults(): Promise<boolean> {
    const noResultsText = await this.page.locator('text="No results found", text="No books found"').count();
    return noResultsText > 0;
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    const errorText = await this.page.locator('text="Error", text="Failed"').count();
    return errorText > 0;
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    const errorElement = this.page.locator('[role="alert"]').first();
    const exists = await errorElement.count();

    if (exists > 0) {
      return await errorElement.textContent() || '';
    }

    return '';
  }

  /**
   * Go to next page of results
   */
  async goToNextPage() {
    const nextButton = this.page.locator(this.selectors.nextPageButton);
    const exists = await nextButton.count();

    if (exists > 0 && await nextButton.isEnabled()) {
      await nextButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Go to previous page of results
   */
  async goToPreviousPage() {
    const prevButton = this.page.locator(this.selectors.prevPageButton);
    const exists = await prevButton.count();

    if (exists > 0 && await prevButton.isEnabled()) {
      await prevButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Check if book is already in library
   */
  async isBookInLibrary(bookTitle: string): Promise<boolean> {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const inLibraryBadge = bookCard.locator('text="In Library", text="Added"');
    const badgeExists = await inLibraryBadge.count();

    if (badgeExists > 0) {
      return true;
    }

    // Also check if add button is disabled
    const addButton = bookCard.locator(this.selectors.addButton);
    const buttonExists = await addButton.count();

    if (buttonExists > 0) {
      return !(await addButton.isEnabled());
    }

    return false;
  }

  /**
   * Get book details from search result
   */
  async getBookDetails(bookTitle: string): Promise<{
    title: string;
    author: string;
    description?: string;
  } | null> {
    const bookCard = this.page.locator(`.bg-white:has(h3:text("${bookTitle}")), .dark\\:bg-gray-800:has(h3:text("${bookTitle}"))`);
    const exists = await bookCard.count();

    if (exists > 0) {
      const title = await bookCard.locator('h3').textContent();
      const author = await bookCard.locator('p.text-sm').first().textContent();
      const description = await bookCard.locator('p.text-gray-600, p.dark\\:text-gray-400').last().textContent();

      return {
        title: title?.trim() || '',
        author: author?.trim() || '',
        description: description?.trim(),
      };
    }

    return null;
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    const searchInput = this.page.locator(this.selectors.searchInput);
    await searchInput.clear();
  }

  /**
   * Wait for search results to load
   */
  async waitForSearchResults() {
    // Wait for either results or no results message
    await Promise.race([
      this.page.waitForSelector(this.selectors.searchResultCard, { timeout: 10000 }),
      this.page.waitForSelector('text="No results found"', { timeout: 10000 }),
      this.page.waitForSelector('text="No books found"', { timeout: 10000 }),
    ]).catch(() => {
      // If none appear, just wait for network idle
      return this.page.waitForLoadState('networkidle');
    });
  }
}