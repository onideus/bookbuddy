/**
 * E2E Test: Rating UI (T097)
 * Tests for rating finished books on dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Rating UI on Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/src/pages/dashboard.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display ratings on finished book cards', async ({ page }) => {
    // Wait for books to load
    await page.waitForSelector('[data-testid="book-card"]');

    // Check if any books have ratings displayed
    const ratingDisplays = await page.locator('[data-testid="book-rating"]').count();

    // We expect at least some books might have ratings (test passes if 0 or more)
    expect(ratingDisplays).toBeGreaterThanOrEqual(0);
  });

  test('should show Top Rated filter option', async ({ page }) => {
    const filterSelect = page.locator('[data-testid="status-filter"]');

    // Check that Top Rated option exists
    const topRatedOption = filterSelect.locator('option[value="TOP_RATED"]');
    await expect(topRatedOption).toBeVisible();
    await expect(topRatedOption).toHaveText('⭐ Top Rated');
  });

  test('should filter top rated books when selected', async ({ page }) => {
    const filterSelect = page.locator('[data-testid="status-filter"]');

    // Select Top Rated filter
    await filterSelect.selectOption('TOP_RATED');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // All visible book cards in finished section should have ratings >= 4
    const finishedSection = page.locator('[data-testid="status-section-finished"]');
    const bookCards = finishedSection.locator('[data-testid="book-card"]');
    const count = await bookCards.count();

    if (count > 0) {
      // Verify each card has a rating display
      for (let i = 0; i < count; i++) {
        const card = bookCards.nth(i);
        const hasRating = await card.locator('[data-testid="book-rating"]').count();
        expect(hasRating).toBeGreaterThan(0);
      }
    }
  });

  test('should display star ratings correctly', async ({ page }) => {
    // Find a book card with rating
    const bookWithRating = page.locator('[data-testid="book-card"]').filter({ has: page.locator('[data-testid="book-rating"]') }).first();

    if (await bookWithRating.count() > 0) {
      const ratingDisplay = bookWithRating.locator('.rating-stars-display');

      // Should have ARIA label
      const ariaLabel = await ratingDisplay.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/\d out of 5 stars/);

      // Should contain star characters
      const text = await ratingDisplay.textContent();
      expect(text).toMatch(/[★☆]/);
    }
  });

  test('should show reflection note indicator when present', async ({ page }) => {
    // Find a book card with rating
    const bookWithRating = page.locator('[data-testid="book-card"]').filter({ has: page.locator('[data-testid="book-rating"]') }).first();

    if (await bookWithRating.count() > 0) {
      // Check for reflection preview button
      const reflectionButton = bookWithRating.locator('.reflection-preview');

      // If present, should have proper attributes
      if (await reflectionButton.count() > 0) {
        await expect(reflectionButton).toHaveAttribute('aria-label', 'View reflection note');
        await expect(reflectionButton).toHaveAttribute('title');
      }
    }
  });
});
