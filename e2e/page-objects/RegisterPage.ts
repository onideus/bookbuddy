import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  // Selectors
  private selectors = {
    nameInput: 'input[name="name"]',
    emailInput: 'input[name="email"]',
    passwordInput: 'input[name="password"]',
    confirmPasswordInput: 'input[name="confirmPassword"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '[data-testid="error-message"]',
    loginLink: 'a[href="/login"]',
    pageTitle: 'h1',
    formContainer: 'form',
    successMessage: '[data-testid="success-message"]',
  };

  constructor(page: Page) {
    super(page);
  }

  getPath(): string {
    return '/register';
  }

  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string, confirmPassword?: string) {
    await this.fillField(this.selectors.nameInput, name);
    await this.fillField(this.selectors.emailInput, email);
    await this.fillField(this.selectors.passwordInput, password);
    await this.fillField(this.selectors.confirmPasswordInput, confirmPassword || password);
    await this.clickElement(this.selectors.submitButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if registration form is visible
   */
  async isRegistrationFormVisible(): Promise<boolean> {
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
   * Click login link
   */
  async clickLoginLink() {
    await this.clickElement(this.selectors.loginLink);
  }

  /**
   * Check if name input has error
   */
  async hasNameError(): Promise<boolean> {
    const nameInput = this.page.locator(this.selectors.nameInput);
    const ariaInvalid = await nameInput.getAttribute('aria-invalid');
    return ariaInvalid === 'true';
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
   * Check if confirm password input has error
   */
  async hasConfirmPasswordError(): Promise<boolean> {
    const confirmPasswordInput = this.page.locator(this.selectors.confirmPasswordInput);
    const ariaInvalid = await confirmPasswordInput.getAttribute('aria-invalid');
    return ariaInvalid === 'true';
  }

  /**
   * Clear form fields
   */
  async clearForm() {
    await this.page.locator(this.selectors.nameInput).clear();
    await this.page.locator(this.selectors.emailInput).clear();
    await this.page.locator(this.selectors.passwordInput).clear();
    await this.page.locator(this.selectors.confirmPasswordInput).clear();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.submitButton);
    return await button.isEnabled();
  }

  /**
   * Wait for successful registration (redirect to login or dashboard)
   */
  async waitForSuccessfulRegistration() {
    await Promise.race([
      this.page.waitForURL('/login', { timeout: 10000 }),
      this.page.waitForURL('/dashboard', { timeout: 10000 }),
    ]);
  }

  /**
   * Get page title text
   */
  async getPageTitleText(): Promise<string> {
    return await this.getElementText(this.selectors.pageTitle);
  }

  /**
   * Check password strength indicator
   */
  async getPasswordStrength(): Promise<string> {
    const strengthIndicator = this.page.locator('[data-testid="password-strength"]');
    const exists = await strengthIndicator.count();
    if (exists > 0) {
      return await strengthIndicator.textContent() || '';
    }
    return '';
  }
}