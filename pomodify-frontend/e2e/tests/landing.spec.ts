import { test as base, expect } from '@playwright/test';
import { LandingPage } from '../pages/landing.page';

// Create a custom test fixture that mocks the user as unauthenticated for landing page tests
const test = base.extend({
  page: async ({ page }, use) => {
    // Setup API mocks for unauthenticated user
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Only mock API routes
      if (!url.includes('/api/')) {
        return route.continue();
      }

      // User profile endpoint - return 401 to simulate unauthenticated user
      if (url.includes('/api/v2/auth/users/me')) {
        if (method === 'OPTIONS') {
          return route.fulfill({
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          });
        }
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      }

      // Let other requests continue
      return route.continue();
    });

    // Clear localStorage to ensure no auth tokens
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await use(page);
  },
});

test.describe('Landing Page', () => {
  test('should display landing page', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toMatch(/\/$/);
  });

  test('should have navigation to login', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Desktop has .login-link in .right-actions (visible on desktop)
    // Mobile has .mobile-login in nav (hidden on desktop)
    // Use getByRole to find visible login link
    const loginBtn = page.getByRole('link', { name: 'Log In' }).first();
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
  });

  test('should have navigation to signup', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Get Started button links to signup - look for the CTA button in hero section
    const signupBtn = page.locator('.cta .btn-primary, a.btn-primary:has-text("Get Started")').first();
    await expect(signupBtn).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login when clicking login button', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Click the desktop login link (visible on larger screens)
    const loginLink = page.locator('.login-link').first();
    await loginLink.click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });

  test('should display hero section', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    await page.waitForLoadState('networkidle');
    
    // The hero section has class "hero" inside main.landing
    const hero = page.locator('section.hero, .landing .hero').first();
    await expect(hero).toBeVisible({ timeout: 10000 });
  });

  test('should display features section', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Features section has class "feature-grid"
    const features = page.locator('section.feature-grid, .feature-grid').first();
    await expect(features).toBeVisible({ timeout: 10000 });
  });
});
