import { Page } from '@playwright/test';

/**
 * Page Object Model for Signup page.
 */
export class SignupPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/signup', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForSelector('form, .signup-form, button.btn-signup', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async fillName(name: string) {
    await this.page.fill('input[name="name"], input#name, input[placeholder*="Name"]', name);
  }

  async fillEmail(email: string) {
    await this.page.fill('input[type="email"], input[name="email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('input#password', password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.fill('input#confirmPassword', password);
  }

  async clickSignupButton() {
    await this.page.click('button.btn-signup, button[type="submit"]');
  }

  async signup(name: string, email: string, password: string) {
    await this.fillName(name);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.clickSignupButton();
  }

  async isErrorVisible() {
    try {
      const errorSelectors = ['.form-error', '.error-message', '[role="alert"]', 'text=already exists'];
      for (const selector of errorSelectors) {
        if (await this.page.isVisible(selector)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async navigateToLogin() {
    await this.page.click('button.tab-btn:has-text("Log In")');
  }
}
