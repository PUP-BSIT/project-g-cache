import { Page } from '@playwright/test';

/**
 * Page Object Model for Static pages (Privacy, Terms).
 */
export class StaticPage {
  constructor(private page: Page) {}

  async gotoPrivacy() {
    await this.page.goto('/privacy', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async gotoTerms() {
    await this.page.goto('/terms', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async isLoaded() {
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async getPageTitle() {
    const title = this.page.locator('h1, .page-title');
    return await title.textContent().catch(() => null);
  }

  async hasContent() {
    const content = this.page.locator('p, .content, article, main');
    const count = await content.count();
    return count > 0;
  }

  async clickBackToHome() {
    await this.page.click('a:has-text("Home"), a:has-text("Back"), a[href="/"]');
  }
}
