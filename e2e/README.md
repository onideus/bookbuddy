# BookTracker E2E Tests

This directory contains comprehensive end-to-end tests for the BookTracker application using Playwright.

## Overview

The test suite covers all critical user flows:
- **Authentication**: Registration, login, session management
- **Book Management**: Search, add, track progress, rate, filter, delete
- **Reading Goals**: Create, view, update, delete, progress tracking
- **Dashboard**: Statistics, currently reading, active goals
- **Mobile Responsiveness**: All features tested across mobile viewports

## Project Structure

```
e2e/
├── tests/                  # Test specifications
│   ├── auth.unauth.spec.ts    # Authentication tests
│   ├── books.spec.ts          # Book management tests
│   ├── goals.spec.ts          # Reading goals tests
│   ├── dashboard.spec.ts      # Dashboard tests
│   └── mobile.spec.ts         # Mobile responsiveness tests
├── page-objects/          # Page Object Models
│   ├── BasePage.ts           # Base class for all pages
│   ├── LoginPage.ts          # Login page POM
│   ├── RegisterPage.ts       # Registration page POM
│   ├── DashboardPage.ts      # Dashboard page POM
│   ├── BooksPage.ts          # Books page POM
│   ├── SearchPage.ts         # Search page POM
│   ├── GoalsPage.ts          # Goals page POM
│   └── components/           # Reusable components
│       └── NavigationComponent.ts
├── fixtures/              # Test fixtures
│   └── test-fixtures.ts      # Custom fixtures and helpers
├── helpers/               # Helper utilities
│   └── database.ts           # Database helper for test data
├── .auth/                 # Stored authentication state
│   └── user.json             # Authenticated user session
└── global-setup.ts        # Global setup for all tests
```

## Prerequisites

1. **Node.js** (v20 or higher)
2. **PostgreSQL** (v15 or higher)
3. **Environment Variables** - Create a `.env` file with:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/booktracker_test"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   ```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Set up test database:
   ```bash
   # Create test database
   createdb booktracker_test

   # Run migrations
   npx prisma migrate deploy
   ```

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Tests
```bash
npm run test:e2e:debug
```

### Run Tests for Specific Browser
```bash
# Chromium
npm run test:e2e:chromium

# Firefox
npm run test:e2e:firefox

# WebKit (Safari)
npm run test:e2e:webkit
```

### Run Mobile Tests
```bash
npm run test:e2e:mobile
```

### Run Specific Test File
```bash
npx playwright test e2e/tests/auth.unauth.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test -g "should login"
```

### View Test Report
```bash
npm run test:e2e:report
```

## Test Configuration

Tests are configured in `playwright.config.ts` with:

- **Multiple Browsers**: Chromium, Firefox, WebKit
- **Mobile Devices**: Mobile Chrome, Mobile Safari
- **Parallel Execution**: Tests run in parallel for speed
- **Retries**: 2 retries on CI, 0 locally
- **Timeouts**: 15s action timeout, 30s navigation timeout
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Captured on first retry

## Page Object Model (POM)

Tests use the Page Object Model pattern for maintainability:

```typescript
// Example: Using LoginPage POM
test('should login successfully', async ({ loginPage, testUser }) => {
  await loginPage.goto();
  await loginPage.login(testUser.email, testUser.password);
  await expect(page).toHaveURL('/dashboard');
});
```

### Available Page Objects
- `LoginPage`: Login functionality
- `RegisterPage`: Registration functionality
- `DashboardPage`: Dashboard interactions
- `BooksPage`: Book management
- `SearchPage`: Book search
- `GoalsPage`: Goals management
- `NavigationComponent`: Navigation menu

## Test Fixtures

Custom fixtures provide reusable test setup:

```typescript
// testUser - Automatically creates and cleans up a test user
test('example', async ({ testUser }) => {
  // testUser.email, testUser.password, testUser.name available
});

// authenticatedPage - Automatically logs in before test
test('example', async ({ authenticatedPage }) => {
  // User is already logged in
});

// Page objects available as fixtures
test('example', async ({ loginPage, dashboardPage, booksPage }) => {
  // Use page objects directly
});
```

