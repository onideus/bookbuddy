import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path?: string) {
    const url = path || this.getPath();
    await this.page.goto(url);
    await this.waitForLoad();
  }

  /**
   * Get the path for this page
   */
  abstract getPath(): string;

  /**
   * Wait for the page to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(selector: string, timeout = 30000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Check if an element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Get text from an element
   */
  async getElementText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Click an element with retry logic
   */
  async clickElement(selector: string) {
    await this.page.locator(selector).click();
  }

  /**
   * Fill a form field
   */
  async fillField(selector: string, value: string) {
    await this.page.locator(selector).fill(value);
  }

  /**
   * Select from dropdown
   */
  async selectOption(selector: string, value: string) {
    await this.page.locator(selector).selectOption(value);
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is authenticated by checking for session
   */
  async isAuthenticated(): Promise<boolean> {
    // Check if navigation has user menu or login button
    const userMenu = this.page.locator('[data-testid="user-menu"]');
    const loginButton = this.page.locator('a[href="/login"]');

    const userMenuCount = await userMenu.count();
    const loginButtonCount = await loginButton.count();

    return userMenuCount > 0 && loginButtonCount === 0;
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp) {
    return await this.page.waitForResponse(urlPattern);
  }

  /**
   * Get all text content from page
   */
  async getPageContent(): Promise<string> {
    return await this.page.textContent('body') || '';
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Get element count
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  /**
   * Hover over element
   */
  async hoverElement(selector: string) {
    await this.page.locator(selector).hover();
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Get attribute value
   */
  async getAttributeValue(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }
}