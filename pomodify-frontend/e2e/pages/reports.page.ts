import { Page } from '@playwright/test';

/**
 * Page Object Model for Reports page.
 * Note: Route is /report not /reports
 */
export class ReportsPage {
  constructor(private page: Page) {}

  async goto() {
    // Route is /report not /reports
    await this.page.goto('/report', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      // Wait for page to load - check URL and basic content
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      const url = this.page.url();
      return url.includes('/report');
    } catch {
      return false;
    }
  }

  async getTotalFocusTime() {
    const element = this.page.locator('.total-focus-time, .focus-time-stat');
    return await element.textContent();
  }

  async getTotalSessions() {
    const element = this.page.locator('.total-sessions, .sessions-stat');
    return await element.textContent();
  }

  async selectDateRange(range: 'week' | 'month' | 'year') {
    await this.page.click(`button:has-text("${range}"), .date-range-${range}`);
  }

  async isChartVisible() {
    try {
      await this.page.waitForSelector('canvas, .chart, svg.chart', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
