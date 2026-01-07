# POMODIFY APP — FULL API DOCUMENTATION

**Last Updated:** January 8, 2026  
**Base URL:** No prefix (direct endpoints)  
**Authentication:** JWT Token-based (Bearer token in Authorization header or HTTP-only cookies)  
**Real-time:** Server-Sent Events (SSE) for session updates

---

# **USER MANAGEMENT / AUTH**

All auth endpoints support both JWT tokens and HTTP-only cookie authentication. OAuth2 Google integration is available.

---

## **1. POST — `/auth/register`**

Register a new user account with email verification.

### **Request Body**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

| Field     | Type   | Required | Validation        |
| --------- | ------ | -------- | ----------------- |
| firstName | string | Yes      | 1-50 characters   |
| lastName  | string | Yes      | 1-50 characters   |
| email     | string | Yes      | Valid email format |
| password  | string | Yes      | Min 8 characters  |

### **Success Response**

Status: **201 Created**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "emailVerified": false
}
```

### **Fail Response**

Status: **400 Bad Request**
```json
{ "message": "Email already exists" }
```

---

## **2. POST — `/auth/login`**

Authenticate user and receive access and refresh tokens (as cookies or JSON).

### **Request Body**

```json
{
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "user": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "emailVerified": true,
    "profilePictureUrl": null
  },
  "accessToken": "<jwt_token>",
  "refreshToken": "<refresh_token>"
}
```

**Cookies Set:**
- `accessToken` (HttpOnly, 15 minutes)
- `refreshToken` (HttpOnly, 30 days)

### **Fail Response**

Status: **401 Unauthorized**
```json
{ "message": "Invalid credentials" }
```

---

## **3. POST — `/auth/refresh`**

Refresh expired access token using refresh token.

### **Request Body**

```json
{
  "refreshToken": "<refresh_token>"
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "user": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "emailVerified": true
  },
  "accessToken": "<new_jwt_token>",
  "refreshToken": "<new_refresh_token>"
}
```

---

## **4. POST — `/auth/logout`**

Logout user and invalidate current token.

### **Success Response**

Status: **200 OK**
```json
{ "message": "Logged out successfully" }
```

---

## **5. GET — `/auth/users/me`**

Get current authenticated user information.

### **Success Response**

Status: **200 OK**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "emailVerified": true,
  "profilePictureUrl": "/auth/users/me/profile-picture/filename.jpg",
  "backupEmail": "backup@example.com"
}
```

---

## **6. PUT — `/auth/users/me`**

Update user profile information.

### **Request Body**

```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com"
}
```

---

## **7. DELETE — `/auth/users/me`**

Delete user account and all associated data.

### **Success Response**

Status: **200 OK**
```json
{ "message": "Account deleted successfully" }
```

---

## **8. POST — `/auth/forgot-password`**

Request password reset via email.

### **Request Body**

```json
{
  "email": "jane@example.com"
}
```

### **Success Response**

Status: **200 OK**
```json
{ "message": "Password reset email sent" }
```

---

## **9. POST — `/auth/forgot-password/backup`**

Request password reset via backup email.

### **Request Body**

```json
{
  "backupEmail": "backup@example.com"
}
```

### **Success Response**

Status: **200 OK**
```json
{ "message": "Password reset email sent to backup email" }
```

---

## **10. GET — `/auth/check-backup-email`**

Check if backup email exists for account.

### **Query Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| email     | string | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "hasBackupEmail": true,
  "maskedBackupEmail": "b****@example.com"
}
```

---

## **11. POST — `/auth/reset-password`**

Reset password using reset token.

### **Request Body**

```json
{
  "token": "<reset_token>",
  "newPassword": "newSecurePassword123"
}
```

### **Success Response**

Status: **200 OK**
```json
{ "message": "Password reset successfully" }
```

---

## **12. POST — `/auth/users/me/backup-email`**

Update backup email address.

### **Request Body**

```json
{
  "backupEmail": "backup@example.com"
}
```

### **Success Response**

Status: **200 OK**
```json
{ "message": "Backup email updated successfully" }
```

---

## **13. POST — `/auth/users/me/password`**

Change user password.

### **Request Body**

```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newPassword123"
}
```

### **Success Response**

Status: **200 OK**
```json
{ "message": "Password changed successfully" }
```

---

## **14. GET — `/auth/verify`**

Verify email address using verification token.

### **Query Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| token     | string | Yes      |

### **Success Response**

Status: **200 OK**
```json
{ "message": "Email verified successfully" }
```

---

## **15. POST — `/auth/resend-verification`**

Resend email verification.

### **Request Body**

```json
{
  "email": "jane@example.com"
}
```

### **Success Response**

Status: **200 OK**
```json
{ "message": "Verification email sent" }
```

---

## **16. POST — `/auth/users/me/profile-picture`**

Upload profile picture.

### **Request**

- **Content-Type:** `multipart/form-data`
- **Body:** File upload (max 5MB, JPG/PNG/GIF)

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Profile picture uploaded successfully",
  "profilePictureUrl": "/auth/users/me/profile-picture/filename.jpg"
}
```

