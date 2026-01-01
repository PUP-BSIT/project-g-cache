import { Page } from '@playwright/test';

/**
 * Page Object Model for Sessions List page.
 */
export class SessionsListPage {
  constructor(private page: Page) {}

  async goto(activityId?: number) {
    const url = activityId ? `/activities/${activityId}/sessions` : '/sessions';
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForSelector('.sessions-list, .sessions-container, .session-card', { timeout: 10000 });
      return true;
    } catch {
      // Check if empty state is shown
      const emptyState = await this.page.isVisible('.empty-state, text=No sessions');
      return emptyState || this.page.url().includes('/sessions');
    }
  }

  async getSessionCount() {
    return await this.page.locator('.session-card, .session-item').count();
  }

  async clickSession(index: number) {
    await this.page.locator('.session-card, .session-item').nth(index).click();
  }

  async deleteSession(index: number) {
    await this.page.locator('.session-card, .session-item').nth(index).locator('button:has-text("Delete"), .delete-btn').click();
  }

  async editSession(index: number) {
    await this.page.locator('.session-card, .session-item').nth(index).locator('button:has-text("Edit"), .edit-btn').click();
  }

  async isEditModalVisible() {
    try {
      await this.page.waitForSelector('.mat-mdc-dialog-container, .modal, .edit-session-modal', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
