import { Page } from '@playwright/test';

/**
 * Page Object Model for Dashboard page.
 * Encapsulates selectors and common actions for dashboard.
 */
export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async isLoaded() {
    await this.page.waitForSelector('h1:has-text("Dashboard")');
    return true;
  }

  async getSessionCount() {
    const sessionCards = await this.page.locator('[data-testid="session-card"]').count();
    return sessionCards;
  }

  async clickCreateSessionButton() {
    await this.page.click('button:has-text("Create Session")');
  }

  async isWelcomeMessageVisible() {
    return await this.page.isVisible('text=Welcome back');
  }
}