---

## **17. DELETE — `/auth/users/me/profile-picture`**

Delete profile picture.

### **Success Response**

Status: **200 OK**
```json
{ "message": "Profile picture deleted successfully" }
```

---

## **18. GET — `/auth/users/me/profile-picture/{fileName}`**

Retrieve profile picture.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| fileName  | string | Yes      |

### **Success Response**

Status: **200 OK**
- **Content-Type:** `image/jpeg`, `image/png`, or `image/gif`
- **Body:** Image binary data

---

## **19. GET — `/auth/oauth2/google`**

Initiate Google OAuth2 authentication flow.

### **Success Response**

Redirects to Google OAuth2 consent screen, then back to application with authentication cookies set.

---

# **ACTIVITIES**

All activity endpoints require `Authorization: Bearer <accessToken>` header or authentication cookies.

---

## **20. POST — `/activities`**

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

## **21. GET — `/activities`**

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

## **22. GET — `/activities/deleted`**

Retrieve soft-deleted activities with pagination and filtering.

### **Query Parameters**

Same as `/activities`.

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

---

## **23. GET — `/activities/{id}`**

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

## **24. GET — `/activities/{id}/bin`**

Retrieve a deleted activity with its sessions.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| id        | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Deleted activity with sessions fetched successfully",
  "activity": {
    "activityId": 123,
    "activityTitle": "Study Math",
    "activityDescription": "Learn algebra"
  },
  "sessions": [
    {
      "id": 1,
      "sessionType": "POMODORO",
      "status": "COMPLETED",
      "cyclesCompleted": 4
    }
  ]
}
```

---

## **25. PUT — `/activities/{id}`**

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

## **26. DELETE — `/activities/{id}`**

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

All category endpoints require `Authorization: Bearer <accessToken>` header or authentication cookies.

---

## **27. POST — `/categories`**

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

## **28. GET — `/categories`**

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

## **29. PUT — `/categories/{id}`**

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

## **30. DELETE — `/categories/{id}`**

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

# **SESSIONS**

All session endpoints require `Authorization: Bearer <accessToken>` header or authentication cookies.

---

## **31. POST — `/activities/{activityId}/sessions`**

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
  "cycles": 4,
  "enableLongBreak": true,
  "longBreakTimeInMinutes": 15,
  "longBreakIntervalInMinutes": 4
}
```

| Field                      | Type    | Required | Description                    |
| -------------------------- | ------- | -------- | ------------------------------ |
| sessionType                | string  | Yes      | POMODORO or FREESTYLE          |
| focusTimeInMinutes         | number  | Yes      | Focus duration in minutes      |
| breakTimeInMinutes         | number  | Yes      | Break duration in minutes      |
| cycles                     | number  | Yes      | Number of cycles               |
| enableLongBreak            | boolean | No       | Enable long breaks             |
| longBreakTimeInMinutes     | number  | No       | Long break duration            |
| longBreakIntervalInMinutes | number  | No       | Cycles before long break       |

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
      "enableLongBreak": true,
      "longBreakTimeInMinutes": 15,
      "longBreakIntervalInMinutes": 4,
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

## **32. GET — `/activities/{activityId}/sessions`**

Retrieve all active sessions for an activity.

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

## **33. GET — `/activities/{activityId}/sessions/deleted`**

