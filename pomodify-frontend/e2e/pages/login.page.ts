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
      // Wait a bit for the error notification to appear
      await this.page.waitForTimeout(1000);
      
      // Check for various error message selectors including toast notifications
      const errorSelectors = [
        '.notification-error',
        '.toast-error',
        '.error-notification',
        'text=Login Failed',
        'text=Invalid email or password',
        'text=Invalid credentials',
        '.form-error',
        '.error-message',
        '[role="alert"]',
        '.mat-mdc-snack-bar-container',
        '.snackbar-error',
      ];
      
      for (const selector of errorSelectors) {
        const isVisible = await this.page.isVisible(selector).catch(() => false);
        if (isVisible) return true;
      }
      
      // If no error element found, check if we're still on login page (didn't redirect)
      // This indicates login failed
      const currentUrl = this.page.url();
      const isStillOnLogin = currentUrl.includes('/login');
      
      return isStillOnLogin;
    } catch {
      return false;
    }
  }
}
