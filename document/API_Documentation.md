# POMODIFY APP — FULL API DOCUMENTATION (UPDATED)

---

# **USER MANAGEMENT / AUTH**

---

## **1. POST — `/api/v1/auth/register`**

### **Request Params**

| Field     | Type   | Description                 |
| --------- | ------ | --------------------------- |
| firstName | string | User's first name           |
| lastName  | string | User's last name            |
| email     | string | User's email                |
| password  | string | Password                    |

### **Success Response**

Status: 201 Created
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com"
}
```

### **Fail Response**

Status: 400 Bad Request
```json
{ "message": "Email already exists" }
```

---

## **2. POST — `/api/v1/auth/login`**

### **Request Params**

| Field    | Type   |
| -------- | ------ |
| email    | string |
| password | string |

### **Success Response**

Status: 200 OK
```json
{
  "user": { "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com" },
  "accessToken": "<jwt_token>",
  "refreshToken": "<refresh_token>"
}
```

### **Fail Response**

Status: 400 Bad Request
```json
{ "message": "Invalid credentials" }
```

---

## **3. POST — `/api/v1/auth/refresh`**

### **Request Params**

| Field        | Type   |
| ------------ | ------ |
| refreshToken | string |

### **Success Response**

Status: 200 OK
```json
{
  "user": { "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com" },
  "accessToken": "<new_jwt_token>",
  "refreshToken": "<new_refresh_token>"
}
```

### **Fail Response**

Status: 401 Unauthorized
```json
{ "message": "Invalid or expired refresh token" }
```

---

## **4. POST — `/api/v1/auth/logout`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{ "message": "Logged out successfully" }
```

### **Fail Response**

Status: 400 Bad Request
```json
{ "message": "Missing or invalid Authorization header" }
```

---

