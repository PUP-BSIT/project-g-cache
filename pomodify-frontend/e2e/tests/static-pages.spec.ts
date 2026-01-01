import { test, expect } from '../fixtures/api-mocks';
import { StaticPage } from '../pages/static.page';

test.describe('Privacy Policy Page', () => {
  test('should display privacy policy page', async ({ page }) => {
    const staticPage = new StaticPage(page);
    await staticPage.gotoPrivacy();
    
    // Check URL contains privacy
    expect(page.url()).toContain('/privacy');
  });

  test('should be accessible without login', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('domcontentloaded');
    
    // Should not redirect to login
    const url = page.url();
    expect(url).toContain('/privacy');
  });
});

test.describe('Terms of Service Page', () => {
  test('should display terms page', async ({ page }) => {
    const staticPage = new StaticPage(page);
    await staticPage.gotoTerms();
    
    // Check URL contains terms
    expect(page.url()).toContain('/terms');
  });

  test('should be accessible without login', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('domcontentloaded');
    
    // Should not redirect to login
    const url = page.url();
    expect(url).toContain('/terms');
  });
});

test.describe('Static Pages Navigation', () => {
  test('should be able to access privacy page directly', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/privacy');
  });

  test('should be able to access terms page directly', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/terms');
  });
});