Retrieve all deleted sessions for an activity.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Deleted sessions retrieved successfully",
  "sessions": [
    {
      "id": 2,
      "activityId": 1,
      "sessionType": "POMODORO",
      "status": "DELETED",
      "deletedAt": "2025-12-05T16:00:00"
    }
  ]
}
```

---

## **34. GET — `/activities/{activityId}/sessions/{id}`**

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

## **35. PATCH — `/activities/{activityId}/sessions/{id}`**

Update session settings (focus time, break time, cycles).

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Request Body**

```json
{
  "focusTimeInMinutes": 30,
  "breakTimeInMinutes": 10,
  "cycles": 3
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session updated successfully",
  "sessions": [
    {
      "id": 1,
      "focusTimeInMinutes": 30,
      "breakTimeInMinutes": 10,
      "cycles": 3
    }
  ]
}
```

---

## **36. DELETE — `/activities/{activityId}/sessions/{id}`**

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

## **SESSION LIFECYCLE OPERATIONS**

---

## **37. POST — `/activities/{activityId}/sessions/{id}/start`**

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
      "currentPhase": "FOCUS",
      "startedAt": "2025-12-05T15:30:00"
    }
  ]
}
```

---

## **38. POST — `/activities/{activityId}/sessions/{id}/pause`**

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

## **39. POST — `/activities/{activityId}/sessions/{id}/resume`**

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

## **40. POST — `/activities/{activityId}/sessions/{id}/stop`**

Stop a session (abandon current cycle).

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

## **41. POST — `/activities/{activityId}/sessions/{id}/complete-early`**

Complete session early with current progress.

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
  "message": "Session completed early successfully",
  "sessions": [
    {
      "id": 1,
      "status": "COMPLETED",
      "completedAt": "2025-12-05T16:00:00"
    }
  ]
}
```

---

## **42. POST — `/activities/{activityId}/sessions/{id}/skip`**

Skip current phase (freestyle sessions only).

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Phase skipped successfully",
  "sessions": [
    {
      "id": 1,
      "currentPhase": "BREAK"
    }
  ]
}
```

---

## **43. POST — `/activities/{activityId}/sessions/{id}/reset`**

Reset session to initial state.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session reset successfully",
  "sessions": [
    {
      "id": 1,
      "status": "NOT_STARTED",
      "currentPhase": "FOCUS",
      "cyclesCompleted": 0
    }
  ]
}
```

---

## **44. POST — `/activities/{activityId}/sessions/{id}/complete-phase`**

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

## **SESSION NOTES & TODOS**

---

## **45. GET — `/activities/{activityId}/sessions/{id}/note`**

Get session note with todo items.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "noteText": "Session notes here",
  "items": [
    {
      "id": 1,
      "text": "Complete task 1",
      "completed": false,
      "order": 0
    },
    {
      "id": 2,
      "text": "Review materials",
      "completed": true,
      "order": 1
    }
  ]
}
```

---

## **46. PUT — `/activities/{activityId}/sessions/{id}/note`**

Update session note.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Request Body**

```json
{
  "noteText": "Updated session notes"
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Note updated successfully",
  "noteText": "Updated session notes"
}
```

---

## **47. GET — `/activities/{activityId}/sessions/{id}/todos`**

Get session todo items.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "items": [
    {
      "id": 1,
      "text": "Complete task 1",
      "completed": false,
      "order": 0
    }
  ]
}
```

---

## **48. POST — `/activities/{activityId}/sessions/{id}/todos`**

Save todo items for session.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |

### **Request Body**

```json
{
  "items": [
    {
      "text": "New todo item",
      "completed": false,
      "order": 0
    }
  ]
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Todos saved successfully",
  "items": [
    {
      "id": 3,
      "text": "New todo item",
      "completed": false,
      "order": 0
    }
  ]
}
```

---

## **49. PATCH — `/activities/{activityId}/sessions/{id}/note/items/{itemId}/toggle`**

Toggle todo item completion status.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |
| itemId     | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Todo item toggled successfully",
  "item": {
    "id": 1,
    "text": "Complete task 1",
    "completed": true,
    "order": 0
  }
}
```

---

## **50. PATCH — `/activities/{activityId}/sessions/{id}/note/items/{itemId}`**

Update todo item text.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |
| itemId     | number | Yes      |

### **Request Body**

```json
{
  "text": "Updated todo text"
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Todo item updated successfully",
  "item": {
    "id": 1,
    "text": "Updated todo text",
    "completed": false,
    "order": 0
  }
}
```

---

