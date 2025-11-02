import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Global setup file */
  globalSetup: require.resolve('./e2e/global-setup'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [
    ['blob'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ] : [
    ['html', { open: 'on-failure' }],
    ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    /* Video on failure for debugging */
    video: 'retain-on-failure',
    /* Action timeout */
    actionTimeout: 15000,
    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },

    {
      name: 'firefox',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
    },

    {
      name: 'webkit',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
    },
    {
      name: 'Mobile Safari',
      dependencies: ['setup'],
      use: {
        ...devices['iPhone 12'],
        storageState: 'e2e/.auth/user.json',
      },
    },

    /* Test without authentication */
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});