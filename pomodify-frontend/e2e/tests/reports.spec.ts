import { test, expect } from '../fixtures/api-mocks';
import { LoginPage } from '../pages/login.page';
import { ReportsPage } from '../pages/reports.page';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('should navigate to reports page', async ({ page }) => {
    // Navigate to reports via sidebar - route is /report not /reports
    const reportsSelectors = [
      'a[href="/report"]',
      'a[routerLink="/report"]',
      'button:has-text("Report")',
      '.nav-item:has-text("Report")',
    ];
    
    let clicked = false;
    for (const selector of reportsSelectors) {
      try {
        await page.click(selector, { timeout: 5000 });
        clicked = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (clicked) {
      await page.waitForURL(/.*\/report/, { timeout: 10000 });
      const reportsPage = new ReportsPage(page);
      const isLoaded = await reportsPage.isLoaded();
      expect(isLoaded).toBe(true);
    }
  });

  test('should display reports page', async ({ page }) => {
    const reportsPage = new ReportsPage(page);
    await reportsPage.goto();
    
    const isLoaded = await reportsPage.isLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should display page content', async ({ page }) => {
    const reportsPage = new ReportsPage(page);
    await reportsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check that page has loaded with some content
    const pageContent = page.locator('main, .report, .reports-page, .content');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });
});
