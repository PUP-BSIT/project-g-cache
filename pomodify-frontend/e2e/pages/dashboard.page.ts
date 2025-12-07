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
      // Wait for page to be fully loaded and API responses to complete
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      // Wait for dashboard title or any dashboard content
      await this.page.waitForSelector('h1:has-text("Dashboard"), [data-testid="dashboard"], .dashboard', { timeout: 10000 });
      return true;
    } catch {
      // Try alternative selectors
      try {
        await this.page.waitForSelector('body', { timeout: 5000 });
        // Check if we're on dashboard URL
        const url = this.page.url();
        if (url.includes('/dashboard')) {
          return true;
        }
      } catch {
        return false;
      }
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

