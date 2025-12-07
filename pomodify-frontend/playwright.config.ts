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

  // ✅ Fast workers in CI, moderate locally
  workers: process.env.CI ? 4 : 2,

  // ✅ HTML report for local, but still fine in CI
  reporter: 'html',

  // ✅ Global test timeout
  timeout: 30_000,

  expect: {
    timeout: 10_000,
  },

  use: {
    // ✅ Use env base URL if provided
    baseURL:
      process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4200',

    // ✅ Disable tracing in CI for speed
    trace: process.env.CI ? 'off' : 'on-first-retry',

    // ✅ Reasonable action & nav timeouts
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
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
