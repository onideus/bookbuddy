# BookTracker E2E Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install
```

### 2. Set Up Test Database
```bash
# Create test database
createdb booktracker_test

# Run migrations
DATABASE_URL="postgresql://user:password@localhost:5432/booktracker_test" npx prisma migrate deploy
```

### 3. Configure Environment
Create `.env` file with test database:
```
DATABASE_URL="postgresql://user:password@localhost:5432/booktracker_test"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-test-secret"
```

### 4. Run Tests
```bash
# Run all tests
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug
```

## Test Structure

### Test Files
- `e2e/tests/auth.unauth.spec.ts` - Authentication (registration, login, protected routes)
- `e2e/tests/books.spec.ts` - Book management (search, add, progress, rating, filtering)
- `e2e/tests/goals.spec.ts` - Reading goals (create, update, delete, progress tracking)
- `e2e/tests/dashboard.spec.ts` - Dashboard (statistics, currently reading, active goals)
- `e2e/tests/mobile.spec.ts` - Mobile responsiveness (all features on mobile viewports)

### Page Objects
Located in `e2e/page-objects/`:
- `LoginPage.ts` - Login page interactions
- `RegisterPage.ts` - Registration page interactions
- `DashboardPage.ts` - Dashboard page interactions
- `BooksPage.ts` - Books page interactions
- `SearchPage.ts` - Search page interactions
- `GoalsPage.ts` - Goals page interactions
- `NavigationComponent.ts` - Navigation menu interactions

## Common Commands

```bash
# Run all tests
npm run test:e2e

# Run tests in interactive UI mode
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed

# Debug tests (step through)
npm run test:e2e:debug

# Run tests for specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests only
npm run test:e2e:mobile

# Run specific test file
npx playwright test e2e/tests/books.spec.ts

# Run tests matching pattern
npx playwright test -g "should login"

# View test report
npm run test:e2e:report
```

## Writing Tests

### Example Test
```typescript
import { test, expect } from '../fixtures/test-fixtures';
import { DatabaseHelper } from '../helpers/database';

test.describe('Feature Name', () => {
  test('should perform action', async ({
    page,
    authenticatedPage, // Automatically logged in
    testUser,         // Test user with email/password
    booksPage         // Page object
  }) => {
    // Create test data
    await DatabaseHelper.createTestBook(testUser.id!, {
      title: 'Test Book',
      status: 'reading',
    });

    // Interact with page
    await booksPage.goto();
    await booksPage.updateReadingProgress('Test Book', 100);

    // Assert results
    const progress = await booksPage.getBookProgress('Test Book');
    expect(progress?.current).toBe(100);
  });
});
```

### Using Fixtures

**testUser** - Automatically created and cleaned up test user:
```typescript
test('example', async ({ testUser }) => {
  // testUser.email, testUser.password, testUser.name available
});
```

**authenticatedPage** - Automatically logs in before test:
```typescript
test('example', async ({ authenticatedPage }) => {
  // User is already authenticated
});
```

**Page Objects** - Available as fixtures:
```typescript
test('example', async ({ loginPage, dashboardPage, booksPage }) => {
  // Use page objects directly
});
```

### Database Helpers

```typescript
// Create test user
const user = await DatabaseHelper.createTestUser({
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
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
  currentBooks: 5,
});

// Cleanup
await DatabaseHelper.cleanupTestUser(email);
```

## Test Coverage

### Authentication
- User registration with validation
- User login with credentials
- Protected route access
- Session persistence across navigation
- Session persistence after page reload

### Book Management
- Search books via Google Books API
- Add books to "Want to Read" list
- Add books to "Reading" list
- Update reading progress
- Mark books as "Read"
- Rate books (1-5 stars)
- Filter books by status
- Delete books from library
- Empty state display

### Reading Goals
- Create new goals with target and deadline
- View active and completed goals
- Display goal progress
- Edit goal details (title, target, deadline)
- Delete goals
- Automatic goal progress tracking
- Goal auto-completion when target reached
- Empty state display

### Dashboard
- Display welcome message with user name
- Show statistics (total books, currently reading, books read, active goals)
- Display currently reading books with progress
- Display active goals with progress
- Navigate to books/goals pages from "View all" links
- Empty state with search books button
- Real-time updates when books/goals change

### Mobile Responsiveness
- Mobile navigation menu
- Dashboard statistics in mobile layout
- Books page in single column layout
- Search functionality on mobile
- Goal management on mobile
- Forms and modals on mobile
- Touch interactions and scrolling
- Multiple device viewports (iPhone, Pixel, iPad)

## Debugging

### Interactive UI Mode
```bash
npm run test:e2e:ui
```
Best for exploring tests, viewing traces, and debugging failures.

### Debug Mode
```bash
npm run test:e2e:debug
```
Step through tests line by line with Playwright Inspector.

### Headed Mode
```bash
npm run test:e2e:headed
```
See the browser while tests run.

### Take Screenshots
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### View Test Report
```bash
npm run test:e2e:report
```
View HTML report with traces, screenshots, and videos.

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

CI workflow:
1. Sets up PostgreSQL database
2. Installs dependencies and Playwright browsers
3. Runs database migrations
4. Builds the application
5. Runs all Playwright tests
6. Uploads test reports, screenshots, and videos as artifacts

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Reset test database
dropdb booktracker_test && createdb booktracker_test
DATABASE_URL="postgresql://user:password@localhost:5432/booktracker_test" npx prisma migrate deploy
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Test Failures
1. Ensure app is running: `npm run dev`
2. Check database migrations: `npx prisma migrate status`
3. Clear test data: `DATABASE_URL="postgresql://user:password@localhost:5432/booktracker_test" npx prisma db push --force-reset`
4. Update Playwright: `npx playwright install`

### Authentication State Issues
```bash
# Delete cached authentication
rm e2e/.auth/user.json

# Re-run tests to regenerate
npm run test:e2e
```

## Best Practices

1. **Use Page Objects** - Don't interact with selectors directly in tests
2. **Use Fixtures** - Leverage `testUser` and `authenticatedPage` fixtures
3. **Clean Up** - Tests automatically clean up created data
4. **Wait Properly** - Use `waitForLoadState('networkidle')` for API calls
5. **Prefer data-testid** - Use `data-testid` selectors when available for stability
6. **Avoid Hardcoded Waits** - Use `waitForSelector` instead of `waitForTimeout`
7. **Test Independence** - Each test should be independent and not rely on other tests
8. **Meaningful Assertions** - Use specific assertions with clear error messages

## Resources

- [Playwright Documentation](https://playwright.dev)
- [E2E Tests README](e2e/README.md) - Detailed documentation
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Debugging Tests](https://playwright.dev/docs/debug)