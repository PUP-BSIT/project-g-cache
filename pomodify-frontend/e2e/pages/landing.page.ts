import { Page } from '@playwright/test';

/**
 * Page Object Model for Landing page.
 */
export class LandingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForSelector('.hero, .landing, main.landing', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickGetStarted() {
    await this.page.click('a[routerLink="/signup"], .btn-primary:has-text("Get Started")');
  }

  async clickLogin() {
    // Desktop login link
    await this.page.click('.login-link, a[routerLink="/login"]');
  }

  async clickSignup() {
    await this.page.click('a[routerLink="/signup"], .btn-primary:has-text("Get Started")');
  }

  async isHeroVisible() {
    return await this.page.isVisible('.hero, section.hero');
  }

  async isFeaturesVisible() {
    return await this.page.isVisible('.feature-grid, .feature-box');
  }
}
