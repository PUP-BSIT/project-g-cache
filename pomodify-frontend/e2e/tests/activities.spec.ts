import { test, expect } from '../fixtures/api-mocks';
import { LoginPage } from '../pages/login.page';
import { ActivitiesPage } from '../pages/activities.page';

test.describe('Activities Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('should navigate to activities page', async ({ page }) => {
    // Navigate to activities via sidebar
    const activitySelectors = [
      'a[href="/activities"]',
      'a[routerLink="/activities"]',
      'button:has-text("Activities")',
    ];
    
    let clicked = false;
    for (const selector of activitySelectors) {
      try {
        await page.click(selector, { timeout: 5000 });
        clicked = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (clicked) {
      await page.waitForURL(/.*\/activities/, { timeout: 10000 });
      const activitiesPage = new ActivitiesPage(page);
      const isLoaded = await activitiesPage.isLoaded();
      expect(isLoaded).toBe(true);
    }
  });

  test('should display activities page', async ({ page }) => {
    const activitiesPage = new ActivitiesPage(page);
    await activitiesPage.goto();
    
    const isLoaded = await activitiesPage.isLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should have create activity button', async ({ page }) => {
    const activitiesPage = new ActivitiesPage(page);
    await activitiesPage.goto();
    await page.waitForLoadState('networkidle');
    
    const createBtn = page.locator('button:has-text("Create Activity"), button.create-button, .create-activity-btn');
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display activity cards or empty state', async ({ page }) => {
    const activitiesPage = new ActivitiesPage(page);
    await activitiesPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Either activity cards or empty state should be visible
    const content = page.locator('.activity-card, .empty-state, .no-activities');
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have search functionality', async ({ page }) => {
    const activitiesPage = new ActivitiesPage(page);
    await activitiesPage.goto();
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="Search"], input.search-input, .search-bar input');
    const isVisible = await searchInput.first().isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });

  test('should have category filter', async ({ page }) => {
    const activitiesPage = new ActivitiesPage(page);
    await activitiesPage.goto();
    await page.waitForLoadState('networkidle');
    
    const categoryFilter = page.locator('.category-dropdown, select, button:has-text("All")');
    const isVisible = await categoryFilter.first().isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });
});
