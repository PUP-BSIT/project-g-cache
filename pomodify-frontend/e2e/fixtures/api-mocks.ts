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
 */
async function setupApiMocks(page: Page) {
  // Intercept all requests and handle API mocking
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Only mock API routes
    if (!url.includes('/api/')) {
      return route.continue();
    }

    console.log(`[MOCK] Intercepting: ${method} ${url}`);

    // Login endpoint
    if (url.includes('/api/v2/auth/login')) {
      if (method === 'OPTIONS') {
        return route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      try {
        const postData = route.request().postDataJSON();
        if (postData?.email === 'test@example.com' && postData?.password === 'Password123!') {
          console.log('[MOCK] Login: returning success');
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockAuthResponse),
          });
        }
      } catch (e) {
        console.log('[MOCK] Login: error parsing request data');
      }
      console.log('[MOCK] Login: returning error');
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    }

    // Register endpoint
    if (url.includes('/api/v2/auth/register')) {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponse),
      });
    }

    // Dashboard endpoint
    if (url.includes('/api/v2/dashboard')) {
      console.log('[MOCK] Dashboard: returning mock data');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData),
      });
    }

    // User profile endpoint
    if (url.includes('/api/v2/auth/users/me')) {
      if (method === 'OPTIONS') {
        return route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
      console.log('[MOCK] Profile: returning mock user');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      });
    }

    // Activities endpoint
    if (url.includes('/api/v2/activities')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockActivities),
      });
    }

    // Settings endpoint
    if (url.includes('/api/v2/settings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pomodoroDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
        }),
      });
    }

    // Categories endpoint
    if (url.includes('/api/v2/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Work' },
          { id: 2, name: 'Study' },
        ]),
      });
    }

    // Refresh token endpoint
    if (url.includes('/api/v2/auth/refresh')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'new-mock-access-token',
        }),
      });
    }

    // Logout endpoint
    if (url.includes('/api/v2/auth/logout')) {
      if (method === 'OPTIONS') {
        return route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' }),
      });
    }

    // Unmapped API route - log and block
    console.log(`[MOCK] No handler for: ${method} ${url}`);
    return route.abort('blockedbyclient');
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

