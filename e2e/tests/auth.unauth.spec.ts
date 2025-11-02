import { test, expect } from '../fixtures/test-fixtures';
import { faker } from '@faker-js/faker';

test.describe('Authentication Flow - Unauthenticated', () => {
  test.describe('Registration', () => {
    test('should successfully register a new user', async ({ page, registerPage }) => {
      const userData = {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'Test123!@#',
      };

      await registerPage.goto();

      // Verify registration form is visible
      await expect(page).toHaveURL('/register');
      expect(await registerPage.isRegistrationFormVisible()).toBeTruthy();

      // Register new user
      await registerPage.register(userData.name, userData.email, userData.password);

      // Should redirect to login or dashboard
      await expect(page).toHaveURL(/\/(login|dashboard)/);
    });

    test('should show error for mismatched passwords', async ({ page, registerPage }) => {
      const userData = {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'Test123!@#',
        confirmPassword: 'DifferentPassword123!',
      };

      await registerPage.goto();
      await registerPage.register(userData.name, userData.email, userData.password, userData.confirmPassword);

      // Should show error and stay on registration page
      await expect(page).toHaveURL('/register');
    });

    test('should show error for invalid email', async ({ page, registerPage }) => {
      await registerPage.goto();
      await registerPage.register('Test User', 'invalid-email', 'Test123!@#');

      // Should show error or validation message
      await expect(page).toHaveURL('/register');
    });

    test('should show error for duplicate email', async ({ page, registerPage, testUser }) => {
      await registerPage.goto();
      await registerPage.register('Another User', testUser.email, 'Test123!@#');

      // Should show error for existing email
      await expect(page).toHaveURL('/register');
    });

    test('should navigate to login page from register link', async ({ page, registerPage, loginPage }) => {
      await registerPage.goto();
      await registerPage.clickLoginLink();

      await expect(page).toHaveURL('/login');
      expect(await loginPage.isLoginFormVisible()).toBeTruthy();
    });
  });

  test.describe('Login', () => {
    test('should successfully login with valid credentials', async ({ page, loginPage, testUser }) => {
      await loginPage.goto();

      // Verify login form is visible
      await expect(page).toHaveURL('/login');
      expect(await loginPage.isLoginFormVisible()).toBeTruthy();

      // Login with test user
      await loginPage.login(testUser.email, testUser.password);

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should show error for invalid email', async ({ page, loginPage }) => {
      await loginPage.goto();
      await loginPage.login('invalid@email.com', 'WrongPassword123!');

      // Should show error and stay on login page
      await expect(page).toHaveURL('/login');
    });

    test('should show error for invalid password', async ({ page, loginPage, testUser }) => {
      await loginPage.goto();
      await loginPage.login(testUser.email, 'WrongPassword123!');

      // Should show error and stay on login page
      await expect(page).toHaveURL('/login');
    });

    test('should show error for empty email', async ({ page, loginPage }) => {
      await loginPage.goto();
      await loginPage.login('', 'Test123!@#');

      // Should show validation error
      await expect(page).toHaveURL('/login');
    });

    test('should show error for empty password', async ({ page, loginPage, testUser }) => {
      await loginPage.goto();
      await loginPage.login(testUser.email, '');

      // Should show validation error
      await expect(page).toHaveURL('/login');
    });

    test('should navigate to register page from login link', async ({ page, loginPage, registerPage }) => {
      await loginPage.goto();
      await loginPage.clickRegisterLink();

      await expect(page).toHaveURL('/register');
      expect(await registerPage.isRegistrationFormVisible()).toBeTruthy();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should redirect to login when accessing books without auth', async ({ page }) => {
      await page.goto('/books');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should redirect to login when accessing goals without auth', async ({ page }) => {
      await page.goto('/goals');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should redirect to login when accessing search without auth', async ({ page }) => {
      await page.goto('/search');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page reload', async ({ page, loginPage, testUser, dashboardPage }) => {
      // Login
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);
      await expect(page).toHaveURL('/dashboard');

      // Reload page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL('/dashboard');

      // Verify dashboard content is loaded
      const welcomeMessage = await dashboardPage.getWelcomeMessage();
      expect(welcomeMessage).toContain(testUser.name);
    });

    test('should maintain session across navigation', async ({ page, loginPage, testUser, navigation }) => {
      // Login
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);
      await expect(page).toHaveURL('/dashboard');

      // Navigate to different pages
      await navigation.goToBooks();
      await expect(page).toHaveURL('/books');

      await navigation.goToGoals();
      await expect(page).toHaveURL('/goals');

      await navigation.goToSearch();
      await expect(page).toHaveURL('/search');

      await navigation.goToDashboard();
      await expect(page).toHaveURL('/dashboard');
    });
  });
});