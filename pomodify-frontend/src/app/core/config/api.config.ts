/**
 * API CONFIGURATION CENTER
 * ------------------------
 * This file centralizes all API links for the Pomodify system.
 * Usage: Import 'API' and use it to get full URLs.
 */

// 1. BASE URL
const BASE_URL = "https://api.pomodify.site";

// 2. API VERSION
// ------------------------
// Changing this one string updates every endpoint in the app to v2, etc.
const API_VERSION = "/api/v1";

// 3. ROOT URL CONSTRUCTION
// ------------------------
// Combines "https://api.pomodify.site" + "/api/v1"
const ROOT = `${BASE_URL}${API_VERSION}`;

// 4. ENDPOINTS
// ------------------------
// Organized by Resource (Auth, Activities, Dashboard, etc.)
export const API = {
  // General Info
  ROOT: ROOT, // Useful for health checks and base reference

  // Auth Resource
  AUTH: {
    LOGIN: `${ROOT}/auth/login`,
    REGISTER: `${ROOT}/auth/register`,
    REFRESH: `${ROOT}/auth/refresh-token`,
    LOGOUT: `${ROOT}/auth/logout`,
  },

  // User Resource
  USER: {
    PROFILE: `${ROOT}/users/me`,
    UPDATE_PROFILE: `${ROOT}/users/me`,
    VERIFY_EMAIL: `${ROOT}/users/verify-email`,
  },

  // Activities Resource
  ACTIVITIES: {
    BASE: `${ROOT}/activities`,
    GET_ALL: `${ROOT}/activities`,
    CREATE: `${ROOT}/activities`,
    DETAILS: (activityId: number) => `${ROOT}/activities/${activityId}`,
    UPDATE: (activityId: number) => `${ROOT}/activities/${activityId}`,
    DELETE: (activityId: number) => `${ROOT}/activities/${activityId}`,
    
    // Activity Sessions (nested resource)
    SESSIONS: {
      GET_ALL: (activityId: number) => `${ROOT}/activities/${activityId}/sessions`,
      CREATE: (activityId: number) => `${ROOT}/activities/${activityId}/sessions`,
      DETAILS: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}`,
      UPDATE: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}`,
      DELETE: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}`,
      
      // Session Actions
      START: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/start`,
      PAUSE: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/pause`,
      RESUME: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/resume`,
      STOP: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/stop`,
      CANCEL: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/cancel`,
      COMPLETE_PHASE: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/complete-phase`,
      FINISH: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/finish`,
      UPDATE_NOTE: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/note`,
      EVENTS: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/events`,
    },

    // Activity Notes (nested resource)
    NOTES: {
      GET_ALL: (activityId: number) => `${ROOT}/activities/${activityId}/notes`,
      CREATE: (activityId: number) => `${ROOT}/activities/${activityId}/notes`,
      DETAILS: (activityId: number, noteId: number) => 
        `${ROOT}/activities/${activityId}/notes/${noteId}`,
      UPDATE: (activityId: number, noteId: number) => 
        `${ROOT}/activities/${activityId}/notes/${noteId}`,
      DELETE: (activityId: number, noteId: number) => 
        `${ROOT}/activities/${activityId}/notes/${noteId}`,
    },
  },

  // Dashboard Resource
  DASHBOARD: {
    GET_DATA: `${ROOT}/dashboard`,
  },

  // Reports Resource
  REPORTS: {
    SUMMARY: `${ROOT}/reports/summary`,
    FOCUS_TIME: `${ROOT}/reports/focus-time`,
    SESSIONS: `${ROOT}/reports/sessions`,
  },

  // Settings Resource
  SETTINGS: {
    GET: `${ROOT}/settings`,
    UPDATE: `${ROOT}/settings`,
  },

  // Categories Resource
  CATEGORIES: {
    GET_ALL: `${ROOT}/categories`,
    CREATE: `${ROOT}/categories`,
    DETAILS: (categoryId: number) => `${ROOT}/categories/${categoryId}`,
  },

  // History Resource
  HISTORY: {
    GET_ALL: `${ROOT}/history`,
  },
};

/**
 * EXAMPLE USAGE:
 * 
 * import { API } from '@core/config/api.config';
 * 
 * // Static endpoints
 * this.http.post(API.AUTH.LOGIN, credentials);
 * this.http.get(API.DASHBOARD.GET_DATA);
 * 
 * // Dynamic endpoints with IDs
 * this.http.get(API.ACTIVITIES.DETAILS(123));
 * this.http.post(API.ACTIVITIES.SESSIONS.CREATE(123), sessionData);
 * this.http.delete(API.ACTIVITIES.NOTES.DELETE(123, 456));
 */
