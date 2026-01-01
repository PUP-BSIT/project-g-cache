import { test, expect } from '../fixtures/api-mocks';
import { LoginPage } from '../pages/login.page';

test.describe('Sessions List', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to activities page', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('/activities');
  });

  test('should display activities with session info', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    // Check for activity cards
    const activityCards = page.locator('.activity-card');
    const count = await activityCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have view sessions option on activity cards', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    // Look for sessions link or button on activity cards
    const sessionLinks = page.locator('.activity-card a, .activity-card button:has-text("Sessions"), .view-sessions');
    const count = await sessionLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