## **51. DELETE — `/activities/{activityId}/sessions/{id}/note/items/{itemId}`**

Delete todo item.

### **Path Parameters**

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| activityId | number | Yes      |
| id         | number | Yes      |
| itemId     | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Todo item deleted successfully"
}
```

---

## **REAL-TIME SESSION EVENTS**

---

## **52. GET — `/activities/{activityId}/sessions/{id}/events`**

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

# **DASHBOARD**

---

## **53. GET — `/dashboard`**

Retrieve dashboard statistics for the authenticated user.

### **Request Headers**

| Header        | Type   | Default     | Description                   |
| ------------- | ------ | ----------- | ----------------------------- |
| Authorization | string | Required    | Bearer token                  |
| X-Timezone    | string | Asia/Manila | Timezone for data calculation |

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
  ],
  "badges": [
    {
      "id": 1,
      "name": "First Session",
      "description": "Complete your first session",
      "iconUrl": "/badges/first-session.png",
      "unlockedAt": "2025-12-01T10:00:00"
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

# **BADGES**

---

## **54. GET — `/badges`**

Retrieve user achievement badges.

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Badges retrieved successfully",
  "badges": [
    {
      "id": 1,
      "name": "First Session",
      "description": "Complete your first session",
      "iconUrl": "/badges/first-session.png",
      "unlockedAt": "2025-12-01T10:00:00",
      "category": "MILESTONE"
    },
    {
      "id": 2,
      "name": "Week Warrior",
      "description": "Complete 7 days in a row",
      "iconUrl": "/badges/week-warrior.png",
      "unlockedAt": null,
      "category": "STREAK"
    }
  ]
}
```

---

# **REPORTS & ANALYTICS**

---

## **55. GET — `/reports/summary`**

Retrieve aggregated summary statistics for a specified date range.

### **Query Parameters**

| Parameter | Type   | Default | Description                              |
| --------- | ------ | ------- | ---------------------------------------- |
| range     | string | week    | Summary range: `week`, `month`, `year`   |
| startDate | string | -       | Custom start date (YYYY-MM-DD)          |
| endDate   | string | -       | Custom end date (YYYY-MM-DD)            |

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

# **AI SMART-ACTION SYSTEM**

AI-powered features for session planning and productivity optimization.

---

## **56. POST — `/ai/suggest`**

Get AI suggestion for next step in an activity.

### **Request Body**

```json
{
  "activityId": 5,
  "currentTodos": [
    "Complete chapter 1",
    "Review exercises"
  ]
}
```

| Field        | Type     | Required | Description                    |
| ------------ | -------- | -------- | ------------------------------ |
| activityId   | number   | Yes      | Activity ID                    |
| currentTodos | string[] | No       | Current todo items             |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "AI suggestion generated successfully",
  "suggestion": "Based on your progress, I recommend focusing on practice problems for chapter 1 to reinforce your understanding before moving to chapter 2."
}
```

---

## **57. POST — `/ai/generate-preview`**

Generate activity blueprint preview (synchronous).

### **Request Body**

```json
{
  "goal": "Learn JavaScript fundamentals",
  "timeAvailable": 120,
  "experienceLevel": "BEGINNER"
}
```

| Field           | Type   | Required | Description                           |
| --------------- | ------ | -------- | ------------------------------------- |
| goal            | string | Yes      | Learning or productivity goal         |
| timeAvailable   | number | Yes      | Available time in minutes             |
| experienceLevel | string | Yes      | BEGINNER, INTERMEDIATE, or ADVANCED   |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Blueprint generated successfully",
  "item": {
    "activityTitle": "JavaScript Fundamentals",
    "activityDescription": "Learn core JavaScript concepts",
    "sessionType": "POMODORO",
    "focusTimeInMinutes": 25,
    "breakTimeInMinutes": 5,
    "cycles": 4,
    "todos": [
      "Review variables and data types",
      "Practice function declarations",
      "Complete basic exercises"
    ]
  }
}
```

---

## **58. POST — `/ai/generate-preview-async`**

Start asynchronous blueprint generation.

### **Request Body**

Same as synchronous version.

### **Success Response**

Status: **202 Accepted**
```json
{
  "message": "Blueprint generation started",
  "requestId": "req_123456789"
}
```

---

## **59. GET — `/ai/generate-preview-async/{requestId}`**

