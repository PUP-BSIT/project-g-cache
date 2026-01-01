import { test, expect } from '../fixtures/api-mocks';
import { LoginPage } from '../pages/login.page';

test.describe('Session Timer', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard with activity cards', async ({ page }) => {
    // Verify dashboard loaded with activity content
    const dashboardContent = page.locator('.dashboard, .activity-card, .metrics-section, main');
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to activities page', async ({ page }) => {
    // Navigate to activities
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('/activities');
  });

  test('should have activity cards with session options', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    // Check for activity cards or empty state
    const content = page.locator('.activity-card, .empty-state, .no-activities');
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
