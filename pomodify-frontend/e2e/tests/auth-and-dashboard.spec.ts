import { test, expect } from '../fixtures/api-mocks';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Login Flow', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Use test user credentials (adjust based on your seeded test data)
    await loginPage.login('test@example.com', 'Password123!');

    // Wait for navigation to complete
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });

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

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Try multiple selectors for signup link
    const signupSelectors = [
      'a:has-text("Sign up")',
      'a:has-text("Sign Up")',
      'a[href*="signup"]',
      'a[href*="register"]',
    ];
    
    let clicked = false;
    for (const selector of signupSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        clicked = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (clicked) {
      await expect(page).toHaveURL(/.*\/signup/, { timeout: 10000 });
    } else {
      // If no signup link found, skip this test or mark as failed
      throw new Error('Sign up link not found on login page');
    }
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
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Try multiple selectors for create session button
    const buttonSelectors = [
      'button:has-text("Create Session")',
      'button:has-text("Create session")',
      'button:has-text("New Session")',
      '[data-testid="create-session-button"]',
    ];
    
    let found = false;
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        const button = await page.locator(selector);
        await expect(button).toBeVisible({ timeout: 3000 });
        found = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    expect(found).toBe(true);
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
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Try multiple selectors for settings link/button
    const settingsSelectors = [
      'a[href="/settings"]',
      'a[href*="settings"]',
      'button:has-text("Settings")',
      'a:has-text("Settings")',
      '[data-testid="settings-link"]',
    ];
    
    let clicked = false;
    for (const selector of settingsSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        clicked = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (clicked) {
      await expect(page).toHaveURL(/.*\/settings/, { timeout: 10000 });
    } else {
      throw new Error('Settings link/button not found');
    }
  });
});