## **5. GET — `/api/v1/auth/me`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com"
}
```

### **Fail Response**

Status: 401 Unauthorized
```json
{ "message": "Missing token" }
```

---

# **ACTIVITIES**

(All activity endpoints require: Header `Authorization: Bearer <accessToken>`; controllers expect JWT with a `user` claim (Long user id).)

---

## **6. POST — `/api/v1/activities`**

### **Request Params**

| Field      | Type   | Description            |
| ---------- | ------ | ---------------------- |
| title      | string | Activity title         |
| description| string | Activity description   |
| categoryId | number | Category id (optional) |

### **Success Response**

Status: 201 Created
```json
{
  "message": "Activity created successfully",
  "activities": [
    {
      "activityId": 123,
      "categoryId": 5,
      "activityTitle": "Study Math",
      "activityDescription": "Completed chapter 1"
    }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: 400 Bad Request
```json
{ "message": "Activity title is required" }
```

---

## **7. GET — `/api/v1/activities`**

### **Request Params (Query)**

| Field     | Type   | Description |
| --------- | ------ | ----------- |
| page      | number | Page index (default 0) |
| size      | number | Page size (default 10) |
| sortOrder | string | `asc` or `desc` (default `desc`) |
| sortBy    | string | Field to sort by (default `title`) |
| categoryId| number | Optional category filter |

### **Success Response**

Status: 200 OK
```json
{
  "message": "Active activities fetched successfully.",
  "activities": [
    { "activityId": 123, "categoryId": 5, "activityTitle": "Study Math", "activityDescription": "..." },
    { "activityId": 124, "categoryId": 7, "activityTitle": "Learn Angular", "activityDescription": "..." }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 2
}
```

### **Fail Response**

Status: 200 OK (empty result message)
```json
{ "message": "No active activities found." }
```

---

## **8. GET — `/api/v1/activities/deleted`**

### **Request Params (Query)**

Same as `/api/v1/activities` (pagination + filters). Returns deleted activities.

### **Success Response**

Status: 200 OK
```json
{
  "message": "Deleted activities fetched successfully.",
  "activities": [
    { "activityId": 200, "categoryId": 3, "activityTitle": "Old Activity", "activityDescription": "deleted" }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: 200 OK (empty result message)
```json
{ "message": "No deleted activities found." }
```

---

## **9. GET — `/api/v1/activities/{id}`**

### **Request Params**

| Field | Type   |
| ----- | ------ |
| id    | number | Activity id (path param) |

### **Success Response**

Status: 200 OK
```json
{
  "message": "Activity fetched successfully",
  "activities": [
    { "activityId": 123, "categoryId": 5, "activityTitle": "Study Math", "activityDescription": "Completed chapter 1" }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: 400 Bad Request / 401 / 404 (depending on service)
```json
{ "message": "Activity not found" }
```

---

## **10. PUT — `/api/v1/activities/{id}`**

### **Request Params**

| Field                 | Type   | Description |
| --------------------- | ------ | ----------- |
| id                    | number | Activity id (path param) |
| newActivityTitle      | string | New title (in body) |
| newActivityDescription| string | New description (in body) |
| newCategoryId         | number | New category id (in body) |

Body uses `UpdateActivityRequest`.

### **Success Response**

Status: 200 OK
```json
{
  "message": "Activity updated successfully",
  "activities": [
    { "activityId": 123, "categoryId": 6, "activityTitle": "Study Physics", "activityDescription": "Updated description" }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: 400 Bad Request / 404 Not Found
```json
{ "message": "Activity not found" }
```

---

## **11. DELETE — `/api/v1/activities/{id}`**

### **Request Params**

| Field | Type   |
| ----- | ------ |
| id    | number |

### **Success Response**

Status: 200 OK
```json
{
  "message": "Activity deleted successfully",
  "activities": [
    { "activityId": 123, "categoryId": 5, "activityTitle": "Study Math", "activityDescription": "..." }
  ],
  "currentPage": 0,
  "totalPages": 1,
  "totalItems": 1
}
```

### **Fail Response**

Status: 404 Not Found
```json
{ "message": "Activity not found" }
```

---

# **CATEGORIES**

---

## **12. POST — `/api/v1/categories`**

### **Request Params**

| Field        | Type   |
| ------------ | ------ |
| categoryName | string |

### **Success Response**

Status: 201 Created
```json
{
  "message": "Category created successfully",
  "categories": [
    { "categoryId": 1, "categoryName": "Study", "activitiesCount": 0 }
  ]
}
```

### **Fail Response**

Status: 400 Bad Request
```json
{ "message": "Invalid input" }
```

---

## **13. PUT — `/api/v1/categories/{id}`**

### **Request Params**

| Field           | Type   |
| --------------- | ------ |
| id              | number |
| newCategoryName | string |

### **Success Response**

Status: 200 OK
```json
{
  "message": "Category updated successfully",
  "categories": [
    { "categoryId": 1, "categoryName": "New Name", "activitiesCount": 2 }
  ]
}
```

### **Fail Response**

Status: 404 Not Found
```json
{ "message": "Category not found" }
```

---

## **14. DELETE — `/api/v1/categories/{id}`**

### **Request Params**

| Field | Type   |
| ----- | ------ |
| id    | number |

### **Success Response**

Status: 200 OK
```json
{
  "message": "Category deleted successfully",
  "categories": [
    { "categoryId": 1, "categoryName": "Study", "activitiesCount": 0 }
  ]
}
```

### **Fail Response**

Status: 404 Not Found
```json
{ "message": "Category not found" }
```

---

## **15. GET — `/api/v1/categories`**

### **Success Response**

Status: 200 OK
```json
{
  "message": "Categories retrieved successfully: 2",
  "categories": [
    { "categoryId": 1, "categoryName": "Study", "activitiesCount": 3 },
    { "categoryId": 2, "categoryName": "Work", "activitiesCount": 1 }
  ]
}
```

### **Fail Response**

Status: 200 OK (empty)
```json
{ "message": "No categories found" }
```

---

# **DASHBOARD**

---

## **16. GET — `/api/v1/dashboard`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`
- Header optional: `X-Timezone` (e.g., "Asia/Manila", "UTC"). Defaults to "Asia/Manila".

### **Success Response**

Status: 200 OK
```json
{
    "totalCompletedSessions": 10,
    "totalFocusTime": 36000,
    "weeklyFocusDistribution": {
        "MONDAY": 7200,
        "TUESDAY": 5400,
        "WEDNESDAY": 9000,
        "THURSDAY": 3600,
        "FRIDAY": 10800,
        "SATURDAY": 0,
        "SUNDAY": 0
    },
    "recentActivities": [
        {
            "activityId": 1,
            "activityTitle": "Develop new feature",
            "lastSession": {
                "sessionId": 101,
                "startTime": "2023-10-27T10:00:00Z",
                "endTime": "2023-10-27T11:00:00Z",
                "status": "COMPLETED"
            }
        }
    ]
}
```

### **Fail Response**

Status: 401 Unauthorized
```json
{ "message": "Unauthorized: invalid user claim" }
```
---

# **PUSH NOTIFICATIONS**

---

## **17. POST — `/api/v1/push/register-token`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`
- Body:
```json
{
  "token": "<push-notification-token>"
}
```

### **Success Response**

Status: 200 OK
```json
"Token registered"
```

### **Fail Response**

Status: 400 Bad Request
```json
"Missing token"
```
Status: 401 Unauthorized
```json
"Unauthorized"
```
---

## **18. DELETE — `/api/v1/push/unregister-token`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
"Token unregistered"
```

### **Fail Response**

Status: 401 Unauthorized
```json
"Unauthorized"
```

---

## **19. GET — `/api/v1/push/status`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "registered": true,
    "enabled": true
}
```

### **Fail Response**

Status: 401 Unauthorized
```json
"Unauthorized"
```

---

## **20. PUT — `/api/v1/push/enable`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
"Push enabled"
```

### **Fail Response**

Status: 400 Bad Request
```json
"No token registered"
```

---

## **21. PUT — `/api/v1/push/disable`**

### **Request Params**

- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
"Push disabled"
```

### **Fail Response**

Status: 400 Bad Request
```json
"No token registered"
```

---

# **SESSIONS**

---

## **22. POST — `/api/v1/activities/{activityId}/sessions`**

### **Request Params**

- Path Param: `activityId`
- Header required: `Authorization: Bearer <accessToken>`
- Body:
```json
{
    "sessionType": "POMODORO",
    "focusTimeInMinutes": 25,
    "breakTimeInMinutes": 5,
    "cycles": 4
}
```

### **Success Response**

Status: 201 Created
```json
{
    "message": "Session created successfully",
    "sessions": [
        {
            "id": 1,
            "activityId": 1,
            "sessionType": "POMODORO",
            "status": "PENDING",
            "focusTimeInMinutes": 25,
            "breakTimeInMinutes": 5,
            "cycles": 4,
            "currentPhase": null,
            "cyclesCompleted": 0,
            "note": null
        }
    ],
    "currentPage": 0,
    "totalPages": 1,
    "totalItems": 1
}
```

---

## **23. GET — `/api/v1/activities/{activityId}/sessions`**

### **Request Params**

- Path Param: `activityId`
- Query Param: `status` (optional)
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Sessions retrieved successfully",
    "sessions": [ ... ],
    "currentPage": 0,
    "totalPages": 1,
    "totalItems": 2
}
```
---

## **24. GET — `/api/v1/activities/{activityId}/sessions/{id}`**

### **Request Params**

- Path Params: `activityId`, `id`
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Session retrieved successfully",
    "sessions": [ ... ],
    "currentPage": 0,
    "totalPages": 1,
    "totalItems": 1
}
```
---

## **25. DELETE — `/api/v1/activities/{activityId}/sessions/{id}`**

### **Request Params**

- Path Params: `activityId`, `id`
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
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

### **Request Params**

- Path Params: `activityId`, `id`
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Session started successfully",
    "sessions": [ ... ]
}
```
---

## **27. POST — `/api/v1/activities/{activityId}/sessions/{id}/pause`**

### **Request Params**

- Path Params: `activityId`, `id`
- Query Param: `note` (optional)
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Session paused successfully",
    "sessions": [ ... ]
}
```
---

## **28. POST — `/api/v1/activities/{activityId}/sessions/{id}/resume`**

### **Request Params**

- Path Params: `activityId`, `id`
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Session resumed successfully",
    "sessions": [ ... ]
}
```
---

## **29. POST — `/api/v1/activities/{activityId}/sessions/{id}/stop`**

### **Request Params**

- Path Params: `activityId`, `id`
- Query Param: `note` (optional)
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Session stopped successfully (current cycle invalidated)",
    "sessions": [ ... ]
}
```
---

## **30. POST — `/api/v1/activities/{activityId}/sessions/{id}/cancel`**

### **Request Params**

- Path Params: `activityId`, `id`
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Session canceled successfully (all cycles invalidated)",
    "sessions": [ ... ]
}
```
---

## **31. POST — `/api/v1/activities/{activityId}/sessions/{id}/finish`**

### **Request Params**

- Path Params: `activityId`, `id`
- Query Param: `note` (optional)
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Session finished successfully",
    "sessions": [ ... ]
}
```
---

