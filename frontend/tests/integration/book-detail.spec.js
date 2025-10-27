/**
 * E2E tests for book detail page progress note form (T073)
 * Tests user interaction with progress tracking UI
 */

import { test, expect } from '@playwright/test';

test.describe('Book Detail Page - Progress Notes', () => {
  let testBookId;
  let testEntryId;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Add a test book in READING status
    await page.fill('[data-testid="book-title-input"]', 'The Hobbit');
    await page.fill('[data-testid="book-author-input"]', 'J.R.R. Tolkien');
    await page.selectOption('[data-testid="book-status-select"]', 'READING');
    await page.click('[data-testid="add-book-button"]');
    
    // Wait for book to appear
    await page.waitForSelector('[data-testid="book-card"]');
    
    // Click on the book to navigate to detail page
    await page.click('[data-testid="book-card"]:has-text("The Hobbit")');
    
    // Wait for book detail page to load
    await page.waitForSelector('[data-testid="book-detail-page"]');
  });

  test('should display progress note form', async ({ page }) => {
    // Verify form elements are present
    await expect(page.locator('[data-testid="progress-note-textarea"]')).toBeVisible();
    await expect(page.locator('[data-testid="page-chapter-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-progress-note-button"]')).toBeVisible();
  });

  test('should add a progress note with page marker', async ({ page }) => {
    // Fill in the progress note form
    await page.fill('[data-testid="progress-note-textarea"]', 'Finished Chapter 5. The plot is getting interesting!');
    await page.fill('[data-testid="page-chapter-input"]', 'Chapter 5');
    
    // Submit the form
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Wait for the note to appear in the timeline
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    // Verify the note content
    const noteItem = page.locator('[data-testid="progress-note-item"]').first();
    await expect(noteItem).toContainText('Finished Chapter 5');
    await expect(noteItem).toContainText('Chapter 5');
    
    // Verify form is cleared after submission
    await expect(page.locator('[data-testid="progress-note-textarea"]')).toHaveValue('');
    await expect(page.locator('[data-testid="page-chapter-input"]')).toHaveValue('');
  });

  test('should add a progress note without page marker', async ({ page }) => {
    // Fill in only the note text
    await page.fill('[data-testid="progress-note-textarea"]', 'Great character development in this section!');
    
    // Submit the form
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Wait for the note to appear
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    // Verify the note content
    const noteItem = page.locator('[data-testid="progress-note-item"]').first();
    await expect(noteItem).toContainText('Great character development');
  });

  test('should validate note length (max 1000 characters)', async ({ page }) => {
    // Fill in a note exceeding 1000 characters
    const longNote = 'a'.repeat(1001);
    await page.fill('[data-testid="progress-note-textarea"]', longNote);
    
    // Submit the form
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('1000 characters');
  });

  test('should validate page marker length (max 50 characters)', async ({ page }) => {
    // Fill in valid note and long page marker
    await page.fill('[data-testid="progress-note-textarea"]', 'Valid note text');
    const longMarker = 'a'.repeat(51);
    await page.fill('[data-testid="page-chapter-input"]', longMarker);
    
    // Submit the form
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('50 characters');
  });

  test('should require note text', async ({ page }) => {
    // Try to submit without filling in the note
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('required');
  });

  test('should display multiple progress notes in chronological order', async ({ page }) => {
    // Add first note
    await page.fill('[data-testid="progress-note-textarea"]', 'First note');
    await page.fill('[data-testid="page-chapter-input"]', 'Chapter 1');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    // Add second note
    await page.fill('[data-testid="progress-note-textarea"]', 'Second note');
    await page.fill('[data-testid="page-chapter-input"]', 'Chapter 2');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForTimeout(100); // Small delay for ordering
    
    // Add third note
    await page.fill('[data-testid="progress-note-textarea"]', 'Third note');
    await page.fill('[data-testid="page-chapter-input"]', 'Chapter 3');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForTimeout(100);
    
    // Verify all notes are displayed
    const noteItems = page.locator('[data-testid="progress-note-item"]');
    await expect(noteItems).toHaveCount(3);
    
    // Verify chronological order (newest first)
    await expect(noteItems.nth(0)).toContainText('Third note');
    await expect(noteItems.nth(1)).toContainText('Second note');
    await expect(noteItems.nth(2)).toContainText('First note');
  });

  test('should show loading state during submission', async ({ page }) => {
    // Fill in the form
    await page.fill('[data-testid="progress-note-textarea"]', 'Test note');
    
    // Click submit and immediately check for loading state
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Verify button is disabled during submission
    await expect(page.locator('[data-testid="add-progress-note-button"]')).toBeDisabled();
  });

  test('should handle submission errors gracefully', async ({ page }) => {
    // Simulate network error by intercepting the API call
    await page.route('**/api/reading-entries/*/progress-notes', route => {
      route.abort('failed');
    });
    
    // Fill in and submit the form
    await page.fill('[data-testid="progress-note-textarea"]', 'Test note');
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Verify form data is preserved
    await expect(page.locator('[data-testid="progress-note-textarea"]')).toHaveValue('Test note');
  });

  test('should support optimistic UI updates', async ({ page }) => {
    // Fill in the form
    await page.fill('[data-testid="progress-note-textarea"]', 'Optimistic update test');
    await page.fill('[data-testid="page-chapter-input"]', 'Page 100');
    
    // Submit the form
    await page.click('[data-testid="add-progress-note-button"]');
    
    // Note should appear immediately (optimistic UI)
    const noteItem = page.locator('[data-testid="progress-note-item"]').first();
    await expect(noteItem).toContainText('Optimistic update test');
  });

  test('should display timestamps for progress notes', async ({ page }) => {
    // Add a note
    await page.fill('[data-testid="progress-note-textarea"]', 'Test note with timestamp');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    // Verify timestamp is displayed
    const noteItem = page.locator('[data-testid="progress-note-item"]').first();
    await expect(noteItem.locator('[data-testid="progress-note-timestamp"]')).toBeVisible();
  });

  test('should display book information on detail page', async ({ page }) => {
    // Verify book title and author are displayed
    await expect(page.locator('[data-testid="book-title"]')).toContainText('The Hobbit');
    await expect(page.locator('[data-testid="book-author"]')).toContainText('J.R.R. Tolkien');
    
    // Verify status is displayed
    await expect(page.locator('[data-testid="book-status"]')).toContainText('READING');
  });

  test('should handle empty progress timeline', async ({ page }) => {
    // When page loads with no notes, should show empty state
    const emptyState = page.locator('[data-testid="empty-progress-state"]');
    
    // Verify empty state message is shown
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No progress notes yet');
  });
});
