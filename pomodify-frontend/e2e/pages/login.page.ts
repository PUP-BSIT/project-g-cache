import { Page } from '@playwright/test';

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
    await this.page.click('button[type="submit"]', { timeout: 10000 });
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
    // Wait for navigation or error, but with timeout
    try {
      await Promise.race([
        this.page.waitForURL(/.*\/dashboard/, { timeout: 15000 }),
        this.page.waitForSelector('text=Invalid credentials', { timeout: 10000 }),
      ]);
    } catch (error) {
      // Timeout is acceptable - test will check state
    }
  }

  async isErrorVisible() {
    return await this.page.isVisible('text=Invalid credentials', { timeout: 5000 }).catch(() => false);
  }
}
