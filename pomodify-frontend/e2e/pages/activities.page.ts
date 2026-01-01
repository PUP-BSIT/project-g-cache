import { Page } from '@playwright/test';

/**
 * Page Object Model for Activities page.
 */
export class ActivitiesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/activities', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      const url = this.page.url();
      return url.includes('/activities');
    } catch {
      return false;
    }
  }

  async getActivityCount() {
    const cards = await this.page.locator('.activity-card').count();
    return cards;
  }

  async clickCreateActivity() {
    await this.page.click('button:has-text("Create Activity"), button.create-button');
  }

  async isCreateModalVisible() {
    try {
      await this.page.waitForSelector('.mat-mdc-dialog-container, .modal, .create-activity-modal', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async searchActivities(query: string) {
    await this.page.fill('input[placeholder*="Search"], input.search-input', query);
  }

  async selectCategory(categoryName: string) {
    await this.page.click('.category-dropdown, button:has-text("All Categories")');
    await this.page.click(`text=${categoryName}`);
  }

  async clickActivity(activityName: string) {
    await this.page.click(`.activity-card:has-text("${activityName}")`);
  }
}