## Database Helpers

The `DatabaseHelper` class provides utilities for test data:

```typescript
import { DatabaseHelper } from '../helpers/database';

// Create test user
const user = await DatabaseHelper.createTestUser({
  email: 'test@example.com',
  password: 'password123',
});

// Create test book
await DatabaseHelper.createTestBook(userId, {
  title: 'Test Book',
  status: 'reading',
  currentPage: 100,
  pageCount: 300,
});

// Create test goal
await DatabaseHelper.createTestGoal(userId, {
  title: 'Read 10 books',
  targetBooks: 10,
});

// Cleanup
await DatabaseHelper.cleanupTestUser(email);
```

## CI/CD Integration

Tests are configured to run in GitHub Actions on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The CI workflow:
1. Sets up PostgreSQL database
2. Installs dependencies
3. Runs database migrations
4. Builds the application
5. Runs all Playwright tests
6. Uploads test reports and artifacts

### Viewing CI Results

After a CI run:
- Test reports are uploaded as artifacts
- Screenshots/videos of failures are available
- Test results are commented on PRs

## Best Practices

### Writing Tests

1. **Use Page Objects**: Don't interact with selectors directly in tests
2. **Use Test Fixtures**: Leverage `testUser` and `authenticatedPage` fixtures
3. **Clean Up**: Tests automatically clean up created data
4. **Wait Properly**: Use `waitForLoadState('networkidle')` for API calls
5. **Use Data-TestId**: Prefer `data-testid` selectors for stability

### Example Test Structure

```typescript
import { test, expect } from '../fixtures/test-fixtures';
import { DatabaseHelper } from '../helpers/database';

test.describe('Feature Name', () => {
  test('should perform action', async ({
    page,
    authenticatedPage,
    testUser,
    booksPage
  }) => {
    // Arrange - Set up test data
    await DatabaseHelper.createTestBook(testUser.id!, {
      title: 'Test Book',
      status: 'reading',
    });

    // Act - Perform actions
    await booksPage.goto();
    await booksPage.updateReadingProgress('Test Book', 100);

    // Assert - Verify results
    const progress = await booksPage.getBookProgress('Test Book');
    expect(progress?.current).toBe(100);
  });
});
```

### Debugging Tests

1. **Use UI Mode**: `npm run test:e2e:ui` for interactive debugging
2. **Use Debug Mode**: `npm run test:e2e:debug` to step through tests
3. **Take Screenshots**: Use `await page.screenshot()` in tests
4. **Use Traces**: Review traces in the HTML report
5. **Console Logs**: Check browser console in headed mode

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
echo $DATABASE_URL

# Reset test database
dropdb booktracker_test && createdb booktracker_test
npx prisma migrate deploy
```

### Test Failures
1. Check if app is running: `npm run dev`
2. Verify database migrations: `npx prisma migrate status`
3. Clear test data: `npx prisma db push --force-reset`
4. Update Playwright: `npx playwright install`

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Coverage

Current test coverage includes:

- ✅ User registration and validation
- ✅ User login and session management
- ✅ Protected route access
- ✅ Book search via Google Books API
- ✅ Add books with different statuses
- ✅ Update reading progress
- ✅ Mark books as read
- ✅ Rate books (1-5 stars)
- ✅ Filter books by status
- ✅ Delete books
- ✅ Create reading goals
- ✅ View goal progress
- ✅ Edit goals
- ✅ Delete goals
- ✅ Goal auto-completion
- ✅ Dashboard statistics
- ✅ Currently reading display
- ✅ Active goals display
- ✅ Mobile navigation
- ✅ Mobile forms and modals
- ✅ Multiple device viewports

## Contributing

When adding new features:

1. Add corresponding page object methods
2. Create test specs in `e2e/tests/`
3. Use existing patterns and fixtures
4. Ensure tests pass in all browsers
5. Test mobile responsiveness
6. Update this README if needed

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)