Poll for asynchronous blueprint generation result.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| requestId | string | Yes      |

### **Success Response (In Progress)**

Status: **202 Accepted**
```json
{
  "status": "IN_PROGRESS",
  "message": "Blueprint generation in progress"
}
```

### **Success Response (Completed)**

Status: **200 OK**
```json
{
  "status": "COMPLETED",
  "message": "Blueprint generated successfully",
  "item": {
    "activityTitle": "JavaScript Fundamentals",
    "activityDescription": "Learn core JavaScript concepts",
    "sessionType": "POMODORO",
    "focusTimeInMinutes": 25,
    "breakTimeInMinutes": 5,
    "cycles": 4,
    "todos": [
      "Review variables and data types",
      "Practice function declarations"
    ]
  }
}
```

---

## **60. POST — `/ai/generate-dual-preview-async`**

Generate dual blueprint (beginner + intermediate) asynchronously.

### **Request Body**

```json
{
  "goal": "Learn React development",
  "timeAvailable": 180
}
```

### **Success Response**

Status: **202 Accepted**
```json
{
  "message": "Dual blueprint generation started",
  "requestId": "req_987654321"
}
```

---

## **61. GET — `/ai/generate-dual-preview-async/{requestId}`**

Poll for dual blueprint generation result.

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| requestId | string | Yes      |

### **Success Response (Completed)**

Status: **200 OK**
```json
{
  "status": "COMPLETED",
  "message": "Dual blueprint generated successfully",
  "item": {
    "beginner": {
      "activityTitle": "React Basics",
      "activityDescription": "Introduction to React concepts",
      "sessionType": "POMODORO",
      "focusTimeInMinutes": 25,
      "breakTimeInMinutes": 5,
      "cycles": 3,
      "todos": ["Learn JSX", "Create first component"]
    },
    "intermediate": {
      "activityTitle": "React Development",
      "activityDescription": "Advanced React patterns",
      "sessionType": "POMODORO",
      "focusTimeInMinutes": 30,
      "breakTimeInMinutes": 5,
      "cycles": 4,
      "todos": ["Implement hooks", "State management", "API integration"]
    }
  }
}
```

---

## **62. POST — `/ai/confirm-plan`**

Confirm and create activity + session from AI blueprint.

### **Request Body**

```json
{
  "activityTitle": "JavaScript Fundamentals",
  "activityDescription": "Learn core JavaScript concepts",
  "sessionType": "POMODORO",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4,
  "todos": [
    "Review variables and data types",
    "Practice function declarations"
  ]
}
```

### **Success Response**

Status: **201 Created**
```json
{
  "message": "Activity and session created successfully",
  "item": {
    "activityId": 15,
    "sessionId": 42,
    "activityTitle": "JavaScript Fundamentals",
    "sessionType": "POMODORO",
    "status": "NOT_STARTED"
  }
}
```

---

## **63. POST — `/ai/quick-focus`**

Start instant 25-minute focus session.

### **Request Body**

```json
{
  "activityTitle": "Quick Focus Session"
}
```

| Field         | Type   | Required | Description      |
| ------------- | ------ | -------- | ---------------- |
| activityTitle | string | Yes      | Session title    |

### **Success Response**

Status: **201 Created**
```json
{
  "message": "Quick focus session created successfully",
  "item": {
    "activityId": 16,
    "sessionId": 43,
    "activityTitle": "Quick Focus Session",
    "sessionType": "POMODORO",
    "focusTimeInMinutes": 25,
    "breakTimeInMinutes": 5,
    "cycles": 1,
    "status": "NOT_STARTED"
  }
}
```

---

# **PUSH NOTIFICATIONS**

Firebase Cloud Messaging (FCM) integration for real-time notifications.

---

## **64. POST — `/push/register-token`**

Register FCM push notification token.

### **Request Body**

```json
{
  "token": "<firebase-push-notification-token>"
}
```

| Field | Type   | Required | Description           |
| ----- | ------ | -------- | --------------------- |
| token | string | Yes      | FCM registration token |

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

---

## **65. DELETE — `/push/unregister-token`**

Unregister and remove push notification token.

### **Success Response**

Status: **200 OK**
```json
"Token unregistered"
```

---

## **66. GET — `/push/status`**

Check push notification registration status.

### **Success Response**

