# Session API Documentation

## Overview

The Session API provides a complete Pomodoro timer system with lifecycle management and real-time notifications via Server-Sent Events (SSE).

## Concepts

### Session Structure

- **Session**: A Pomodoro work session consisting of multiple cycles
- **Cycle**: One complete focus + break period
- **Phase**: Either FOCUS or BREAK within a cycle
- **Rounds**: Number of cycles in a session

**Formula**: `Total Session Time = (Focus Duration + Break Duration) × Rounds`

### Session Lifecycle

```
NOT_STARTED → (start) → IN_PROGRESS → (pause) → PAUSED
                              ↓                      ↓
                         (complete phases)      (resume)
                              ↓                      ↓
                          COMPLETED              IN_PROGRESS
                              
              (stop) → NOT_STARTED  (resets current cycle)
              The Session API provides a complete Pomodoro timer system with lifecycle management and real-time notifications via Server-Sent Events (SSE). All operations are authenticated via JWT (`@AuthenticationPrincipal Jwt`) and persist to the database using JPA. Sessions belong to the authenticated user via their activities and are only accessible to that user.
```

              ### CRUD Operations (Authenticated)

```
              POST /api/v1/sessions
              Content-Type: application/json
              Authorization: Bearer <access_token>

              {
                "activityId": 1,
                "sessionType": "CLASSIC",
                "focusTimeInMinutes": 25,
                "breakTimeInMinutes": 5,
                "cycles": 4
              }

#### Create Session
              GET /api/v1/sessions?activityId=1&status=IN_PROGRESS
              Authorization: Bearer <access_token>
POST /api/v1/sessions
Content-Type: application/json
              GET /api/v1/sessions/{id}
              Authorization: Bearer <access_token>
{
  "activityId": 1,
              DELETE /api/v1/sessions/{id}
              Authorization: Bearer <access_token>
              Soft deletes the session (sets `isDeleted=true`).
  "breakTimeInMinutes": 5,
  "cycles": 4
              ### Lifecycle Operations (Authenticated)
```

              POST /api/v1/sessions/{id}/start
              Authorization: Bearer <access_token>

#### Get All Sessions
              POST /api/v1/sessions/{id}/pause?note=Optional%20note
              Authorization: Bearer <access_token>
GET /api/v1/sessions?activityId=1&status=IN_PROGRESS
```
              POST /api/v1/sessions/{id}/resume
              Authorization: Bearer <access_token>
**Query Parameters**:
- `activityId` (optional): Filter by activity ID
              POST /api/v1/sessions/{id}/stop?note=Optional%20note
              Authorization: Bearer <access_token>

#### Get Session by ID
              POST /api/v1/sessions/{id}/cancel
              Authorization: Bearer <access_token>
GET /api/v1/sessions/{id}
```
              POST /api/v1/sessions/{id}/complete-phase?note=Optional%20note
              Authorization: Bearer <access_token>
#### Delete Session
```http
DELETE /api/v1/sessions/{id}
```

Soft deletes the session from the mock store.

### Lifecycle Operations

POST /api/v1/sessions/{id}/start
```
              ### Real-Time Notifications (SSE)
**Preconditions**: Session must be in `NOT_STARTED` state

              GET /api/v1/sessions/{id}/events
- Status: `NOT_STARTED` → `IN_PROGRESS`
- Sets `startedAt` timestamp
- Phase remains `FOCUS`
              ## Complete Workflow Example

#### Pause Session
              POST /api/v1/sessions
              Authorization: Bearer <access_token>
              {
                "activityId": 1,
                "sessionType": "CLASSIC",
                "focusTimeInMinutes": 25,
                "breakTimeInMinutes": 5,
                "cycles": 4
              }
- Captures elapsed time

              POST /api/v1/sessions/1/pause?note=Taking%20lunch%20break
              Authorization: Bearer <access_token>
```http
POST /api/v1/sessions/{id}/resume
              POST /api/v1/sessions/1/resume
              Authorization: Bearer <access_token>

