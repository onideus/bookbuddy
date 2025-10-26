/**
 * E2E test for dashboard rendering with books in all three statuses (T040)
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard - Reading Entries', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard.html');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should render dashboard with three status sections', async ({ page }) => {
    // Verify all three status sections are present
    const toReadSection = page.locator('[data-testid="status-section-to-read"]');
    const readingSection = page.locator('[data-testid="status-section-reading"]');
    const finishedSection = page.locator('[data-testid="status-section-finished"]');

    await expect(toReadSection).toBeVisible();
    await expect(readingSection).toBeVisible();
    await expect(finishedSection).toBeVisible();

    // Verify section headings
    await expect(page.getByRole('heading', { name: 'To Read' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Finished' })).toBeVisible();
  });

  test('should display books in correct status sections', async ({ page }) => {
    // Mock API responses or use seeded test data
    // For now, test with empty state

    const toReadList = page.locator('[data-testid="book-list-to-read"]');
    const readingList = page.locator('[data-testid="book-list-reading"]');
    const finishedList = page.locator('[data-testid="book-list-finished"]');

    // All lists should be present
    await expect(toReadList).toBeVisible();
    await expect(readingList).toBeVisible();
    await expect(finishedList).toBeVisible();
  });

  test('should show add book form', async ({ page }) => {
    const addBookButton = page.getByRole('button', { name: /add book/i });
    await expect(addBookButton).toBeVisible();

    // Click to show form
    await addBookButton.click();

    const titleInput = page.getByLabel(/title/i);
    const authorInput = page.getByLabel(/author/i);
    const submitButton = page.getByRole('button', { name: /save|add/i });

    await expect(titleInput).toBeVisible();
    await expect(authorInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should filter books by status', async ({ page }) => {
    // Test status filter functionality
    const statusFilter = page.locator('[data-testid="status-filter"]');
    await expect(statusFilter).toBeVisible();

    // Select READING filter
    await statusFilter.selectOption('READING');

    // Verify only READING section is visible or highlighted
    // (Implementation depends on actual filter behavior)
  });

  test('should display book cards with required information', async ({ page }) => {
    // When books exist, verify they show:
    // - Title
    // - Author
    // - Edition (if present)
    // - Status indicator
    // - Action buttons

    // This will be fully testable once we have sample data
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Test empty state messages
    const toReadSection = page.locator('[data-testid="status-section-to-read"]');

    // Should show empty state message if no books
    // await expect(toReadSection.getByText(/no books/i)).toBeVisible();
  });

  test('should support moving books between statuses via drag-drop or buttons', async ({ page }) => {
    // Test status transition UI
    // This will be implemented based on actual UI design
  });
});

test.describe('Dashboard - Add Book Flow', () => {
  test('should add a new book successfully', async ({ page }) => {
    await page.goto('/dashboard.html');

    // Open add book form
    await page.getByRole('button', { name: /add book/i }).click();

    // Fill in book details
    await page.getByLabel(/title/i).fill('The Invisible Library');
    await page.getByLabel(/author/i).fill('Genevieve Cogman');
    await page.getByLabel(/edition/i).fill('1st Edition');

    // Select status
    await page.getByLabel(/status/i).selectOption('TO_READ');

    // Submit form
    await page.getByRole('button', { name: /save|add/i }).click();

    // Verify book appears in TO_READ section
    const toReadList = page.locator('[data-testid="book-list-to-read"]');
    await expect(toReadList.getByText('The Invisible Library')).toBeVisible();
    await expect(toReadList.getByText('Genevieve Cogman')).toBeVisible();
  });

  test('should show validation errors for missing required fields', async ({ page }) => {
    await page.goto('/dashboard.html');

    await page.getByRole('button', { name: /add book/i }).click();

    // Submit without filling required fields
    await page.getByRole('button', { name: /save|add/i }).click();

    // Verify error messages
    await expect(page.getByText(/title is required/i)).toBeVisible();
    await expect(page.getByText(/author is required/i)).toBeVisible();
  });

  test('should show error for duplicate books', async ({ page }) => {
    await page.goto('/dashboard.html');

    // Add first book
    await page.getByRole('button', { name: /add book/i }).click();
    await page.getByLabel(/title/i).fill('Duplicate Test');
    await page.getByLabel(/author/i).fill('Test Author');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for success
    await page.waitForTimeout(500);

    // Attempt to add same book again
    await page.getByRole('button', { name: /add book/i }).click();
    await page.getByLabel(/title/i).fill('Duplicate Test');
    await page.getByLabel(/author/i).fill('Test Author');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Verify error message
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test('should display correlation ID on errors', async ({ page }) => {
    // Test that errors include correlation IDs for debugging (FR-017)
    // This will be testable once error handling is implemented
  });
});
