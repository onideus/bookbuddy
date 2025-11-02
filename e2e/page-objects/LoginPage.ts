import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Selectors
  private selectors = {
    emailInput: 'input[name="email"]',
    passwordInput: 'input[name="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '[data-testid="error-message"]',
    registerLink: 'a[href="/register"]',
    pageTitle: 'h1',
    formContainer: 'form',
  };

  constructor(page: Page) {
    super(page);
  }

  getPath(): string {
    return '/login';
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    await this.fillField(this.selectors.emailInput, email);
    await this.fillField(this.selectors.passwordInput, password);
    await this.clickElement(this.selectors.submitButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    return await this.isElementVisible(this.selectors.formContainer);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    await this.waitForElement(this.selectors.errorMessage);
    return await this.getElementText(this.selectors.errorMessage);
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.elementExists(this.selectors.errorMessage);
  }

  /**
   * Click register link
   */
  async clickRegisterLink() {
    await this.clickElement(this.selectors.registerLink);
  }

  /**
   * Check if email input has error
   */
  async hasEmailError(): Promise<boolean> {
    const emailInput = this.page.locator(this.selectors.emailInput);
    const ariaInvalid = await emailInput.getAttribute('aria-invalid');
    return ariaInvalid === 'true';
  }

  /**
   * Check if password input has error
   */
  async hasPasswordError(): Promise<boolean> {
    const passwordInput = this.page.locator(this.selectors.passwordInput);
    const ariaInvalid = await passwordInput.getAttribute('aria-invalid');
    return ariaInvalid === 'true';
  }

  /**
   * Clear form fields
   */
  async clearForm() {
    await this.page.locator(this.selectors.emailInput).clear();
    await this.page.locator(this.selectors.passwordInput).clear();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.submitButton);
    return await button.isEnabled();
  }

  /**
   * Wait for successful login (redirect to dashboard)
   */
  async waitForSuccessfulLogin() {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Get page title text
   */
  async getPageTitleText(): Promise<string> {
    return await this.getElementText(this.selectors.pageTitle);
  }
}