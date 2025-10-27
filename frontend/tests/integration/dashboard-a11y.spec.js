/**
 * E2E accessibility test for dashboard (T041)
 * Tests keyboard navigation and screen reader announcements
 * WCAG 2.1 AA compliance validation
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Dashboard - Accessibility (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not have any automatically detectable WCAG 2.1 AA violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1); // Only one h1 per page

    // Verify heading structure
    const h1 = page.locator('h1');
    await expect(h1).toContainText(/bookbuddy|reading/i);

    // Status section headings should be h2
    const statusHeadings = page.locator('h2');
    await expect(statusHeadings.nth(0)).toContainText(/to read/i);
    await expect(statusHeadings.nth(1)).toContainText(/reading/i);
    await expect(statusHeadings.nth(2)).toContainText(/finished/i);
  });

  test('should have proper ARIA labels for all status sections', async ({ page }) => {
    const toReadSection = page.locator('[data-testid="status-section-to-read"]');
    const readingSection = page.locator('[data-testid="status-section-reading"]');
    const finishedSection = page.locator('[data-testid="status-section-finished"]');

    await expect(toReadSection).toHaveAttribute('aria-label', /to read/i);
    await expect(readingSection).toHaveAttribute('aria-label', /reading/i);
    await expect(finishedSection).toHaveAttribute('aria-label', /finished/i);
  });

  test('should support keyboard navigation for all interactive elements', async ({ page }) => {
    // Focus on add book button
    await page.keyboard.press('Tab');
    const addButton = page.getByRole('button', { name: /add book/i });
    await expect(addButton).toBeFocused();

    // Verify focus indicator is visible
    const focusRing = await addButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.getPropertyValue('box-shadow') || styles.getPropertyValue('outline');
    });
    expect(focusRing).toBeTruthy();

    // Open form with Enter key
    await page.keyboard.press('Enter');

    // Navigate through form fields
    await page.keyboard.press('Tab');
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toBeFocused();

    await page.keyboard.press('Tab');
    const authorInput = page.getByLabel(/author/i);
    await expect(authorInput).toBeFocused();
  });

  test('should announce status filter changes to screen readers', async ({ page }) => {
    const statusFilter = page.locator('[data-testid="status-filter"]');

    // Verify ARIA live region exists
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();

    // Change filter
    await statusFilter.selectOption('READING');

    // Verify announcement in live region
    await expect(liveRegion).toContainText(/showing.*reading/i);
  });

  test('should have accessible book cards with proper semantics', async ({ page }) => {
    // When books exist, verify:
    // - Each book card is a <article> or has role="article"
    // - Book title is a heading
    // - Action buttons have accessible names
    // - Focus order is logical

    const bookCards = page.locator('[data-testid="book-card"]');
    if ((await bookCards.count()) > 0) {
      const firstCard = bookCards.first();

      // Should be semantic article
      const tagName = await firstCard.evaluate((el) => el.tagName.toLowerCase());
      const role = await firstCard.getAttribute('role');
      expect(tagName === 'article' || role === 'article').toBe(true);

      // Title should be a heading
      const title = firstCard.locator('h3, h4');
      await expect(title).toBeVisible();

      // Action buttons should have accessible names
      const actionButtons = firstCard.locator('button');
      for (let i = 0; i < (await actionButtons.count()); i++) {
        const button = actionButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(ariaLabel || text).toBeTruthy();
      }
    }
  });

  test('should support skip to main content link', async ({ page }) => {
    // Press Tab to focus skip link
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /skip to main/i });
    await expect(skipLink).toBeFocused();

    // Activate skip link
    await page.keyboard.press('Enter');

    // Main content should be focused
    const main = page.locator('main');
    await expect(main).toBeFocused();
  });

  test('should have sufficient color contrast (WCAG AA: 4.5:1)', async ({ page }) => {
    // This is checked by axe, but we can also do manual checks for key elements
    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[data-testid="status-section-to-read"]')
      .include('[data-testid="status-section-reading"]')
      .include('[data-testid="status-section-finished"]')
      .analyze();

    const contrastViolations = scanResults.violations.filter((v) =>
      v.id.includes('color-contrast')
    );
    expect(contrastViolations).toEqual([]);
  });

  test('should have form labels properly associated with inputs', async ({ page }) => {
    await page.getByRole('button', { name: /add book/i }).click();

    // Verify label associations
    const titleInput = page.getByLabel(/title/i);
    const authorInput = page.getByLabel(/author/i);
    const editionInput = page.getByLabel(/edition/i);

    await expect(titleInput).toHaveAttribute('id');
    await expect(authorInput).toHaveAttribute('id');
    await expect(editionInput).toHaveAttribute('id');

    // Verify clicking label focuses input
    await page.getByText(/title/i, { exact: false }).click();
    await expect(titleInput).toBeFocused();
  });

  test('should show error messages with proper ARIA attributes', async ({ page }) => {
    await page.getByRole('button', { name: /add book/i }).click();

    // Submit without filling fields
    await page.getByRole('button', { name: /save|add/i }).click();

    const titleInput = page.getByLabel(/title/i);

    // Verify error message association
    const errorMessageId = await titleInput.getAttribute('aria-describedby');
    expect(errorMessageId).toBeTruthy();

    const errorMessage = page.locator(`#${errorMessageId}`);
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/required/i);

    // Verify invalid state
    await expect(titleInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should support reduced motion preference', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Reload page
    await page.reload();

    // Verify no animations or transitions
    const transitionDuration = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="book-card"]');
      if (!el) {
        return null;
      }
      return window.getComputedStyle(el).transitionDuration;
    });

    // Transition duration should be 0s or very short (< 10ms)
    if (transitionDuration !== null) {
      const durationMs = parseFloat(transitionDuration) * 1000;
      expect(durationMs).toBeLessThan(10);
    }
  });

  test('should have minimum touch target size (44x44px)', async ({ page }) => {
    // WCAG 2.1 AA requires minimum 44x44px touch targets
    const buttons = page.locator('button');

    for (let i = 0; i < (await buttons.count()); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should announce loading states to screen readers', async ({ page }) => {
    // Verify loading indicator has proper ARIA
    const loadingIndicator = page.locator('[data-testid="loading"]');

    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toHaveAttribute('role', 'status');
      await expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
      await expect(loadingIndicator).toContainText(/loading/i);
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

    // Reload page
    await page.reload();

    // Verify no WCAG violations in high contrast mode
    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(scanResults.violations).toEqual([]);
  });
});

test.describe('Dashboard - Screen Reader Experience', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto('/dashboard.html');

    await expect(page).toHaveTitle(/bookbuddy.*dashboard|reading.*dashboard/i);
  });

  test('should announce book count changes', async ({ page }) => {
    await page.goto('/dashboard.html');

    const liveRegion = page.locator('[aria-live="polite"]');

    // When books are added, verify count is announced
    // This will be testable once we can add books via UI
  });

  test('should have landmark regions', async ({ page }) => {
    await page.goto('/dashboard.html');

    // Verify semantic landmarks exist
    const header = page.locator('header');
    const main = page.locator('main');
    const nav = page.locator('nav');

    await expect(header).toBeVisible();
    await expect(main).toBeVisible();

    // Navigation should exist if present
    if ((await nav.count()) > 0) {
      await expect(nav).toHaveAttribute('aria-label');
    }
  });
});