## **32. POST — `/api/v1/activities/{activityId}/sessions/{id}/complete-phase`**

### **Request Params**

- Path Params: `activityId`, `id`
- Query Param: `note` (optional)
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Phase completed: BREAK",
    "sessions": [ ... ]
}
```
---

## **33. PUT — `/api/v1/activities/{activityId}/sessions/{id}/note`**

### **Request Params**

- Path Params: `activityId`, `id`
- Query Param: `note`
- Header required: `Authorization: Bearer <accessToken>`

### **Success Response**

Status: 200 OK
```json
{
    "message": "Note updated successfully",
    "sessions": [ ... ]
}
```
---

## **34. GET — `/api/v1/activities/{activityId}/sessions/{id}/events`**

This endpoint uses Server-Sent Events (SSE) to stream session updates.

### **Request Params**

- Path Params: `activityId`, `id`

### **Events**

- **`connected`**: Sent upon successful connection.
- **`phase-change`**: Sent when a session's phase changes (e.g., from FOCUS to BREAK).

### **Event Data**
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

# **ERROR / FAILURE RESPONSES (GLOBAL)**

The application uses `GlobalExceptionHandler` to standardize errors. Examples:

- Token expired / auth issues
  - Status: 401 Unauthorized
  - Body:
```json
{ "message": "JWT expired", "code": "TOKEN_EXPIRED" }
```

- Invalid arguments / validation
  - Status: 400 Bad Request
  - Body:
```json
{ "message": "fieldName: must not be blank" }
```

- Generic server error
  - Status: 500 Internal Server Error
  - Body:
```json
{ "message": "Unexpected error message" }
```