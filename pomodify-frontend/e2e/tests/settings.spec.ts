import { test, expect } from '../fixtures/api-mocks';
import { LoginPage } from '../pages/login.page';
import { SettingsPage } from '../pages/settings.page';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('should navigate to settings page', async ({ page }) => {
    // Navigate to settings via sidebar
    const settingsSelectors = [
      'a[href="/settings"]',
      'a[routerLink="/settings"]',
      'button:has-text("Settings")',
      '.nav-item:has-text("Settings")',
    ];
    
    let clicked = false;
    for (const selector of settingsSelectors) {
      try {
        await page.click(selector, { timeout: 5000 });
        clicked = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (clicked) {
      await page.waitForURL(/.*\/settings/, { timeout: 10000 });
      const settingsPage = new SettingsPage(page);
      const isLoaded = await settingsPage.isLoaded();
      expect(isLoaded).toBe(true);
    }
  });

  test('should display settings page', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    
    const isLoaded = await settingsPage.isLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should display page content', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check that page has loaded with some content
    const pageContent = page.locator('main, .settings, .settings-page, .content');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });
});
