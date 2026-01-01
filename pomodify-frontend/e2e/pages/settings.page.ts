import { Page } from '@playwright/test';

/**
 * Page Object Model for Settings page.
 */
export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      const url = this.page.url();
      return url.includes('/settings');
    } catch {
      return false;
    }
  }

  async getPomodoroDuration() {
    const input = this.page.locator('input[name="pomodoroDuration"], input#pomodoroDuration');
    return await input.inputValue();
  }

  async setPomodoroDuration(minutes: number) {
    await this.page.fill('input[name="pomodoroDuration"], input#pomodoroDuration', minutes.toString());
  }

  async saveSettings() {
    await this.page.click('button:has-text("Save"), button[type="submit"]');
  }

  async isNotificationEnabled() {
    const toggle = this.page.locator('input[type="checkbox"][name*="notification"]');
    return await toggle.isChecked();
  }

  async toggleNotifications() {
    await this.page.click('input[type="checkbox"][name*="notification"], .notification-toggle');
  }
}
