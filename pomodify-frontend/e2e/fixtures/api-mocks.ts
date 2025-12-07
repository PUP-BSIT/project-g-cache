import { test as base, Page } from '@playwright/test';

/**
 * API Mock Fixtures
 * Provides mocked API responses for E2E tests
 */

// Mock data
const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date().toISOString(),
};

const mockAuthResponse = {
  accessToken: 'mock-access-token-12345',
  refreshToken: 'mock-refresh-token-12345',
  user: mockUser,
};

const mockDashboardData = {
  totalSessions: 5,
  totalFocusTime: 120,
  todaySessions: 2,
  todayFocusTime: 45,
  recentSessions: [
    {
      id: 1,
      activityName: 'Test Activity',
      duration: 25,
      completedAt: new Date().toISOString(),
    },
  ],
  focusHours: 2.0,
};

const mockActivities = [
  {
    id: 1,
    name: 'Test Activity',
    description: 'Test Description',
    category: 'Work',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Setup API route mocking for a page
 * Routes are matched in order - more specific routes first
 */
async function setupApiMocks(page: Page) {
  // Mock login endpoint (must be before catch-all)
  await page.route('**/api/v1/auth/login', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    
    // Check credentials
    if (postData?.email === 'test@example.com' && postData?.password === 'Password123!') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponse),
      });
    } else {
      // Invalid credentials
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    }
  });

  // Mock register endpoint
  await page.route('**/api/v1/auth/register', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(mockAuthResponse),
    });
  });

  // Mock dashboard endpoint (match with or without query params)
  await page.route('**/api/v1/dashboard*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDashboardData),
    });
  });

  // Mock user profile endpoint
  await page.route('**/api/v1/users/me*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  // Mock activities endpoint
  await page.route('**/api/v1/activities*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockActivities),
    });
  });

  // Mock settings endpoint
  await page.route('**/api/v1/settings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
      }),
    });
  });

  // Mock categories endpoint
  await page.route('**/api/v1/categories*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Work' },
        { id: 2, name: 'Study' },
      ]),
    });
  });

  // Mock refresh token endpoint
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'new-mock-access-token',
      }),
    });
  });

  // Mock logout endpoint
  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out successfully' }),
    });
  });

  // Mock any other API calls with a generic response (catch-all)
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    // Only mock if not already handled by specific routes above
    const isHandled = 
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/dashboard') ||
      url.includes('/users/me') ||
      url.includes('/activities') ||
      url.includes('/settings') ||
      url.includes('/categories') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');
    
    if (!isHandled) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    } else {
      // Let the specific handler process it
      await route.continue();
    }
  });
}

// Extend base test with API mocking
// The page fixture is automatically extended to setup mocks
export const test = base.extend({
  page: async ({ page }, use) => {
    // Setup API mocks before each test uses the page
    await setupApiMocks(page);
    
    // Set up localStorage for auth (if needed)
    await page.addInitScript(() => {
      // Clear any existing auth data
      localStorage.clear();
    });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';

