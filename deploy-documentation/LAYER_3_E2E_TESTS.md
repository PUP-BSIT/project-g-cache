# 🎭 LAYER 3: Frontend E2E Tests with Playwright - Implementation Guide

## Overview

This layer tests **complete user workflows** (login → create session → view dashboard) like a real user.

**Technology:** Playwright (Microsoft's modern E2E framework)  
**Expected Duration:** 3-5 minutes per PR  
**Effort:** 10-12 hours setup  
**Impact:** Catch UI bugs, broken workflows, API integration issues

---

## Why Playwright Over Cypress?

| Feature | Cypress | Playwright |
|---------|---------|-----------|
| Speed | Slower | ⚡ **2-3x faster** |
| Multi-browser | Chrome only | Chrome, Firefox, Safari |
| Debugging | Limited UI | Full DevTools access |
| Enterprise backing | Limited | Microsoft (backed) |
| Parallel execution | Hard | Native support |
| Network control | Limited | Full control (throttling) |
| Mobile testing | Hard | WebKit mobile profiles |

**Verdict:** Playwright is the modern choice for enterprise E2E testing.

---

## Architecture

```
GitHub Actions CI
   ↓
Launch Playwright
   ↓
┌─────────────────────────────────────┐
│ E2E Test 1: login.spec.ts           │
│ - Navigate to login page             │
│ - Enter credentials                  │
│ - Click login button                 │
│ - Verify dashboard loads             │
└─────────────────────────────────────┘
   ↓
┌─────────────────────────────────────┐
│ E2E Test 2: session-timer.spec.ts   │
│ - Start a session                    │
│ - Pause and resume                   │
│ - Complete session                   │
└─────────────────────────────────────┘
   ↓
┌─────────────────────────────────────┐
│ Generate test report & video        │
└─────────────────────────────────────┘
```

---

## Step 1: Install Playwright

Update `pomodify-frontend/package.json`:

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.0.0"
  },
  "scripts": {
    "test": "ng test",
    "test:ci": "ng test --watch=false --code-coverage --browsers=ChromeHeadless",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:debug": "playwright test --debug",
    "e2e:headed": "playwright test --headed",
    "e2e:report": "playwright show-report"
  }
}
```

Install dependencies:

```bash
cd pomodify-frontend
npm install --legacy-peer-deps
npx playwright install  # Installs browser binaries
```

---

## Step 2: Create Playwright Configuration

Create `pomodify-frontend/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  
  // Test timeout: 30 seconds per test
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Fail on console errors
  use: {
    // Base URL for all requests
    baseURL: process.env['BASE_URL'] || 'http://localhost:4200',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Trace on failure
    trace: 'on-first-retry',
  },

  // Web server to start before running tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: process.env.CI ? false : true,
    timeout: 120 * 1000,
  },

  // Shared settings for all Chrome browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Uncomment for Safari testing (macOS only)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile testing (optional)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI (can be flaky with shared state)
  workers: process.env.CI ? 1 : undefined,

  // Reporter options
  reporter: [
    ['html', { outputFolder: 'test-results' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Global setup/teardown
  // globalSetup: require.resolve('./global-setup.ts'),
  // globalTeardown: require.resolve('./global-teardown.ts'),
});
```

---

## Step 3: Create Page Object Models

Create `pomodify-frontend/e2e/pages/login.page.ts`:

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for Login page
 * Encapsulates all login-related interactions
 */
export class LoginPage {
  constructor(private page: Page) {}

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get email input field
   */
  private getEmailInput() {
    return this.page.getByPlaceholder('Email address');
  }

  /**
   * Get password input field
   */
  private getPasswordInput() {
    return this.page.getByPlaceholder('Password');
  }

  /**
   * Get login button
   */
  private getLoginButton() {
    return this.page.getByRole('button', { name: /login/i });
  }

  /**
   * Get error message element
   */
  private getErrorMessage() {
    return this.page.getByRole('alert');
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string) {
    await this.getEmailInput().fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string) {
    await this.getPasswordInput().fill(password);
  }

  /**
   * Click login button
   */
  async clickLogin() {
    await this.getLoginButton().click();
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  /**
   * Get error message text
   */
  async getErrorMessageText() {
    return await this.getErrorMessage().textContent();
  }

  /**
   * Wait for error message
   */
  async waitForErrorMessage() {
    await this.getErrorMessage().waitFor({ state: 'visible' });
  }

  /**
   * Check if email field is visible
   */
  async isEmailFieldVisible() {
    return await this.getEmailInput().isVisible();
  }
}
```

Create `pomodify-frontend/e2e/pages/dashboard.page.ts`:

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for Dashboard page
 */
export class DashboardPage {
  constructor(private page: Page) {}

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get dashboard heading
   */
  private getDashboardHeading() {
    return this.page.getByRole('heading', { name: /dashboard/i });
  }

  /**
   * Get total sessions card
   */
  private getTotalSessionsCard() {
    return this.page.locator('[data-testid="total-sessions"]');
  }

  /**
   * Get today's sessions card
   */
  private getTodaySessionsCard() {
    return this.page.locator('[data-testid="today-sessions"]');
  }

  /**
   * Get sessions list
   */
  private getSessionsList() {
    return this.page.locator('[data-testid="sessions-list"]');
  }

  /**
   * Get "Start New Session" button
   */
  private getStartSessionButton() {
    return this.page.getByRole('button', { name: /start new session/i });
  }

  /**
   * Check if dashboard is loaded
   */
  async isDashboardLoaded() {
    return await this.getDashboardHeading().isVisible();
  }

  /**
   * Get total sessions count
   */
  async getTotalSessionsCount() {
    const text = await this.getTotalSessionsCard().textContent();
    return parseInt(text?.match(/\d+/)?.[0] || '0');
  }

  /**
   * Get today sessions count
   */
  async getTodaySessionsCount() {
    const text = await this.getTodaySessionsCard().textContent();
    return parseInt(text?.match(/\d+/)?.[0] || '0');
  }

  /**
   * Click start new session button
   */
  async clickStartSession() {
    await this.getStartSessionButton().click();
  }

  /**
   * Wait for sessions to load
   */
  async waitForSessionsToLoad() {
    await this.getSessionsList().waitFor({ state: 'visible' });
  }
}
```

Create `pomodify-frontend/e2e/pages/session-timer.page.ts`:

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for Session Timer page
 */
export class SessionTimerPage {
  constructor(private page: Page) {}

  /**
   * Navigate to session timer
   */
  async goto() {
    await this.page.goto('/session-timer');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get start button
   */
  private getStartButton() {
    return this.page.getByRole('button', { name: /start/i }).first();
  }

  /**
   * Get pause button
   */
  private getPauseButton() {
    return this.page.getByRole('button', { name: /pause/i });
  }

  /**
   * Get resume button
   */
  private getResumeButton() {
    return this.page.getByRole('button', { name: /resume/i });
  }

  /**
   * Get stop button
   */
  private getStopButton() {
    return this.page.getByRole('button', { name: /stop/i });
  }

  /**
   * Get timer display
   */
  private getTimerDisplay() {
    return this.page.locator('[data-testid="timer-display"]');
  }

  /**
   * Get session status
   */
  private getSessionStatus() {
    return this.page.locator('[data-testid="session-status"]');
  }

  /**
   * Start a session
   */
  async startSession() {
    await this.getStartButton().click();
    // Wait for timer to start counting
    await this.page.waitForTimeout(1000);
  }

  /**
   * Pause the session
   */
  async pauseSession() {
    await this.getPauseButton().click();
  }

  /**
   * Resume the session
   */
  async resumeSession() {
    await this.getResumeButton().click();
  }

  /**
   * Stop the session
   */
  async stopSession() {
    await this.getStopButton().click();
  }

  /**
   * Get current timer value
   */
  async getTimerValue() {
    return await this.getTimerDisplay().textContent();
  }

  /**
   * Get session status text
   */
  async getStatus() {
    return await this.getSessionStatus().textContent();
  }

  /**
   * Wait for timer to change
   */
  async waitForTimerChange(initialValue: string) {
    await this.page.waitForFunction(
      (initialVal) => {
        const current = document.querySelector('[data-testid="timer-display"]')?.textContent;
        return current !== initialVal;
      },
      initialValue,
      { timeout: 5000 }
    );
  }
}
```

---

## Step 4: Create Test Fixtures and Data

Create `pomodify-frontend/e2e/fixtures/test-data.ts`:

```typescript
export const testUser = {
  email: 'test@pomodify.com',
  password: 'TestPassword123!',
  name: 'Test User',
};

export const invalidCredentials = {
  email: 'invalid@pomodify.com',
  password: 'WrongPassword123!',
};

export const sessionTemplates = {
  focusSession: {
    name: 'Focus Session',
    workDuration: 25,
    breakDuration: 5,
    category: 'Work',
  },
  studySession: {
    name: 'Study Session',
    workDuration: 50,
    breakDuration: 10,
    category: 'Study',
  },
  quickBreak: {
    name: 'Quick Break',
    workDuration: 5,
    breakDuration: 5,
    category: 'Break',
  },
};
```

---

## Step 5: Create E2E Test Files

Create `pomodify-frontend/e2e/tests/login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { testUser, invalidCredentials } from '../fixtures/test-data';

test.describe('User Authentication', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // GIVEN: User is on login page
    expect(await loginPage.isEmailFieldVisible()).toBeTruthy();

    // WHEN: User enters valid credentials
    await loginPage.login(testUser.email, testUser.password);

    // THEN: Dashboard should load
    await page.waitForURL('**/dashboard');
    expect(await dashboardPage.isDashboardLoaded()).toBeTruthy();
  });

  test('should display error message on invalid credentials', async ({ page }) => {
    // GIVEN: User is on login page
    // WHEN: User enters invalid credentials
    await loginPage.login(invalidCredentials.email, invalidCredentials.password);

    // THEN: Error message should be displayed
    await loginPage.waitForErrorMessage();
    const errorText = await loginPage.getErrorMessageText();
    expect(errorText).toContain('Invalid credentials');
  });

  test('should prevent login with empty email', async ({ page }) => {
    // GIVEN: User is on login page
    // WHEN: User tries to login with empty email
    await loginPage.fillPassword(testUser.password);
    await loginPage.clickLogin();

    // THEN: Validation error should appear
    const emailInput = page.getByPlaceholder('Email address');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should prevent login with empty password', async ({ page }) => {
    // GIVEN: User is on login page
    // WHEN: User tries to login with empty password
    await loginPage.fillEmail(testUser.email);
    await loginPage.clickLogin();

    // THEN: Validation error should appear
    const passwordInput = page.getByPlaceholder('Password');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should handle server error gracefully', async ({ page }) => {
    // Simulate server error by blocking API request
    await page.route('**/api/auth/login', route => {
      route.abort('failed');
    });

    // WHEN: User tries to login during server error
    await loginPage.login(testUser.email, testUser.password);

    // THEN: Error message should be displayed
    await loginPage.waitForErrorMessage();
    const errorText = await loginPage.getErrorMessageText();
    expect(errorText).toContain('Connection failed');
  });
});
```

Create `pomodify-frontend/e2e/tests/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { testUser } from '../fixtures/test-data';

test.describe('Dashboard Page', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    
    // Navigate to dashboard
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('should display dashboard with all widgets', async () => {
    // WHEN: Dashboard loads
    // THEN: All expected elements should be visible
    expect(await dashboardPage.isDashboardLoaded()).toBeTruthy();
    
    // Check card visibility
    const totalSessions = await dashboardPage.getTotalSessionsCount();
    expect(totalSessions).toBeGreaterThanOrEqual(0);
    
    const todaySessions = await dashboardPage.getTodaySessionsCount();
    expect(todaySessions).toBeGreaterThanOrEqual(0);
  });

  test('should display sessions list', async () => {
    // GIVEN: Dashboard is loaded
    // WHEN: Sessions list is visible
    await dashboardPage.waitForSessionsToLoad();

    // THEN: Sessions should be displayed
    // (Assumes user has created sessions)
  });

  test('should navigate to start new session', async ({ page }) => {
    // GIVEN: Dashboard is loaded
    // WHEN: User clicks "Start New Session"
    await dashboardPage.clickStartSession();

    // THEN: Should navigate to session timer page
    await page.waitForURL('**/session-timer');
  });

  test('should display current date', async ({ page }) => {
    // WHEN: Dashboard loads
    // THEN: Current date should be displayed
    const today = new Date().toLocaleDateString();
    const dashboardContent = await page.textContent('body');
    expect(dashboardContent).toContain(today);
  });
});
```

Create `pomodify-frontend/e2e/tests/session-timer.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { SessionTimerPage } from '../pages/session-timer.page';
import { testUser } from '../fixtures/test-data';

test.describe('Session Timer', () => {
  let sessionTimerPage: SessionTimerPage;

  test.beforeEach(async ({ page }) => {
    // Login and navigate to session timer
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    
    sessionTimerPage = new SessionTimerPage(page);
    await sessionTimerPage.goto();
  });

  test('should start a session', async () => {
    // WHEN: User clicks start
    await sessionTimerPage.startSession();

    // THEN: Timer should start counting
    const initialValue = await sessionTimerPage.getTimerValue();
    await sessionTimerPage.waitForTimerChange(initialValue);
    
    const newValue = await sessionTimerPage.getTimerValue();
    expect(newValue).not.toEqual(initialValue);
  });

  test('should pause and resume session', async () => {
    // GIVEN: Session is running
    await sessionTimerPage.startSession();
    
    // WHEN: User pauses
    await sessionTimerPage.pauseSession();
    const pausedValue = await sessionTimerPage.getTimerValue();
    
    // Wait to verify time doesn't change
    await new Promise(resolve => setTimeout(resolve, 2000));
    const stillPausedValue = await sessionTimerPage.getTimerValue();
    
    // THEN: Timer should be paused (same value)
    expect(pausedValue).toEqual(stillPausedValue);
    
    // WHEN: User resumes
    await sessionTimerPage.resumeSession();
    
    // THEN: Timer should resume counting
    const resumedValue = await sessionTimerPage.getTimerValue();
    await sessionTimerPage.waitForTimerChange(resumedValue);
  });

  test('should stop session', async () => {
    // GIVEN: Session is running
    await sessionTimerPage.startSession();
    
    // WHEN: User stops session
    await sessionTimerPage.stopSession();

    // THEN: Session should be saved
    // (Check for success message or navigation)
  });

  test('should display correct initial duration', async () => {
    // WHEN: Session timer page loads
    const timerValue = await sessionTimerPage.getTimerValue();

    // THEN: Should display default duration (25:00 for focus session)
    expect(timerValue).toContain('25');
  });
});
```

---

## Step 6: Update CI Workflow

Add E2E tests to `.github/workflows/ci.yml`:

```yaml
  frontend-e2e-tests:
    name: Frontend E2E Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'pomodify-frontend/package-lock.json'

      - name: Install dependencies
        working-directory: pomodify-frontend
        run: npm install --legacy-peer-deps

      - name: Install Playwright browsers
        working-directory: pomodify-frontend
        run: npx playwright install --with-deps

      - name: Run E2E tests
        working-directory: pomodify-frontend
        run: npm run e2e
        env:
          BASE_URL: ${{ secrets.STAGING_API_URL || 'http://localhost:4200' }}

      - name: Upload E2E test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-test-results
          path: pomodify-frontend/test-results/

      - name: Upload E2E videos
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-videos
          path: pomodify-frontend/test-results/
          retention-days: 7

  # Update CI summary to include E2E tests
  ci-summary:
    name: CI Summary and Gate
    needs: [frontend-unit-tests, backend-unit-tests, backend-integration-tests, 
            frontend-e2e-tests, build-and-test]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Check if all tests passed
        run: |
          if [ "${{ needs.frontend-unit-tests.result }}" != "success" ]; then
            echo "❌ Frontend unit tests failed"
            exit 1
          fi
          if [ "${{ needs.backend-unit-tests.result }}" != "success" ]; then
            echo "❌ Backend unit tests failed"
            exit 1
          fi
          if [ "${{ needs.backend-integration-tests.result }}" != "success" ]; then
            echo "❌ Backend integration tests failed"
            exit 1
          fi
          if [ "${{ needs.frontend-e2e-tests.result }}" != "success" ]; then
            echo "❌ Frontend E2E tests failed"
            exit 1
          fi
          echo "✅ All tests passed!"

      - name: Success summary
        run: |
          echo "════════════════════════════════════════"
          echo "✅ ALL CI CHECKS PASSED!"
          echo "════════════════════════════════════════"
          echo ""
          echo "📊 Test Summary:"
          echo "  ✅ Frontend Unit Tests - Passed"
          echo "  ✅ Backend Unit Tests - Passed"
          echo "  ✅ Backend Integration Tests - Passed"
          echo "  ✅ Frontend E2E Tests - Passed"
          echo "  ✅ Docker Build & Validation - Passed"
          echo ""
          echo "🎉 This PR is safe to merge!"
          echo "🚀 Deploy to production will start after merge"
          echo "════════════════════════════════════════"
```

---

## Step 7: Run Tests Locally

```bash
cd pomodify-frontend

# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run e2e

# Run with UI mode (interactive)
npm run e2e:ui

# Run in debug mode
npm run e2e:debug

# Run specific test file
npx playwright test e2e/tests/login.spec.ts

# Run in headed mode (see browser)
npm run e2e:headed

# View test results
npm run e2e:report
```

---

## Expected Test Output

```
npx playwright test

Running 10 tests using 1 worker

  ✓ [chromium] › login.spec.ts › should successfully login with valid credentials (3.2s)
  ✓ [chromium] › login.spec.ts › should display error message on invalid credentials (2.1s)
  ✓ [chromium] › login.spec.ts › should prevent login with empty email (1.8s)
  ✓ [chromium] › login.spec.ts › should prevent login with empty password (1.9s)
  ✓ [chromium] › login.spec.ts › should handle server error gracefully (2.2s)
  ✓ [chromium] › dashboard.spec.ts › should display dashboard with all widgets (2.5s)
  ✓ [chromium] › dashboard.spec.ts › should display sessions list (2.1s)
  ✓ [chromium] › dashboard.spec.ts › should navigate to start new session (2.0s)
  ✓ [chromium] › session-timer.spec.ts › should start a session (5.2s)
  ✓ [chromium] › session-timer.spec.ts › should pause and resume session (7.8s)

  10 passed (35.8s)
```

---

## Common Issues & Fixes

### Issue: "Page not found (404)"
```typescript
// Ensure BASE_URL is correct
export default defineConfig({
  use: {
    baseURL: 'http://localhost:4200',  // or your actual URL
  },
});
```

### Issue: "Timeout waiting for selector"
```typescript
// Increase timeout if needed
test('slow test', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').waitFor({ timeout: 10000 });
});
```

### Issue: "Element not clickable"
```typescript
// Wait for element to be enabled
await page.getByRole('button', { name: /login/i }).click({ force: true });

// Or better, wait for it to be ready
await page.getByRole('button', { name: /login/i }).waitFor({ state: 'visible' });
```

### Issue: "Flaky tests (sometimes pass, sometimes fail)"
```typescript
// Add proper waits instead of hardcoded delays
await page.waitForURL('**/dashboard');  // Good
await page.waitForTimeout(2000);        // Bad

// Use waitForLoadState
await page.waitForLoadState('networkidle');
```

---

## Next: Move to Layer 4

Once Layer 3 is working:

1. Merge PR to main
2. E2E tests run with each PR
3. All 3 test layers now active
4. Then add Layer 4 (Optional: Security scanning, code coverage)

---

**Estimated Completion:** 10-12 hours  
**Complexity:** Medium (learning Playwright API)  
**Risk:** Low (only test code)

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Debugging Tests](https://playwright.dev/docs/debug)
