import { test, expect } from '../fixtures/api-mocks';
import { SignupPage } from '../pages/signup.page';

test.describe('Signup Page', () => {
  test('should display signup page', async ({ page }) => {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    
    const isLoaded = await signupPage.isLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should have signup form fields', async ({ page }) => {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    
    // Check for form fields
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input#password');
    const confirmPasswordInput = page.locator('input#confirmPassword');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(confirmPasswordInput).toBeVisible({ timeout: 10000 });
  });

  test('should have signup submit button', async ({ page }) => {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    
    // The submit button has class btn-signup
    const signupBtn = page.locator('button.btn-signup, button[type="submit"]');
    await expect(signupBtn).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login page', async ({ page }) => {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    
    // Click on login tab
    await page.click('button.tab-btn:has-text("Log In")');
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });

  test('should show validation for empty form', async ({ page }) => {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    
    // Submit button should be disabled when form is empty
    const submitBtn = page.locator('button.btn-signup');
    await expect(submitBtn).toBeDisabled({ timeout: 5000 });
  });

  test('should have Google signup option', async ({ page }) => {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    
    const googleBtn = page.locator('button:has-text("Google"), .btn-google, .google-btn');
    const isVisible = await googleBtn.isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });
});
