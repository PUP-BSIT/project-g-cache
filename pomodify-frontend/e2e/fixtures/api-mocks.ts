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
  // Enable request interception logging for debugging
  page.on('request', (request) => {
    if (request.url().includes('/api/v2/')) {
      console.log(`[MOCK] Request: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', (response) => {
    if (response.url().includes('/api/v2/')) {
      console.log(`[MOCK] Response: ${response.status()} ${response.url()}`);
    }
  });

  // Mock login endpoint
  await page.route('**/api/v2/auth/login', async (route) => {
    // Handle OPTIONS preflight requests
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
      return;
    }

    console.log('[MOCK] Intercepted login request');
    const request = route.request();
    let postData;
    try {
      postData = request.postDataJSON();
    } catch (e) {
      postData = null;
    }
    
    // Check credentials
    if (postData?.email === 'test@example.com' && postData?.password === 'Password123!') {
      console.log('[MOCK] Returning success response for login');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify(mockAuthResponse),
      });
    } else {
      console.log('[MOCK] Returning error response for login');
      // Invalid credentials
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    }
  });

  // Mock register endpoint
  await page.route('**/api/v2/auth/register', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(mockAuthResponse),
    });
  });

  // Mock dashboard endpoint (match with or without query params)
  await page.route('**/api/v2/dashboard*', async (route) => {
    console.log('[MOCK] Intercepted dashboard request');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(mockDashboardData),
    });
  });

  // Mock user profile endpoint
  await page.route('**/api/v2/users/me*', async (route) => {
    console.log('[MOCK] Intercepted user profile request');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(mockUser),
    });
  });

  // Mock activities endpoint
  await page.route('**/api/v2/activities*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockActivities),
    });
  });

  // Mock settings endpoint
  await page.route('**/api/v2/settings*', async (route) => {
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
  await page.route('**/api/v2/categories*', async (route) => {
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
  await page.route('**/api/v2/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'new-mock-access-token',
      }),
    });
  });

  // Mock logout endpoint
  await page.route('**/api/v2/auth/logout', async (route) => {
    // Handle OPTIONS preflight
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message: 'Logged out successfully' }),
    });
  });
}

// Extend base test with API mocking
// The page fixture is automatically extended to setup mocks
export const test = base.extend({
  page: async ({ page }, use) => {
    // Setup API mocks BEFORE page is used
    await setupApiMocks(page);
    
    // Set up localStorage for auth (if needed)
    await page.addInitScript(() => {
      // Clear any existing auth data
      localStorage.clear();
    });
    
    // Use the page
    await use(page);
  },
});

export { expect } from '@playwright/test';

