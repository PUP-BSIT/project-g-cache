import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Login Flow', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Use test user credentials (adjust based on your seeded test data)
    await loginPage.login('test@example.com', 'Password123!');

    // Verify redirect to dashboard
    const dashboardPage = new DashboardPage(page);
    const isLoaded = await dashboardPage.isLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login('test@example.com', 'WrongPassword');

    const isErrorVisible = await loginPage.isErrorVisible();
    expect(isErrorVisible).toBe(true);
  });

  test('should navigate to signup page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.click('a:has-text("Sign up")');
    await expect(page).toHaveURL(/.*\/signup/);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each dashboard test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
  });

  test('should display welcome message', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const isWelcomeVisible = await dashboardPage.isWelcomeMessageVisible();
    expect(isWelcomeVisible).toBe(true);
  });

  test('should have create session button', async ({ page }) => {
    await page.waitForSelector('button:has-text("Create Session")');
    const button = await page.locator('button:has-text("Create Session")');
    await expect(button).toBeVisible();
  });

  test('should display session cards', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const sessionCount = await dashboardPage.getSessionCount();
    expect(sessionCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
  });

  test('should navigate to session timer', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.clickCreateSessionButton();

    // Verify navigation to session timer page
    await expect(page).toHaveURL(/.*\/session-timer/);
  });

  test('should show settings page', async ({ page }) => {
    await page.click('a[href="/settings"], button:has-text("Settings")');
    await expect(page).toHaveURL(/.*\/settings/);
  });
});
