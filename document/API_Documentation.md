# POMODIFY APP — FULL API DOCUMENTATION

**Last Updated:** December 6, 2025  
**Base URL:** `/api/v1`  
**Authentication:** JWT Token-based (Bearer token in Authorization header)

---

# **USER MANAGEMENT / AUTH**

All auth endpoints return JWT tokens and user information.

---

## **1. POST — `/api/v1/auth/register`**

Register a new user account.

### **Request Body**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

| Field     | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| firstName | string | Yes      | User's first name  |
| lastName  | string | Yes      | User's last name   |
| email     | string | Yes      | User's email       |
| password  | string | Yes      | User's password    |

### **Success Response**

Status: **201 Created**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com"
}
```

### **Fail Response**

Status: **400 Bad Request**
```json
{ "message": "Email already exists" }
```

---

## **2. POST — `/api/v1/auth/login`**

Authenticate user and receive access and refresh tokens.

### **Request Body**

```json
{
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

| Field    | Type   | Required | Description |
| -------- | ------ | -------- | ----------- |
| email    | string | Yes      | User's email    |
| password | string | Yes      | User's password |

### **Success Response**

Status: **200 OK**
```json
{
  "user": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com"
  },
  "accessToken": "<jwt_token>",
  "refreshToken": "<refresh_token>"
}
```

### **Fail Response**

Status: **401 Unauthorized**
```json
{ "message": "Invalid credentials" }
```

---

## **3. POST — `/api/v1/auth/refresh`**

Refresh expired access token using refresh token.

### **Request Body**

```json
{
  "refreshToken": "<refresh_token>"
}
```

| Field        | Type   | Required | Description    |
| ------------ | ------ | -------- | --------------- |
| refreshToken | string | Yes      | Valid refresh token |

### **Success Response**

Status: **200 OK**
```json
{
  "user": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com"
  },
  "accessToken": "<new_jwt_token>",
  "refreshToken": "<new_refresh_token>"
}
```

### **Fail Response**

Status: **401 Unauthorized**
```json
{ "message": "Invalid or expired refresh token" }
```

---

## **4. POST — `/api/v1/auth/logout`**

Logout user and invalidate current token.

### **Request**

- **Header required:** `Authorization: Bearer <accessToken>`

### **Success Response**

Status: **200 OK**
```json
{ "message": "Logged out successfully" }
```

### **Fail Response**

Status: **400 Bad Request**
```json
{ "message": "Missing or invalid Authorization header" }
```

---

## **5. GET — `/api/v1/auth/me`**

Get current authenticated user information.

### **Request**

- **Header required:** `Authorization: Bearer <accessToken>`

### **Success Response**

Status: **200 OK**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com"
}
```

### **Fail Response**

Status: **401 Unauthorized**
```json
{ "message": "Missing token" }
```

---

# **ACTIVITIES**

All activity endpoints require `Authorization: Bearer <accessToken>` header.

---

## **6. POST — `/api/v1/activities`**

Create a new activity.

### **Request Body**

```json
{
  "title": "Study Math",
  "description": "Learn algebra",
  "categoryId": 5
}
```

| Field       | Type   | Required | Description          |
| ----------- | ------ | -------- | -------------------- |
| title       | string | Yes      | Activity title       |
| description | string | No       | Activity description |
| categoryId  | number | No       | Category id          |

### **Success Response**

Status: **201 Created**
```json
{
  "message": "Activity created successfully",
  "activities": [
    {
      "activityId": 123,
      "categoryId": 5,
      "activityTitle": "Study Math",
      "activityDescription": "Learn algebra"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: **400 Bad Request**
```json
{ "message": "Activity title is required" }
```

---

## **7. GET — `/api/v1/activities`**

Retrieve active activities with pagination and filtering.

### **Query Parameters**

| Parameter | Type   | Default | Description       |
| --------- | ------ | ------- | ----------------- |
| page      | number | 0       | Page index        |
| size      | number | 10      | Page size         |
| sortOrder | string | desc    | `asc` or `desc`   |
| sortBy    | string | title   | Field to sort by  |
| categoryId| number | -       | Category filter   |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Active activities fetched successfully.",
  "activities": [
    {
      "activityId": 123,
      "categoryId": 5,
      "activityTitle": "Study Math",
      "activityDescription": "Learn algebra"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: **200 OK** (empty response)
```json
{ "message": "No active activities found." }
```

---

## **8. GET — `/api/v1/activities/deleted`**

Retrieve soft-deleted activities with pagination and filtering.

### **Query Parameters**

Same as `/api/v1/activities`.

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Deleted activities fetched successfully.",
  "activities": [
    {
      "activityId": 200,
      "categoryId": 3,
      "activityTitle": "Old Activity",
      "activityDescription": "Archived"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: **200 OK** (empty response)
```json
{ "message": "No deleted activities found." }
```

---

## **9. GET — `/api/v1/activities/{id}`**

Retrieve a specific activity by ID.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| id        | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Activity fetched successfully",
  "activities": [
    {
      "activityId": 123,
      "categoryId": 5,
      "activityTitle": "Study Math",
      "activityDescription": "Learn algebra"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: **404 Not Found**
```json
{ "message": "Activity not found" }
```

---

## **10. PUT — `/api/v1/activities/{id}`**

Update an existing activity.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| id        | number | Yes      |

### **Request Body**

```json
{
  "newActivityTitle": "Study Physics",
  "newActivityDescription": "Learn mechanics",
  "newCategoryId": 6
}
```

| Field                      | Type   | Required | Description          |
| -------------------------- | ------ | -------- | -------------------- |
| newActivityTitle           | string | No       | Updated title        |
| newActivityDescription     | string | No       | Updated description  |
| newCategoryId              | number | No       | Updated category id  |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Activity updated successfully",
  "activities": [
    {
      "activityId": 123,
      "categoryId": 6,
      "activityTitle": "Study Physics",
      "activityDescription": "Learn mechanics"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: **404 Not Found**
```json
{ "message": "Activity not found" }
```

---

## **11. DELETE — `/api/v1/activities/{id}`**

Soft delete an activity (marks as deleted).

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| id        | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Activity deleted successfully",
  "activities": [
    {
      "activityId": 123,
      "categoryId": 5,
      "activityTitle": "Study Math",
      "activityDescription": "Learn algebra"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: **404 Not Found**
```json
{ "message": "Activity not found" }
```

---

# **CATEGORIES**

All category endpoints require `Authorization: Bearer <accessToken>` header.

---

## **12. POST — `/api/v1/categories`**

Create a new category.

### **Request Body**

```json
{
  "categoryName": "Study"
}
```

| Field        | Type   | Required |
| ------------ | ------ | -------- |
| categoryName | string | Yes      |

### **Success Response**

Status: **201 Created**
```json
{
  "message": "Category created successfully",
  "categories": [
    {
      "categoryId": 1,
      "categoryName": "Study",
      "activitiesCount": 0
    }
  ]
}
```

### **Fail Response**

Status: **400 Bad Request**
```json
{ "message": "Invalid input" }
```

---

## **13. PUT — `/api/v1/categories/{id}`**

Update an existing category.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| id        | number | Yes      |

### **Request Body**

```json
{
  "newCategoryName": "Learning"
}
```

| Field              | Type   | Required |
| ------------------ | ------ | -------- |
| newCategoryName    | string | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Category updated successfully",
  "categories": [
    {
      "categoryId": 1,
      "categoryName": "Learning",
      "activitiesCount": 2
    }
  ]
}
```

### **Fail Response**

Status: **404 Not Found**
```json
{ "message": "Category not found" }
```

---

## **14. DELETE — `/api/v1/categories/{id}`**

Delete a category.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| id        | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Category deleted successfully",
  "categories": [
    {
      "categoryId": 1,
      "categoryName": "Study",
      "activitiesCount": 0
    }
  ]
}
```

### **Fail Response**

Status: **404 Not Found**
```json
{ "message": "Category not found" }
```

---

## **15. GET — `/api/v1/categories`**

Retrieve all categories for the authenticated user.

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Categories retrieved successfully: 2",
  "categories": [
    {
      "categoryId": 1,
      "categoryName": "Study",
      "activitiesCount": 3
    },
    {
      "categoryId": 2,
      "categoryName": "Work",
      "activitiesCount": 1
    }
  ]
}
```

### **Fail Response**

Status: **200 OK** (empty response)
```json
{ "message": "No categories found" }
```

---

# **DASHBOARD**

---

## **16. GET — `/api/v1/dashboard`**

Retrieve dashboard statistics for the authenticated user.

### **Request Headers**

| Header      | Type   | Default      | Description                      |
| ----------- | ------ | ------------ | -------------------------------- |
| Authorization | string | Required     | Bearer token                    |
| X-Timezone  | string | Asia/Manila  | Timezone for data calculation    |

### **Success Response**

Status: **200 OK**
```json
{
  "currentStreak": 5,
  "bestStreak": 10,
  "totalActivities": 12,
  "totalSessions": 45,
  "focusHoursToday": 3.5,
  "focusHoursThisWeek": 22.75,
  "focusHoursAllTime": 156.25,
  "recentSessions": [
    {
      "id": 101,
      "activityId": 5,
      "activityName": "Study Math",
      "completedAt": "2025-12-06T15:30:00",
      "cyclesCompleted": 3,
      "focusHours": 1.25
    }
  ]
}
```

### **Fail Response**

Status: **401 Unauthorized**
```json
{ "message": "Unauthorized: invalid user claim" }
```

---

# **PUSH NOTIFICATIONS**

All push endpoints require `Authorization: Bearer <accessToken>` header.

---

## **17. POST — `/api/v1/push/register-token`**

Register a push notification token.

### **Request Body**

```json
{
  "token": "<firebase-push-notification-token>"
}
```

| Field | Type   | Required | Description           |
| ----- | ------ | -------- | --------------------- |
| token | string | Yes      | Push notification token |

### **Success Response**

Status: **200 OK**
```json
"Token registered"
```

### **Fail Response**

Status: **400 Bad Request**
```json
"Missing token"
```

Status: **401 Unauthorized**
```json
"Unauthorized"
```

---

## **18. DELETE — `/api/v1/push/unregister-token`**

Unregister and remove push notification token.

### **Success Response**

Status: **200 OK**
```json
"Token unregistered"
```

### **Fail Response**

Status: **401 Unauthorized**
```json
"Unauthorized"
```

---

## **19. GET — `/api/v1/push/status`**

Check push notification status.

### **Success Response**

Status: **200 OK**
```json
{
  "registered": true,
  "enabled": true
}
```

### **Fail Response**

Status: **401 Unauthorized**
```json
"Unauthorized"
```

---

## **20. PUT — `/api/v1/push/enable`**

Enable push notifications.

### **Success Response**

Status: **200 OK**
```json
"Push enabled"
```

### **Fail Response**

Status: **400 Bad Request**
```json
"No token registered"
```

Status: **401 Unauthorized**
```json
"Unauthorized"
```

---

## **21. PUT — `/api/v1/push/disable`**

Disable push notifications.

### **Success Response**

Status: **200 OK**
```json
"Push disabled"
```

### **Fail Response**

Status: **400 Bad Request**
```json
"No token registered"
```

Status: **401 Unauthorized**
```json
"Unauthorized"
```

---

# **SESSIONS**

All session endpoints require `Authorization: Bearer <accessToken>` header.

---

## **22. POST — `/api/v1/activities/{activityId}/sessions`**

Create a new session for an activity.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |

### **Request Body**

```json
{
  "sessionType": "POMODORO",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4
}
```

| Field                | Type   | Required | Description               |
| -------------------- | ------ | -------- | ------------------------- |
| sessionType          | string | Yes      | Type of session (e.g. POMODORO) |
| focusTimeInMinutes   | number | Yes      | Focus duration in minutes |
| breakTimeInMinutes   | number | Yes      | Break duration in minutes |
| cycles               | number | Yes      | Number of cycles         |

### **Success Response**

Status: **201 Created**
```json
{
  "message": "Session created successfully",
  "sessions": [
    {
      "id": 3,
      "activityId": 5,
      "sessionType": "POMODORO",
      "status": "NOT_STARTED",
      "currentPhase": "FOCUS",
      "focusTimeInMinutes": 25,
      "breakTimeInMinutes": 5,
      "cycles": 4,
      "cyclesCompleted": 0,
      "totalTimeInMinutes": 120,
      "note": null,
      "startedAt": null,
      "completedAt": null,
      "createdAt": "2025-12-05T15:26:29.592753"
    }
  ],
  "currentPage": 0,
  "totalPages": 0,
  "totalItems": 1
}
```

---

## **23. GET — `/api/v1/activities/{activityId}/sessions`**

Retrieve all sessions for an activity.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |

### **Query Parameters**

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| status    | string | No       | Filter by session status  |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Sessions retrieved successfully",
  "sessions": [
    {
      "id": 1,
      "activityId": 1,
      "sessionType": "POMODORO",
      "status": "NOT_STARTED",
      "currentPhase": "FOCUS",
      "focusTimeInMinutes": 25,
      "breakTimeInMinutes": 5,
      "cycles": 4,
      "cyclesCompleted": 0,
      "totalTimeInMinutes": 120,
      "note": null,
      "startedAt": null,
      "completedAt": null,
      "createdAt": "2025-12-05T15:26:29.592753"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

---

## **24. GET — `/api/v1/activities/{activityId}/sessions/{id}`**

Retrieve a specific session.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session retrieved successfully",
  "sessions": [
    {
      "id": 1,
      "activityId": 1,
      "sessionType": "POMODORO",
      "status": "NOT_STARTED",
      "currentPhase": "FOCUS",
      "focusTimeInMinutes": 25,
      "breakTimeInMinutes": 5,
      "cycles": 4,
      "cyclesCompleted": 0,
      "totalTimeInMinutes": 120,
      "note": null,
      "startedAt": null,
      "completedAt": null,
      "createdAt": "2025-12-05T15:26:29.592753"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

---

## **25. DELETE — `/api/v1/activities/{activityId}/sessions/{id}`**

Delete a session.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session deleted successfully",
  "sessions": [],
  "currentPage": 0,
  "totalPages": 0,
  "totalItems": 0
}
```

---

## **26. POST — `/api/v1/activities/{activityId}/sessions/{id}/start`**

Start a session.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session started successfully",
  "sessions": [
    {
      "id": 1,
      "status": "IN_PROGRESS",
      "currentPhase": "FOCUS"
    }
  ]
}
```

---

## **27. POST — `/api/v1/activities/{activityId}/sessions/{id}/pause`**

Pause a session.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Query Parameters**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| note      | string | No       | Session note |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session paused successfully",
  "sessions": [
    {
      "id": 1,
      "status": "PAUSED"
    }
  ]
}
```

---

## **28. POST — `/api/v1/activities/{activityId}/sessions/{id}/resume`**

Resume a paused session.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session resumed successfully",
  "sessions": [
    {
      "id": 1,
      "status": "IN_PROGRESS"
    }
  ]
}
```

---

## **29. POST — `/api/v1/activities/{activityId}/sessions/{id}/stop`**

Stop a session (current cycle invalidated).

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Query Parameters**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| note      | string | No       | Session note |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session stopped successfully (current cycle invalidated)",
  "sessions": [
    {
      "id": 1,
      "status": "STOPPED"
    }
  ]
}
```

---

## **30. POST — `/api/v1/activities/{activityId}/sessions/{id}/cancel`**

Cancel a session (all cycles invalidated).

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session canceled successfully (all cycles invalidated)",
  "sessions": [
    {
      "id": 1,
      "status": "CANCELED"
    }
  ]
}
```

---

## **31. POST — `/api/v1/activities/{activityId}/sessions/{id}/finish`**

Finish a session.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Query Parameters**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| note      | string | No       | Session note |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session finished successfully",
  "sessions": [
    {
      "id": 1,
      "status": "COMPLETED"
    }
  ]
}
```

---

## **32. POST — `/api/v1/activities/{activityId}/sessions/{id}/complete-phase`**

Complete current phase and move to next.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Query Parameters**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| note      | string | No       | Session note |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Phase completed: BREAK",
  "sessions": [
    {
      "id": 1,
      "currentPhase": "BREAK",
      "cyclesCompleted": 1
    }
  ]
}
```

---

## **33. PUT — `/api/v1/activities/{activityId}/sessions/{id}/note`**

Update session note.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Query Parameters**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| note      | string | Yes      | Note text   |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Note updated successfully",
  "sessions": [
    {
      "id": 1,
      "note": "Updated note"
    }
  ]
}
```

---

## **34. GET — `/api/v1/activities/{activityId}/sessions/{id}/events`**

Subscribe to real-time session updates using Server-Sent Events (SSE).

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Request Header**

| Header | Value |
| ------ | ----- |
| Accept | text/event-stream |

### **Events**

- **`connected`**: Sent upon successful connection
- **`phase-change`**: Sent when session phase changes (e.g., FOCUS → BREAK)

### **Event Data Example**
```json
{
  "sessionId": 1,
  "currentPhase": "BREAK",
  "cyclesCompleted": 1,
  "totalCycles": 4,
  "status": "IN_PROGRESS",
  "timestamp": "2023-10-27T10:25:00Z"
}
```

---

# **REPORTS & ANALYTICS**

---

## **35. GET — `/api/v1/reports/summary`**

Retrieve aggregated summary statistics for a specified date range.

### **Request Headers**

| Header        | Type   | Required |
| ------------- | ------ | -------- |
| Authorization | string | Yes      |

### **Query Parameters**

| Parameter | Type   | Default | Description                              |
| --------- | ------ | ------- | ---------------------------------------- |
| range     | string | week    | Summary range: `week`, `month`, `year`   |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Summary retrieved successfully",
  "item": {
    "meta": {
      "range": "WEEKLY",
      "startDate": "2025-11-24",
      "endDate": "2025-11-30"
    },
    "metrics": {
      "totalFocusedHours": 22.75,
      "completionRate": 85,
      "avgSessionMinutes": 45
    },
    "chartData": {
      "labels": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "datasets": {
        "focus": [3.5, 4.25, 5.0, 2.75, 7.25, 0, 0],
        "breakHours": [0.7, 0.85, 1.0, 0.55, 1.45, 0, 0]
      }
    },
    "recentSessions": [
      {
        "id": 101,
        "activityName": "Study Math",
        "date": "2025-12-05T15:30:00",
        "focusDurationMinutes": 75,
        "breakDurationMinutes": 15,
        "status": "COMPLETED",
        "mode": "POMODORO"
      }
    ],
    "topActivities": [
      {
        "rank": 1,
        "name": "Study Math",
        "totalDurationMinutes": 450,
        "sessionCount": 10
      }
    ]
  }
}
```

### **Fail Response**

Status: **401 Unauthorized**
```json
{ "message": "Unauthorized: invalid user claim" }
```

---

# **SETTINGS**

---

## **36. GET — `/api/v1/settings`**

Retrieve user settings.

### **Request Headers**

| Header        | Type   | Required |
| ------------- | ------ | -------- |
| Authorization | string | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "userId": 1,
  "soundType": "DEFAULT",
  "notificationSound": true,
  "volume": 80,
  "tickSound": true,
  "autoStartBreaks": true,
  "autoStartPomodoros": false,
  "theme": "LIGHT",
  "notificationsEnabled": true,
  "googleCalendarSync": false
}
```

### **Fail Response**

Status: **401 Unauthorized**
```json
{ "message": "Unauthorized: invalid user claim" }
```

---

## **37. PATCH — `/api/v1/settings`**

Update user settings.

### **Request Headers**

| Header        | Type   | Required |
| ------------- | ------ | -------- |
| Authorization | string | Yes      |

### **Request Body**

```json
{
  "soundType": "NATURE",
  "notificationSound": true,
  "volume": 75,
  "tickSound": false,
  "autoStartBreaks": true,
  "autoStartPomodoros": true,
  "theme": "DARK",
  "notificationsEnabled": true,
  "googleCalendarSync": false
}
```

| Field                  | Type    | Required | Description                    |
| ---------------------- | ------- | -------- | ------------------------------ |
| soundType              | string  | No       | Sound type preference          |
| notificationSound      | boolean | No       | Enable notification sounds     |
| volume                 | number  | No       | Volume level (0-100)           |
| tickSound              | boolean | No       | Enable tick sounds             |
| autoStartBreaks        | boolean | No       | Auto start break timer         |
| autoStartPomodoros     | boolean | No       | Auto start pomodoro timer      |
| theme                  | string  | No       | Theme (LIGHT/DARK)             |
| notificationsEnabled   | boolean | No       | Enable notifications           |
| googleCalendarSync     | boolean | No       | Enable Google Calendar sync    |

### **Success Response**

Status: **200 OK**
```json
{
  "userId": 1,
  "soundType": "NATURE",
  "notificationSound": true,
  "volume": 75,
  "tickSound": false,
  "autoStartBreaks": true,
  "autoStartPomodoros": true,
  "theme": "DARK",
  "notificationsEnabled": true,
  "googleCalendarSync": false
}
```

### **Fail Response**

Status: **400 Bad Request**
```json
{ "message": "Invalid settings" }
```

Status: **401 Unauthorized**
```json
{ "message": "Unauthorized: invalid user claim" }
```

---

# **ERROR RESPONSES**

The API uses standardized error responses with appropriate HTTP status codes and error messages.

---

## **Common Error Codes**

| Status Code | Description | Example Response |
| ----------- | ----------- | --------------- |
| 400 | Bad Request | `{ "message": "fieldName: must not be blank" }` |
| 401 | Unauthorized | `{ "message": "JWT expired", "code": "TOKEN_EXPIRED" }` |
| 404 | Not Found | `{ "message": "Resource not found" }` |
| 500 | Internal Server Error | `{ "message": "Unexpected error message" }` |

---

## **Authentication Errors**

```json
{
  "message": "JWT expired",
  "code": "TOKEN_EXPIRED",
  "timestamp": "2025-12-06T10:30:00Z"
}
```

---

## **Validation Errors**

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email"
    },
    {
      "field": "password",
      "message": "must be at least 8 characters"
    }
  ]
}
```

---

# **NOTES**

- **Base URL:** All endpoints use `/api/v1` as the base
- **Authentication:** All endpoints except registration and login require a valid JWT token in the `Authorization: Bearer <token>` header
- **Time Format:** All times are in ISO 8601 format (UTC)
- **Rate Limiting:** Currently not enforced but may be implemented in future versions
- **API Versioning:** Current version is v1
- **CORS:** Enabled for the frontend application
- **Content Type:** All requests and responses use `application/json` unless otherwise specified