import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration – Optimized for Fast CI & Local Dev
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // ✅ Run test files in full parallel
  fullyParallel: true,

  // ✅ Fail CI if test.only is committed
  forbidOnly: !!process.env.CI,

  // ✅ Retry once in CI
  retries: process.env.CI ? 1 : 0,

  // ✅ Fewer workers in CI to avoid overwhelming external API
  workers: process.env.CI ? 1 : 2,

  // ✅ HTML report for local, but still fine in CI
  reporter: 'html',

  // ✅ Global test timeout - shorter in CI to fail fast
  timeout: process.env.CI ? 20_000 : 30_000,

  expect: {
    timeout: process.env.CI ? 5_000 : 10_000,
  },

  use: {
    // ✅ Use env base URL if provided
    baseURL:
      process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4200',

    // ✅ Disable tracing in CI for speed
    trace: process.env.CI ? 'off' : 'on-first-retry',

    // ✅ Shorter timeouts in CI to fail fast
    actionTimeout: process.env.CI ? 10_000 : 15_000,
    navigationTimeout: process.env.CI ? 15_000 : 30_000,
    
  },

  // ✅ Only Chromium in CI, all browsers locally
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
      ],

  // ✅ Do NOT start dev server from Playwright in CI
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
      },
});
