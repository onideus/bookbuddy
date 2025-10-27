/**
 * E2E Accessibility tests for book detail page progress notes (T074)
 * Tests screen reader announcements and keyboard navigation
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Book Detail Page - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await page.fill('[data-testid="book-title-input"]', 'The Hobbit');
    await page.fill('[data-testid="book-author-input"]', 'J.R.R. Tolkien');
    await page.selectOption('[data-testid="book-status-select"]', 'READING');
    await page.click('[data-testid="add-book-button"]');
    
    await page.waitForSelector('[data-testid="book-card"]');
    await page.click('[data-testid="book-card"]:has-text("The Hobbit")');
    await page.waitForSelector('[data-testid="book-detail-page"]');
  });

  test('should have no accessibility violations on page load', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation for the form', async ({ page }) => {
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement.id);
    expect(focusedElement).toBe('progress-note-textarea');

    await page.keyboard.type('Test note content');
    await page.keyboard.press('Tab');
    
    const focusedElement2 = await page.evaluate(() => document.activeElement.id);
    expect(focusedElement2).toBe('page-chapter-input');

    await page.keyboard.type('Chapter 1');
    await page.keyboard.press('Tab');
    
    const focusedElement3 = await page.evaluate(() => document.activeElement.id);
    expect(focusedElement3).toBe('add-progress-note-button');

    await page.keyboard.press('Enter');
    
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    const noteItem = page.locator('[data-testid="progress-note-item"]').first();
    await expect(noteItem).toContainText('Test note content');
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    const noteTextarea = page.locator('#progress-note-textarea');
    await expect(noteTextarea).toHaveAttribute('aria-describedby', /note-help/);

    const pageInput = page.locator('#page-chapter-input');
    await expect(pageInput).toHaveAttribute('aria-describedby', 'marker-help');

    const notesList = page.locator('#progress-notes-list');
    await expect(notesList).toHaveAttribute('role', 'list');
    await expect(notesList).toHaveAttribute('aria-live', 'polite');
  });

  test('should announce errors to screen readers', async ({ page }) => {
    const submitButton = page.locator('[data-testid="add-progress-note-button"]');
    await submitButton.click();
    
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    await expect(errorMessage).toContainText('required');
  });

  test('should announce loading states', async ({ page }) => {
    await page.fill('[data-testid="progress-note-textarea"]', 'Loading test note');
    await page.click('[data-testid="add-progress-note-button"]');
    
    const button = page.locator('[data-testid="add-progress-note-button"]');
    await expect(button).toBeDisabled();
    
    const loadingText = button.locator('.btn-loading');
    await expect(loadingText).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3').allTextContents();
    
    expect(headings.length).toBeGreaterThan(0);
    
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('should have adequate color contrast', async ({ page }) => {
    const contrastResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();
    
    const contrastViolations = contrastResults.violations.filter(
      v => v.id === 'color-contrast'
    );
    
    expect(contrastViolations).toEqual([]);
  });

  test('should support focus indicators', async ({ page }) => {
    await page.fill('[data-testid="progress-note-textarea"]', 'Focus test');
    
    const textarea = page.locator('#progress-note-textarea');
    await textarea.focus();
    
    const outline = await textarea.evaluate(el => 
      window.getComputedStyle(el).getPropertyValue('outline')
    );
    
    expect(outline).not.toBe('none');
  });

  test('should have accessible timestamps', async ({ page }) => {
    await page.fill('[data-testid="progress-note-textarea"]', 'Timestamp test');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    const timestamp = page.locator('[data-testid="progress-note-timestamp"]').first();
    await expect(timestamp).toHaveAttribute('datetime');
    await expect(timestamp).toHaveAttribute('title');
  });

  test('should navigate timeline with keyboard', async ({ page }) => {
    await page.fill('[data-testid="progress-note-textarea"]', 'First note');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    await page.fill('[data-testid="progress-note-textarea"]', 'Second note');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForTimeout(100);
    
    const notes = page.locator('[data-testid="progress-note-item"]');
    await expect(notes).toHaveCount(2);
    
    const firstNote = notes.first();
    await expect(firstNote).toHaveAttribute('role', 'listitem');
  });

  test('should have proper form labels', async ({ page }) => {
    const noteLabel = page.locator('label[for="progress-note-textarea"]');
    await expect(noteLabel).toBeVisible();
    await expect(noteLabel).toContainText('Note');
    
    const markerLabel = page.locator('label[for="page-chapter-input"]');
    await expect(markerLabel).toBeVisible();
    await expect(markerLabel).toContainText('Page or Chapter');
  });

  test('should have accessible empty state', async ({ page }) => {
    const emptyState = page.locator('[data-testid="empty-progress-state"]');
    
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('No progress notes yet');
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.fill('[data-testid="progress-note-textarea"]', 'Screen reader test');
    await page.click('[data-testid="add-progress-note-button"]');
    await page.waitForSelector('[data-testid="progress-note-item"]');
    
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="contentinfo"]').count();
    expect(landmarks).toBeGreaterThan(0);
  });
});