Status: **200 OK**
```json
{
  "registered": true,
  "enabled": true
}
```

---

## **67. PUT — `/push/enable`**

Enable push notifications for registered token.

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

---

## **68. PUT — `/push/disable`**

Disable push notifications.

### **Success Response**

Status: **200 OK**
```json
"Push disabled"
```

---

## **69. GET — `/push/debug`**

Get detailed push notification debug information.

### **Success Response**

Status: **200 OK**
```json
{
  "userId": 1,
  "tokenRegistered": true,
  "notificationsEnabled": true,
  "lastTokenUpdate": "2025-12-05T10:30:00",
  "tokenHash": "abc123..."
}
```

---

## **70. POST — `/push/test`**

Send test push notification.

### **Success Response**

Status: **200 OK**
```json
"Test notification sent"
```

### **Fail Response**

Status: **400 Bad Request**
```json
"No token registered"
```

---

# **SETTINGS**

User preferences and application settings management.

---

## **71. GET — `/settings`**

Retrieve user settings and preferences.

### **Success Response**

Status: **200 OK**
```json
{
  "userId": 1,
  "soundType": "DEFAULT",
  "notificationSound": true,
  "volume": 80,
  "autoStartBreaks": true,
  "autoStartPomodoros": false,
  "theme": "LIGHT",
  "notificationsEnabled": true
}
```

---

## **72. PATCH — `/settings`**

Update user settings (partial update).

### **Request Body**

```json
{
  "soundType": "NATURE",
  "notificationSound": true,
  "volume": 75,
  "autoStartBreaks": true,
  "autoStartPomodoros": true,
  "theme": "DARK",
  "notificationsEnabled": true
}
```

| Field                | Type    | Required | Description                    |
| -------------------- | ------- | -------- | ------------------------------ |
| soundType            | string  | No       | DEFAULT, NATURE, ELECTRONIC    |
| notificationSound    | boolean | No       | Enable notification sounds     |
| volume               | number  | No       | Volume level (0-100)           |
| autoStartBreaks      | boolean | No       | Auto start break timer         |
| autoStartPomodoros   | boolean | No       | Auto start pomodoro timer      |
| theme                | string  | No       | LIGHT, DARK                    |
| notificationsEnabled | boolean | No       | Enable notifications           |

### **Success Response**

Status: **200 OK**
```json
{
  "userId": 1,
  "soundType": "NATURE",
  "notificationSound": true,
  "volume": 75,
  "autoStartBreaks": true,
  "autoStartPomodoros": true,
  "theme": "DARK",
  "notificationsEnabled": true
}
```

---

## **73. DELETE — `/settings/sessions/clear`**

Clear all session history for the user.

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Session history cleared successfully",
  "deletedCount": 25
}
```

---

## **74. DELETE — `/settings/activities/clear`**

Clear all activity data for the user.

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Activity data cleared successfully",
  "deletedActivities": 10,
  "deletedSessions": 45
}
```

---

# **CONTACT**

---

## **75. POST — `/contact`**

Submit contact form message.

### **Request Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Feature Request",
  "message": "I would like to suggest a new feature..."
}
```

| Field   | Type   | Required | Description      |
| ------- | ------ | -------- | ---------------- |
| name    | string | Yes      | Sender name      |
| email   | string | Yes      | Sender email     |
| subject | string | Yes      | Message subject  |
| message | string | Yes      | Message content  |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Contact form submitted successfully"
}
```

---

# **ADMIN**

Administrative endpoints for user management.

---

## **76. POST — `/admin/login`**

Admin authentication.

### **Request Body**

```json
{
  "username": "admin",
  "password": "admin_password"
}
```

### **Success Response**

Status: **200 OK**
```json
{
  "message": "Admin login successful",
  "token": "<admin_jwt_token>"
}
```

---

## **77. GET — `/admin/users`**

Get all users (admin only).

### **Query Parameters**

| Parameter | Type   | Default | Description    |
| --------- | ------ | ------- | -------------- |
| page      | number | 0       | Page number    |
| size      | number | 20      | Page size      |

### **Success Response**

Status: **200 OK**
```json
{
  "users": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "emailVerified": true,
      "createdAt": "2025-12-01T10:00:00",
      "lastLoginAt": "2025-12-05T15:30:00"
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "currentPage": 0
}
```

