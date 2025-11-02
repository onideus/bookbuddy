import { chromium, FullConfig } from '@playwright/test';
import { DatabaseHelper } from './helpers/database';
import { faker } from '@faker-js/faker';

/**
 * Global setup for Playwright tests
 * Creates a test user and saves authenticated state
 */
async function globalSetup(config: FullConfig) {
  console.log('Starting global setup...');

  const { baseURL } = config.projects[0].use;

  // Create a test user for authenticated tests
  const testUser = await DatabaseHelper.createTestUser({
    email: 'test-user@booktracker.test',
    password: 'Test123!@#',
    name: 'Test User',
  });

  console.log(`Created test user: ${testUser.email}`);

  // Launch browser and create authenticated state
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('Successfully authenticated test user');

    // Save authenticated state
    await context.storageState({ path: 'e2e/.auth/user.json' });

    console.log('Saved authenticated state');
  } catch (error) {
    console.error('Failed to create authenticated state:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('Global setup complete');
}

export default globalSetup;