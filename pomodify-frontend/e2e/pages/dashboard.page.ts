import { Page } from '@playwright/test';

/**
 * Page Object Model for Dashboard page.
 * Encapsulates selectors and common actions for dashboard.
 */
export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async getSessionCount() {
    try {
      const sessionCards = await this.page.locator('[data-testid="session-card"]').count({ timeout: 5000 });
      return sessionCards;
    } catch {
      return 0;
    }
  }

  async clickCreateSessionButton() {
    await this.page.click('button:has-text("Create Session")', { timeout: 10000 });
  }

  async isWelcomeMessageVisible() {
    return await this.page.isVisible('text=Welcome back', { timeout: 5000 }).catch(() => false);
  }
}
