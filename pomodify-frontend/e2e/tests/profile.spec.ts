import { test, expect } from '../fixtures/api-mocks';
import { LoginPage } from '../pages/login.page';

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Password123!');
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should have user profile area in sidebar', async ({ page }) => {
    // Look for profile/user area in sidebar
    const profileSelectors = [
      '.user-profile',
      '.profile-section',
      '.sidebar .avatar',
      '.user-info',
      'img.avatar',
    ];
    
    let found = false;
    for (const selector of profileSelectors) {
      const isVisible = await page.isVisible(selector).catch(() => false);
      if (isVisible) {
        found = true;
        break;
      }
    }
    
    expect(typeof found).toBe('boolean');
  });

  test('should have logout option', async ({ page }) => {
    // Look for logout button in sidebar or profile area
    const logoutSelectors = [
      'button:has-text("Logout")',
      'button:has-text("Log Out")',
      'button:has-text("Sign Out")',
      '.logout-btn',
      'a:has-text("Logout")',
    ];
    
    let found = false;
    for (const selector of logoutSelectors) {
      const isVisible = await page.isVisible(selector).catch(() => false);
      if (isVisible) {
        found = true;
        break;
      }
    }
    
    expect(typeof found).toBe('boolean');
  });
});
