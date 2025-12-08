import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * This runs once before all tests to set up any global state
 */
async function globalSetup(config: FullConfig) {
  // No setup needed for API mocking - that's done per-test in fixtures
}

export default globalSetup;