---

## **78. GET — `/admin/users/search`**

Search users by email (admin only).

### **Query Parameters**

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| email     | string | Yes      | Email to search  |

### **Success Response**

Status: **200 OK**
```json
{
  "users": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "emailVerified": true
    }
  ]
}
```

---

## **79. DELETE — `/admin/users/{userId}`**

Delete user account (admin only).

### **Path Parameters**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| userId    | number | Yes      |

### **Success Response**

Status: **200 OK**
```json
{
  "message": "User deleted successfully",
  "deletedUserId": 1
}
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
| 403 | Forbidden | `{ "message": "Access denied" }` |
| 404 | Not Found | `{ "message": "Resource not found" }` |
| 409 | Conflict | `{ "message": "Email already exists" }` |
| 422 | Unprocessable Entity | `{ "message": "Validation failed", "errors": [...] }` |
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

**Common Auth Error Codes:**
- `TOKEN_EXPIRED` - Access token has expired
- `TOKEN_INVALID` - Token is malformed or invalid
- `TOKEN_MISSING` - No authorization header provided
- `REFRESH_TOKEN_EXPIRED` - Refresh token has expired
- `ACCOUNT_NOT_VERIFIED` - Email verification required

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

## **Rate Limiting**

```json
{
  "message": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 100,
  "remaining": 0
}
```

---

# **AUTHENTICATION & SECURITY**

## **Authentication Methods**

### **1. JWT Bearer Token**
```
Authorization: Bearer <access_token>
```

### **2. HTTP-Only Cookies**
- `accessToken` (15 minutes expiry)
- `refreshToken` (30 days expiry)

### **3. OAuth2 Google Integration**
- Endpoint: `GET /auth/oauth2/google`
- Automatic account creation/linking
- Returns same JWT tokens as regular login

## **Security Features**

- **Password Encryption**: BCrypt hashing
- **Email Verification**: Required for new accounts
- **Password Reset**: Via email or backup email
- **Account Lockout**: After multiple failed attempts
- **CORS Protection**: Configured for allowed origins
- **CSRF Protection**: Disabled for API-only usage
- **Rate Limiting**: Applied to sensitive endpoints

## **Token Management**

- **Access Token**: 15-minute expiry, used for API calls
- **Refresh Token**: 30-day expiry, used to get new access tokens
- **Automatic Refresh**: Frontend should handle token refresh
- **Token Revocation**: Logout invalidates both tokens

---

# **REAL-TIME FEATURES**

## **Server-Sent Events (SSE)**

### **Session Events**
- **Endpoint**: `GET /activities/{activityId}/sessions/{id}/events`
- **Content-Type**: `text/event-stream`
- **Events**: `connected`, `phase-change`

### **Connection Management**
- Automatic reconnection on disconnect
- Heartbeat messages every 30 seconds
- Connection cleanup on session end

### **Event Format**
```
event: phase-change
data: {"sessionId":1,"currentPhase":"BREAK","cyclesCompleted":1,"status":"IN_PROGRESS","timestamp":"2025-12-05T15:30:00Z"}
```

---

# **API VERSIONING & COMPATIBILITY**

## **Current Version**
- **Version**: 1.0
- **Base URL**: No prefix (direct endpoints)
- **Backward Compatibility**: Maintained for 6 months

## **Deprecation Policy**
- 3-month notice for breaking changes
- Version headers for future API versions
- Migration guides provided

---

# **NOTES**

- **Base URL:** All endpoints use no prefix (direct paths)
- **Authentication:** JWT tokens (Bearer header) or HTTP-only cookies
- **Time Format:** All times are in ISO 8601 format (UTC)
- **Rate Limiting:** 100 requests per minute per user
- **API Versioning:** Current version is v1 (no prefix)
- **CORS:** Enabled for `localhost:4200` and `pomodify.site`
- **Content Type:** All requests and responses use `application/json` unless otherwise specified
- **File Uploads:** Multipart form data for profile pictures (max 5MB)
- **Real-time:** Server-Sent Events for session updates
- **Push Notifications:** Firebase Cloud Messaging integration
- **AI Features:** Google Generative AI integration for smart suggestions
- **Database:** PostgreSQL with Flyway migrations
- **Caching:** Redis for session management and rate limiting
- **Monitoring:** Health checks available at `/actuator/health`