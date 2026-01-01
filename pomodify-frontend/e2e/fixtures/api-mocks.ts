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

const mockActivities = {
  message: 'Activities retrieved successfully',
  activities: [
    {
      activityId: 1,
      activityTitle: 'Test Activity',
      activityDescription: 'Test Description',
      categoryId: 1,
      categoryName: 'Work',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      activityId: 2,
      activityTitle: 'Study Session',
      activityDescription: 'Learning new skills',
      categoryId: 2,
      categoryName: 'Study',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  currentPage: 0,
  totalPages: 1,
  totalItems: 2,
};

const mockSessions = {
  message: 'Sessions retrieved successfully',
  sessions: [
    {
      sessionId: 1,
      activityId: 1,
      sessionType: 'CLASSIC',
      focusTimeInMinutes: 25,
      breakTimeInMinutes: 5,
      cycles: 4,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    },
  ],
  currentPage: 0,
  totalPages: 1,
  totalItems: 1,
};

const mockReports = {
  summary: {
    totalSessions: 10,
    totalFocusMinutes: 250,
    totalBreakMinutes: 50,
    completedSessions: 8,
    averageFocusMinutes: 25,
  },
  focusTimeByDay: [
    { date: new Date().toISOString().split('T')[0], minutes: 120 },
  ],
  sessionsByCategory: [
    { categoryName: 'Work', count: 5 },
    { categoryName: 'Study', count: 3 },
  ],
};

const mockCategories = {
  message: 'Categories retrieved successfully',
  categories: [
    { categoryId: 1, categoryName: 'Work', activitiesCount: 1 },
    { categoryId: 2, categoryName: 'Study', activitiesCount: 1 },
  ],
};

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
    if (url.includes('/api/v2/activities') && !url.includes('/sessions')) {
      console.log('[MOCK] Activities: returning mock data');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockActivities),
      });
    }

    // Sessions endpoint
    if (url.includes('/sessions')) {
      console.log('[MOCK] Sessions: returning mock data');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSessions),
      });
    }

    // Reports endpoint
    if (url.includes('/api/v2/reports')) {
      console.log('[MOCK] Reports: returning mock data');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReports),
      });
    }

    // Settings endpoint
    if (url.includes('/api/v2/settings')) {
      console.log('[MOCK] Settings: returning mock data');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pomodoroDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          notificationsEnabled: true,
          soundEnabled: true,
        }),
      });
    }

    // Categories endpoint
    if (url.includes('/api/v2/categories')) {
      console.log('[MOCK] Categories: returning mock data');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCategories),
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

