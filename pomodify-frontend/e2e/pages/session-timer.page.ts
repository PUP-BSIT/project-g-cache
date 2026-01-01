import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for Session Timer page.
 */
export class SessionTimerPage {
  constructor(private page: Page) {}

  async goto(activityId?: number, sessionId?: number) {
    const url = activityId && sessionId 
      ? `/activities/${activityId}/sessions/${sessionId}/timer`
      : '/session-timer';
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForSelector('.timer-display, .session-timer, .timer-container', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async getTimerDisplay() {
    const element = this.page.locator('.timer-display, .time-display, .countdown');
    return await element.textContent();
  }

  async startTimer() {
    await this.page.click('button:has-text("Start"), button.start-btn, button.play-btn');
  }

  async pauseTimer() {
    await this.page.click('button:has-text("Pause"), button.pause-btn');
  }

  async stopTimer() {
    await this.page.click('button:has-text("Stop"), button.stop-btn');
  }

  async isTimerRunning() {
    const pauseBtn = this.page.locator('button:has-text("Pause"), button.pause-btn');
    return await pauseBtn.isVisible();
  }

  async getCurrentPhase() {
    const element = this.page.locator('.phase-indicator, .current-phase, .session-phase');
    return await element.textContent();
  }

  async skipPhase() {
    await this.page.click('button:has-text("Skip"), button.skip-btn');
  }
}