**Preconditions**: Session must be `PAUSED`

              1) After 3 completed cycles, currently at 4th cycle BREAK
              ```http
              POST /api/v1/sessions/1/finish
              Authorization: Bearer <access_token>
              ```
              Result: `cyclesCompleted = 4`, status `COMPLETED`.
**Effects**:
              2) After 3 completed cycles, currently at 4th cycle FOCUS
              ```http
              POST /api/v1/sessions/1/finish
              Authorization: Bearer <access_token>
              ```
              Result: `cyclesCompleted = 3`, status `COMPLETED`.
- Status: `PAUSED` → `IN_PROGRESS`
- Continues from where it was paused

              - Auth: All endpoints require a valid JWT; server extracts `user` claim and ensures sessions belong to that user.
              - Persistence: Operations are transactional and saved via JPA. Delete is soft-delete (`isDeleted=true`).
              - Notes: A single optional `note` per session can be added/updated during pause/stop/complete-phase or independently via the note endpoint.
              - SSE: Event stream is unauthenticated by default; secure it if needed by requiring JWT and verifying ownership.
#### Stop Session
```http
              ## Implementation Notes

              - Auth: All endpoints require a valid JWT; server extracts `user` claim and ensures sessions belong to that user.
              - Persistence: Operations are transactional and saved via JPA. Delete is soft-delete (`isDeleted=true`).
              - Notes: A single optional `note` per session can be added/updated during pause/stop/complete-phase or independently via the note endpoint.
              - SSE: Event stream is unauthenticated by default; secure it if needed by requiring JWT and verifying ownership.
**Preconditions**: Session must not be `COMPLETED` or `CANCELED`

**Effects** (invalidates all cycles):
- Status → `CANCELED`
- Resets `cyclesCompleted` to 0
- Sets `completedAt` timestamp
The Session API provides a complete Pomodoro timer system with lifecycle management and real-time notifications via Server-Sent Events (SSE). All operations are authenticated via JWT (`@AuthenticationPrincipal Jwt`) and persist to the database using JPA. Sessions belong to the authenticated user via their activities and are only accessible to that user.

#### Complete Phase
POST /api/v1/sessions
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "activityId": 1,
  "sessionType": "CLASSIC",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4
}
If current phase is `BREAK`:
GET /api/v1/sessions?activityId=1&status=IN_PROGRESS
Authorization: Bearer <access_token>
- Increments `cyclesCompleted` by 1
GET /api/v1/sessions/{id}
Authorization: Bearer <access_token>

DELETE /api/v1/sessions/{id}
Authorization: Bearer <access_token>
Soft deletes the session (sets `isDeleted=true`).

### Real-Time Notifications (SSE)
POST /api/v1/sessions/{id}/start
Authorization: Bearer <access_token>
#### Subscribe to Session Events
POST /api/v1/sessions/{id}/pause?note=Optional%20note
Authorization: Bearer <access_token>
GET /api/v1/sessions/{id}/events
POST /api/v1/sessions/{id}/resume
Authorization: Bearer <access_token>
```
POST /api/v1/sessions/{id}/stop?note=Optional%20note
Authorization: Bearer <access_token>
**Event Types**:
POST /api/v1/sessions/{id}/cancel
Authorization: Bearer <access_token>
1. **connected** - Sent immediately upon connection
POST /api/v1/sessions/{id}/complete-phase?note=Optional%20note
Authorization: Bearer <access_token>
   "Connected to session {id} events"
   ```
GET /api/v1/sessions/{id}/events
2. **phase-change** - Sent when phase completes
   ```json
   {
POST /api/v1/sessions
Authorization: Bearer <access_token>
{
  "activityId": 1,
  "sessionType": "CLASSIC",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4
}
**Usage Example** (JavaScript):
POST /api/v1/sessions/1/pause?note=Taking%20lunch%20break
Authorization: Bearer <access_token>
const eventSource = new EventSource('/api/v1/sessions/1/events');
POST /api/v1/sessions/1/resume
Authorization: Bearer <access_token>
eventSource.addEventListener('connected', (event) => {
  console.log('Connected:', event.data);
});

  if (data.status === 'COMPLETED') {
    console.log('Session completed!');
### Implementation Notes

- Auth: All endpoints require a valid JWT; server extracts `user` claim and ensures sessions belong to that user.
- Persistence: Operations are transactional and saved via JPA. Delete is soft-delete (`isDeleted=true`).
- Notes: A single optional `note` per session can be added/updated during pause/stop/complete-phase or independently via the note endpoint.
- SSE: Event stream is unauthenticated by default; secure it if needed by requiring JWT and verifying ownership.

### Dedicated Note Update Endpoint

Update session note independently at any time:

```http
PUT /api/v1/sessions/{id}/note?note=Updated%20note%20text
Authorization: Bearer <access_token>
```
};
Use the provided HTTP file: `request/http/session.http`

---

## Complete Workflow Example

### 1. Create a 4-cycle Pomodoro session
```http
POST /api/v1/sessions
{
  "activityId": 1,
  "sessionTitle": "Study Session",
  "sessionType": "CLASSIC",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4
}
```

### 2. Subscribe to events
```http
GET /api/v1/sessions/1/events
```

### 3. Start the session
```http
POST /api/v1/sessions/1/start
```
Status: `IN_PROGRESS`, Phase: `FOCUS`, Cycles: 0/4

### 4. Complete FOCUS phase
```http
POST /api/v1/sessions/1/complete-phase
```
Phase: `BREAK`, Cycles: 0/4
**SSE Event**: `phase-change` sent to subscribers

### 5. Complete BREAK phase
```http
POST /api/v1/sessions/1/complete-phase
```
Phase: `FOCUS`, Cycles: 1/4
**SSE Event**: `phase-change` sent

### 6. Continue cycle 2
```http
POST /api/v1/sessions/1/complete-phase  # FOCUS → BREAK
POST /api/v1/sessions/1/complete-phase  # BREAK → FOCUS, Cycles: 2/4
```

### 7. Pause if needed
```http
POST /api/v1/sessions/1/pause
```

### 8. Resume when ready
```http
POST /api/v1/sessions/1/resume
```

### 9. Complete remaining cycles
```http
POST /api/v1/sessions/1/complete-phase  # Cycle 3 FOCUS
POST /api/v1/sessions/1/complete-phase  # Cycle 3 BREAK, Cycles: 3/4
POST /api/v1/sessions/1/complete-phase  # Cycle 4 FOCUS
POST /api/v1/sessions/1/complete-phase  # Cycle 4 BREAK, Cycles: 4/4, Status: COMPLETED
```

Session is now `COMPLETED` ✅

---

## Session Types

- **CLASSIC**: Traditional Pomodoro (25 min focus, 5 min break)
- **FREESTYLE**: Custom durations defined by user

---

## Error Responses

All endpoints return appropriate HTTP status codes:

- `201 Created`: Session successfully created
- `200 OK`: Request successful
- `400 Bad Request`: Invalid state transition or validation error
- `404 Not Found`: Session not found

Error response format:
```json
{
  "message": "Error description",
  "sessions": [],
  "currentPage": 0,
  "totalPages": 0,
  "totalItems": 0
}
```

---

## Implementation Notes

### Current State (Mock API)

This is a **mock implementation** using in-memory storage:
- Uses `ConcurrentHashMap` for thread-safe operations
- No database persistence
- Data is lost on server restart
- Ideal for frontend development and testing

### Future Production Implementation

For production, implement:
1. **SessionService** with domain logic
2. **PomodoroSessionRepository** for database persistence
3. **Background scheduler** for automatic phase transitions
4. **WebSocket** or **Redis Pub/Sub** for scalable SSE
5. **Timer management** to track elapsed time server-side
6. **Session validation** against Activity ownership

---

## Testing

Use the provided HTTP file: `request/http/session.http`

Run the application:
```bash
./mvnw spring-boot:run
```

Test SSE with curl:
```bash
curl -N -H "Accept: text/event-stream" http://localhost:8081/api/v1/sessions/1/events
```
