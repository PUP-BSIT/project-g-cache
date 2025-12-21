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
    // Wait for API response
    try {
      // Wait for network to be idle (API call completed)
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      console.log('[LoginPage] Network idle reached');
    } catch (error) {
      console.log('[LoginPage] Network idle timeout, continuing...');
    }
    // Wait for either successful navigation to dashboard or error to appear
    try {
      // Try to wait for dashboard URL, but don't fail if it doesn't happen
      await this.page.waitForURL(/.*\/dashboard/, { timeout: 5000 }).catch(() => {
        console.log('[LoginPage] Dashboard URL not reached within 5s');
      });
    } catch (error) {
      console.log('[LoginPage] URL check error:', error);
    }
  }

  async isErrorVisible() {
    try {
      // Check for various error message selectors
      const errorSelectors = [
        '.form-error',
        'text=Invalid email or password',
        'text=Invalid credentials',
        '.error-message',
        '[role="alert"]',
        '.mat-mdc-form-field-error',
      ];
      
      for (const selector of errorSelectors) {
        const isVisible = await this.page.isVisible(selector).catch(() => false);
        if (isVisible) return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
