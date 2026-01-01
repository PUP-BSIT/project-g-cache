import { test, expect } from '../fixtures/api-mocks';
import { LandingPage } from '../pages/landing.page';

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
    
    // Desktop has .login-link in .right-actions, mobile has .mobile-login in nav
    // Use :visible pseudo-class to get only visible elements
    const loginBtn = page.locator('a[routerLink="/login"]:visible, a[href="/login"]:visible');
    await expect(loginBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have navigation to signup', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    
    // Get Started button links to signup
    const signupBtn = page.locator('a[routerLink="/signup"], .btn-primary:has-text("Get Started")');
    await expect(signupBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login when clicking login button', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Click only the visible login link
    const loginLink = page.locator('a[routerLink="/login"]:visible, a[href="/login"]:visible').first();
    await loginLink.click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });

  test('should display hero section', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    
    const hero = page.locator('.hero, section.hero');
    await expect(hero).toBeVisible({ timeout: 10000 });
  });

  test('should display features section', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    
    const features = page.locator('.feature-grid, .feature-box');
    await expect(features.first()).toBeVisible({ timeout: 10000 });
  });
});
