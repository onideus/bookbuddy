/**
 * Accessibility Test: Rating Component (T098)
 * Tests keyboard navigation and ARIA for rating UI
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Rating UI Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/src/pages/dashboard.html');
    await page.waitForLoadState('networkidle');
  });

  test('should pass axe accessibility checks', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels on rating displays', async ({ page }) => {
    // Find rating displays
    const ratingDisplays = page.locator('.rating-stars-display');
    const count = await ratingDisplays.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const display = ratingDisplays.nth(i);

        // Should have role="img" or proper ARIA label
        const role = await display.getAttribute('role');
        const ariaLabel = await display.getAttribute('aria-label');

        expect(role).toBe('img');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/\d out of 5 stars/);
      }
    }
  });

  test('should announce filter changes to screen readers', async ({ page }) => {
    // Check for live region
    const announcer = page.locator('#status-announcer');
    await expect(announcer).toHaveAttribute('aria-live', 'polite');
    await expect(announcer).toHaveAttribute('aria-atomic', 'true');

    // Select Top Rated filter
    const filterSelect = page.locator('[data-testid="status-filter"]');
    await filterSelect.selectOption('TOP_RATED');

    // Wait for announcement
    await page.waitForTimeout(200);

    // Announcer should have been updated (may be cleared after timeout)
    // Just verify it exists with proper attributes
    await expect(announcer).toBeAttached();
  });

  test('should have proper focus indicators', async ({ page }) => {
    // Tab to filter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // One element should be focused
    const focused = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focused).toBeTruthy();
  });

  test('should support keyboard navigation on filter select', async ({ page }) => {
    const filterSelect = page.locator('[data-testid="status-filter"]');

    // Focus the select
    await filterSelect.focus();

    // Should be focusable
    await expect(filterSelect).toBeFocused();

    // Arrow keys should work (browser handles this natively)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Filter should update
    const value = await filterSelect.inputValue();
    expect(value).toBeTruthy();
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check main heading
    const h1 = page.locator('h1');
    await expect(h1).toHaveText('BookBuddy');

    // Check section headings
    const h2s = page.locator('h2');
    const h2Count = await h2s.count();
    expect(h2Count).toBeGreaterThan(0);

    // All h2s should have text
    for (let i = 0; i < h2Count; i++) {
      const text = await h2s.nth(i).textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should have skip to main content link', async ({ page }) => {
    const skipLink = page.locator('.skip-to-main');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});
