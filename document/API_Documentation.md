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

---

# **ENDPOINTS LISTED IN ORIGINAL PDF BUT NOT IMPLEMENTED IN THIS REPOSITORY**

(These were present in your PDF spec but there are no matching controllers/DTOs under `pomodify-backend/src/main/java`.)

- Sessions
  - POST `/start-session`
  - GET `/get-sessions`

- Notes
  - POST `/add-note`
  - PUT `/update-note`
  - DELETE `/delete-note`

- Reports
  - GET `/reports-summary`
  - GET `/reports-activity`

- User profile endpoints from original spec:
  - PUT `/update-profile`
  - DELETE `/delete-account`
