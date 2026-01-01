import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for Profile page/modal.
 */
export class ProfilePage {
  constructor(private page: Page) {}

  async openProfileModal() {
    // Profile is typically opened via a button in the header/sidebar
    await this.page.click('button.profile-btn, .user-avatar, button:has-text("Profile")');
  }

  async isModalVisible() {
    try {
      await this.page.waitForSelector('.profile-modal, .mat-mdc-dialog-container, .profile-dialog', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getUserName() {
    const element = this.page.locator('.profile-name, .user-name, input[name="name"]');
    return await element.inputValue().catch(() => element.textContent());
  }

  async getUserEmail() {
    const element = this.page.locator('.profile-email, .user-email, input[name="email"]');
    return await element.inputValue().catch(() => element.textContent());
  }

  async updateName(name: string) {
    await this.page.fill('input[name="name"], input#name', name);
  }

  async saveProfile() {
    await this.page.click('button:has-text("Save"), button[type="submit"]');
  }

  async closeModal() {
    await this.page.click('button.close-btn, button:has-text("Close"), .mat-mdc-dialog-container button[mat-dialog-close]');
  }
}
