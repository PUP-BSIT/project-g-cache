/**
 * API CONFIGURATION CENTER
 * ------------------------
 * This file centralizes all API links for the Pomodify system.
 * Usage: Import 'API' and use it to get full URLs.
 */

// 1. BASE URL
// const BASE_URL = "https://api.pomodify.site";
const BASE_URL = "http://localhost:8081";

export const OAUTH2_GOOGLE_URL = "https://api.pomodify.site/api/v2/auth/oauth2/google";

// 2. API VERSION
// ------------------------
const API_VERSION = "/api/v2";

// 3. ROOT URL CONSTRUCTION
// ------------------------
// Combines BASE_URL + "/api/v2"
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
    REFRESH: `${ROOT}/auth/refresh`,
    LOGOUT: `${ROOT}/auth/logout`,
    OAUTH2_GOOGLE: `${ROOT}/auth/oauth2/google`,
    RESEND_VERIFICATION: `${ROOT}/auth/resend-verification`,
    FORGOT_PASSWORD: `${ROOT}/auth/forgot-password`,
    FORGOT_PASSWORD_BACKUP: `${ROOT}/auth/forgot-password/backup`,
    CHECK_BACKUP_EMAIL: `${ROOT}/auth/check-backup-email`,
    RESET_PASSWORD: `${ROOT}/auth/reset-password`,
  },

  // User Resource
  USER: {
    PROFILE: `${ROOT}/auth/users/me`,
    UPDATE_PROFILE: `${ROOT}/auth/users/me`,
    DELETE_ACCOUNT: `${ROOT}/auth/users/me`,
    VERIFY_EMAIL: `${ROOT}/auth/verify`,
    UPDATE_BACKUP_EMAIL: `${ROOT}/auth/users/me/backup-email`,
    CHANGE_PASSWORD: `${ROOT}/auth/users/me/password`,
    UPLOAD_PROFILE_PICTURE: `${ROOT}/auth/users/me/profile-picture`,
    DELETE_PROFILE_PICTURE: `${ROOT}/auth/users/me/profile-picture`,
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
            TODOS: {
              SAVE: (activityId: number, sessionId: number) => `${ROOT}/activities/${activityId}/sessions/${sessionId}/todos`,
              GET: (activityId: number, sessionId: number) => `${ROOT}/activities/${activityId}/sessions/${sessionId}/todos`
            },
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
      COMPLETE_EARLY: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/complete-early`,
      COMPLETE_PHASE: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/complete-phase`,
      SKIP_PHASE: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/skip`,
      RESET: (activityId: number, sessionId: number) => 
        `${ROOT}/activities/${activityId}/sessions/${sessionId}/reset`,
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
    CLEAR_SESSIONS: `${ROOT}/settings/sessions/clear`,
    CLEAR_ACTIVITIES: `${ROOT}/settings/activities/clear`,
  },

  // Categories Resource
  CATEGORIES: {
    GET_ALL: `${ROOT}/categories`,
    CREATE: `${ROOT}/categories`,
    DETAILS: (categoryId: number) => `${ROOT}/categories/${categoryId}`,
  },

  // AI Resource
  AI: {
    SUGGEST: `${ROOT}/ai/suggest`,
    GENERATE_PREVIEW: `${ROOT}/ai/generate-preview`,
    GENERATE_PREVIEW_ASYNC: `${ROOT}/ai/generate-preview-async`,
    GET_PREVIEW_ASYNC_RESULT: (requestId: string) => `${ROOT}/ai/generate-preview-async/${requestId}`,
    GENERATE_DUAL_PREVIEW_ASYNC: `${ROOT}/ai/generate-dual-preview-async`,
    GET_DUAL_PREVIEW_ASYNC_RESULT: (requestId: string) => `${ROOT}/ai/generate-dual-preview-async/${requestId}`,
    CONFIRM_PLAN: `${ROOT}/ai/confirm-plan`,
    QUICK_FOCUS: `${ROOT}/ai/quick-focus`,
  },

  // History Resource
  HISTORY: {
    GET_ALL: `${ROOT}/history`,
  },

  // Push Notifications Resource
  PUSH: {
    REGISTER_TOKEN: `${ROOT}/push/register-token`,
    UNREGISTER_TOKEN: `${ROOT}/push/unregister-token`,
    STATUS: `${ROOT}/push/status`,
    ENABLE: `${ROOT}/push/enable`,
    DISABLE: `${ROOT}/push/disable`,
    DEBUG: `${ROOT}/push/debug`,
    TEST: `${ROOT}/push/test`,
  },

  // Badges Resource
  BADGES: {
    GET_ALL: `${ROOT}/badges`,
  },
};

