import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for Login page.
 * Encapsulates selectors and common actions for the login flow.
 */
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async fillEmail(email: string) {
    await this.page.fill('input[type="email"]', email, { timeout: 10000 });
  }

  async fillPassword(password: string) {
    await this.page.fill('input[type="password"]', password, { timeout: 10000 });
  }

  async clickLoginButton() {
    const button = this.page.locator('button[type="submit"]');
    await button.waitFor({ state: 'visible', timeout: 10000 });
    // Wait for button to be enabled (form validation)
    await expect(button).toBeEnabled({ timeout: 10000 });
    await button.click({ timeout: 5000 });
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
    // Wait for API response and navigation or error
    try {
      // Wait for network to be idle (API call completed)
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Wait for either success (dashboard URL) or error message
      // Wrap promises to prevent false failures in trace
      const dashboardPromise = this.page.waitForURL(/.*\/dashboard/, { timeout: 10000 })
        .then(() => 'success')
        .catch(() => null);
      
      const errorPromise = this.page.waitForSelector('text=Invalid credentials, text=Error, .error', { timeout: 5000 })
        .then(() => 'error')
        .catch(() => null);
      
      // Race both promises - whichever resolves first wins
      // The losing promise will resolve to null instead of throwing
      const result = await Promise.race([dashboardPromise, errorPromise]);
      
      // If both timed out, that's okay - test will check state
      if (!result) {
        console.log('[LoginPage] Login wait completed - neither condition met within timeout');
      }
    } catch (error) {
      // Timeout is acceptable - test will check state
      console.log('[LoginPage] Login wait completed with timeout');
    }
  }

  async isErrorVisible() {
    return await this.page.isVisible('text=Invalid credentials', { timeout: 5000 }).catch(() => false);
  }
}
