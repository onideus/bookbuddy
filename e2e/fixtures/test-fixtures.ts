import { test as base, expect } from '@playwright/test';
import { DatabaseHelper, TestUser } from '../helpers/database';
import { LoginPage } from '../page-objects/LoginPage';
import { RegisterPage } from '../page-objects/RegisterPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { BooksPage } from '../page-objects/BooksPage';
import { SearchPage } from '../page-objects/SearchPage';
import { GoalsPage } from '../page-objects/GoalsPage';
import { NavigationComponent } from '../page-objects/components/NavigationComponent';
import { faker } from '@faker-js/faker';

// Define custom fixtures
type CustomFixtures = {
  testUser: TestUser;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  booksPage: BooksPage;
  searchPage: SearchPage;
  goalsPage: GoalsPage;
  navigation: NavigationComponent;
  authenticatedPage: void;
};

// Extend base test with custom fixtures
export const test = base.extend<CustomFixtures>({
  // Create a test user for each test
  testUser: async ({}, use) => {
    const user = await DatabaseHelper.createTestUser({
      email: faker.internet.email(),
      password: 'Test123!@#',
      name: faker.person.fullName(),
    });

    await use(user);

    // Cleanup after test
    await DatabaseHelper.cleanupTestUser(user.email);
  },

  // Page object fixtures
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  booksPage: async ({ page }, use) => {
    await use(new BooksPage(page));
  },

  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },

  goalsPage: async ({ page }, use) => {
    await use(new GoalsPage(page));
  },

  navigation: async ({ page }, use) => {
    await use(new NavigationComponent(page));
  },

  // Authenticated page fixture - logs in before test
  authenticatedPage: async ({ page, testUser, loginPage }, use) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await expect(page).toHaveURL('/dashboard');
    await use();
  },
});

export { expect } from '@playwright/test';

// Helper function to generate test data
export const testData = {
  generateUser: () => ({
    email: faker.internet.email(),
    password: 'Test123!@#',
    name: faker.person.fullName(),
  }),

  generateBook: () => ({
    title: faker.lorem.words(3),
    author: faker.person.fullName(),
    isbn: faker.string.numeric(13),
    pages: faker.number.int({ min: 100, max: 1000 }),
  }),

  generateGoal: () => ({
    title: `Read ${faker.number.int({ min: 10, max: 50 })} books this year`,
    target: faker.number.int({ min: 10, max: 50 }),
    deadline: faker.date.future(),
  }),
};