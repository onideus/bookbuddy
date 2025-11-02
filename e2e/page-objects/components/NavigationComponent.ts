import { Page, Locator } from '@playwright/test';

export class NavigationComponent {
  private page: Page;

  private selectors = {
    navbar: 'nav',
    dashboardLink: 'a[href="/dashboard"]',
    booksLink: 'a[href="/books"]',
    searchLink: 'a[href="/search"]',
    goalsLink: 'a[href="/goals"]',
    userMenu: '[data-testid="user-menu"]',
    userMenuButton: '[data-testid="user-menu-button"]',
    logoutButton: 'button:has-text("Logout"), button:has-text("Sign out")',
    profileLink: 'a[href="/profile"]',
    settingsLink: 'a[href="/settings"]',
    mobileMenuButton: 'button[aria-label="Menu"], button[aria-label="Open menu"]',
    mobileMenu: '[data-testid="mobile-menu"]',
    logo: 'a[href="/"]',
    navLinks: 'nav a',
  };

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to dashboard
   */
  async goToDashboard() {
    await this.page.locator(this.selectors.dashboardLink).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to books page
   */
  async goToBooks() {
    await this.page.locator(this.selectors.booksLink).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to search page
   */
  async goToSearch() {
    await this.page.locator(this.selectors.searchLink).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to goals page
   */
  async goToGoals() {
    await this.page.locator(this.selectors.goalsLink).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Logout
   */
  async logout() {
    // Try to find and click user menu button first
    const userMenuButton = this.page.locator(this.selectors.userMenuButton);
    const menuButtonExists = await userMenuButton.count();

    if (menuButtonExists > 0) {
      await userMenuButton.click();
      await this.page.waitForTimeout(500); // Wait for menu to open
    }

    // Click logout button
    const logoutButton = this.page.locator(this.selectors.logoutButton);
    await logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if navigation is visible
   */
  async isNavigationVisible(): Promise<boolean> {
    const navbar = this.page.locator(this.selectors.navbar);
    return await navbar.isVisible();
  }

  /**
   * Check if user is logged in (user menu visible)
   */
  async isUserLoggedIn(): Promise<boolean> {
    const userMenu = this.page.locator(this.selectors.userMenu);
    const userMenuButton = this.page.locator(this.selectors.userMenuButton);

    const userMenuCount = await userMenu.count();
    const userMenuButtonCount = await userMenuButton.count();

    return userMenuCount > 0 || userMenuButtonCount > 0;
  }

  /**
   * Get current active link
   */
  async getCurrentActiveLink(): Promise<string | null> {
    const activeLink = this.page.locator('nav a[aria-current="page"]');
    const exists = await activeLink.count();

    if (exists > 0) {
      return await activeLink.getAttribute('href');
    }

    return null;
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu() {
    const mobileMenuButton = this.page.locator(this.selectors.mobileMenuButton);
    const exists = await mobileMenuButton.count();

    if (exists > 0 && await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await this.page.waitForTimeout(500); // Wait for animation
    }
  }

  /**
   * Close mobile menu
   */
  async closeMobileMenu() {
    // Usually clicking the button again closes it
    const mobileMenuButton = this.page.locator(this.selectors.mobileMenuButton);
    const exists = await mobileMenuButton.count();

    if (exists > 0 && await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await this.page.waitForTimeout(500); // Wait for animation
    }
  }

  /**
   * Check if mobile menu is open
   */
  async isMobileMenuOpen(): Promise<boolean> {
    const mobileMenu = this.page.locator(this.selectors.mobileMenu);
    const exists = await mobileMenu.count();

    if (exists > 0) {
      return await mobileMenu.isVisible();
    }

    return false;
  }

  /**
   * Click logo to go home
   */
  async clickLogo() {
    await this.page.locator(this.selectors.logo).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get all navigation links
   */
  async getAllNavigationLinks(): Promise<string[]> {
    const links: string[] = [];
    const navLinks = this.page.locator(this.selectors.navLinks);
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      if (href) {
        links.push(href);
      }
    }

    return links;
  }

  /**
   * Check if link is visible in navigation
   */
  async isLinkVisible(href: string): Promise<boolean> {
    const link = this.page.locator(`nav a[href="${href}"]`);
    const count = await link.count();

    if (count > 0) {
      return await link.isVisible();
    }

    return false;
  }

  /**
   * Get user display name from navigation
   */
  async getUserDisplayName(): Promise<string | null> {
    const userMenu = this.page.locator('[data-testid="user-menu-button"]');
    const exists = await userMenu.count();

    if (exists > 0) {
      return await userMenu.textContent();
    }

    return null;
  }
}