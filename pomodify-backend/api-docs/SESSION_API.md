# Pomodoro Session API Documentation

Complete documentation for the Pomodoro Session API, covering session types, lifecycle management, state transitions, and real-time event streaming.

---

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Session Types](#session-types)
4. [Session Status & Lifecycle](#session-status--lifecycle)
5. [Cycle Phases](#cycle-phases)
6. [Domain Model](#domain-model)
7. [API Endpoints](#api-endpoints)
8. [Server-Sent Events (SSE)](#server-sent-events-sse)
9. [Request & Response Examples](#request--response-examples)
10. [Error Handling](#error-handling)
11. [Business Rules](#business-rules)

---

## Overview

The Session API manages Pomodoro sessions that belong to Activities. Each session tracks focus/break cycles, maintains state, and provides real-time updates via Server-Sent Events (SSE).

**Base Path**: `/api/v1/activities/{activityId}/sessions`

**Key Features**:
- Two session types: CLASSIC (fixed cycles) and FREESTYLE (open-ended)
- Full lifecycle management: start, pause, resume, stop, cancel, complete
- Phase-based cycle tracking (FOCUS ↔ BREAK)
- Real-time event notifications via SSE
- Soft deletion (no hard deletes)
- Optional note-taking at any phase

---

## Authentication & Authorization

**Authentication**: All endpoints require JWT Bearer token via `Authorization: Bearer <access_token>` header.

**Token Claims**: Server extracts `user` claim from JWT to identify the owner.

**Authorization Rules**:
- Users can only access sessions for activities they own
- Session ownership is inherited from parent Activity
- 401 returned if JWT is missing or invalid
- 403 returned if user doesn't own the activity

**Token Extraction**: Uses `UserHelper.extractUserId(jwt)` with fallback claim resolution: `userId` → `user` → numeric `sub`.

---

## Session Types

Sessions support two distinct operational modes:

### CLASSIC
**Description**: Traditional Pomodoro technique with predefined cycles.

**Characteristics**:
- Fixed number of cycles configured at creation
- Each cycle = focus time + break time
- Session auto-completes after all cycles finish
- Total time is predictable: `(focusTime + breakTime) × cycles`
- Suitable for time-boxed work sessions

**Example**: 4 cycles × (25min focus + 5min break) = 2 hours total

### FREESTYLE
**Description**: Open-ended session with no predefined cycle limit.

**Characteristics**:
- No cycle limit; runs until user calls `finish`
- Cycles count up as completed (not predefined)
- Total time computed from completed cycles only
- **Special finish rule**: If finishing during BREAK phase, current cycle counts; if finishing during FOCUS, it does not
- Suitable for flexible/unpredictable work sessions

**Example**: User completes 3 full cycles + finishes during 4th break → 4 cycles counted

---

## Session Status & Lifecycle

Sessions progress through the following states:

### Status Values

| Status | Description |
|--------|-------------|
| `NOT_STARTED` | Initial state; session created but not started |
| `IN_PROGRESS` | Session is actively running (timer ticking) |
| `PAUSED` | Session temporarily stopped; can be resumed |
| `COMPLETED` | Session finished successfully (all cycles done or manually finished) |
| `CANCELED` | Session terminated without completion (all cycles invalidated) |

### State Transitions

```
NOT_STARTED ──[start]──> IN_PROGRESS ──[pause]──> PAUSED
                   ↑                         │
                   └────────[resume]─────────┘
                   │
                   ├──[complete-phase × N]──> COMPLETED (CLASSIC only, auto)
                   ├──[finish]──────────────> COMPLETED
                   ├──[cancel]──────────────> CANCELED
                   └──[stop]────────────────> NOT_STARTED (resets current cycle)
```

### Lifecycle Operations

| Operation | From Status | To Status | Effect |
|-----------|-------------|-----------|--------|
| **start** | `NOT_STARTED` | `IN_PROGRESS` | Begins session timer |
| **pause** | `IN_PROGRESS` | `PAUSED` | Stops timer, preserves elapsed time |
| **resume** | `PAUSED` | `IN_PROGRESS` | Restarts timer from paused position |
| **stop** | `IN_PROGRESS` or `PAUSED` | `NOT_STARTED` | **Invalidates current cycle**, resets to FOCUS phase, clears elapsed time |
| **cancel** | Any except `COMPLETED`/`CANCELED` | `CANCELED` | **Invalidates all cycles**, sets `cyclesCompleted=0` |
| **complete-phase** | `IN_PROGRESS` | Same or `COMPLETED` | Advances FOCUS→BREAK or BREAK→FOCUS; increments cycle counter on BREAK→FOCUS; auto-completes CLASSIC when `cyclesCompleted >= totalCycles` |
| **finish** | `IN_PROGRESS` or `PAUSED` | `COMPLETED` | Manually completes session; FREESTYLE: counts current cycle if in BREAK phase |

---

## Cycle Phases

Each session alternates between two phases:

### Phase Values

| Phase | Description |
|-------|-------------|
| `FOCUS` | Work/concentration period (e.g., 25 minutes) |
| `BREAK` | Rest period (e.g., 5 minutes) |

### Phase Progression

- Sessions always start in `FOCUS` phase
- `complete-phase` endpoint toggles: `FOCUS → BREAK → FOCUS → ...`
- When transitioning `BREAK → FOCUS`, `cyclesCompleted` increments by 1
- Current phase tracked in `currentPhase` field

---

## Domain Model

### PomodoroSession Entity

**Table**: `pomodoro_session`

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | Long | No | Primary key |
| `sessionType` | SessionType | No | CLASSIC or FREESTYLE |
| `status` | SessionStatus | No | Current status (NOT_STARTED, IN_PROGRESS, PAUSED, COMPLETED, CANCELED) |
| `focusDuration` | Duration | No | Length of focus phase (stored as duration) |
| `breakDuration` | Duration | No | Length of break phase (stored as duration) |
| `totalCycles` | Integer | Yes | CLASSIC: predefined cycles; FREESTYLE: null |
| `cyclesCompleted` | Integer | No | Count of completed cycles (default: 0) |
| `currentPhase` | CyclePhase | No | FOCUS or BREAK |
| `note` | Text | Yes | User notes (added during pause/stop/finish or updated anytime) |
| `activityId` | Long | No | Foreign key to Activity (owner) |
| `startedAt` | LocalDateTime | Yes | Timestamp when session started/resumed |
| `completedAt` | LocalDateTime | Yes | Timestamp when session completed/canceled |
| `isDeleted` | Boolean | No | Soft delete flag (default: false) |
| `createdAt` | LocalDateTime | No | Record creation timestamp (auto) |
| `updatedAt` | LocalDateTime | No | Last update timestamp (auto) |

**Transient Fields** (computed, not persisted):
- `elapsedTime`: Duration of time already elapsed in current phase
- `cycleDuration`: `focusDuration + breakDuration`
- `totalDuration`: `cycleDuration × totalCycles` (CLASSIC only)

### Computed Values

**Total Time Calculation**:
- **CLASSIC**: `(focusTime + breakTime) × totalCycles`
- **FREESTYLE**: `(focusTime + breakTime) × cyclesCompleted`

**Cycles Field**:
- **CLASSIC**: Returns `totalCycles` (predefined)
- **FREESTYLE**: Returns `cyclesCompleted` (dynamic)

---

## API Endpoints

### CRUD Operations

#### Create Session
```http
POST /api/v1/activities/{activityId}/sessions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "sessionType": "CLASSIC",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4
}
```

**Request Body** (`SessionRequest`):

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `sessionType` | String | Yes | "CLASSIC" or "FREESTYLE" | Session mode |
| `focusTimeInMinutes` | Integer | Yes | Min: 1 | Focus phase duration |
| `breakTimeInMinutes` | Integer | Yes | Min: 1 | Break phase duration |
| `cycles` | Integer | CLASSIC: Yes<br>FREESTYLE: No | Min: 1 | Number of cycles (ignored for FREESTYLE) |

**Response**: `SessionItem` with status 201 Created

---

#### List Sessions
```http
GET /api/v1/activities/{activityId}/sessions?status=IN_PROGRESS
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `status` (optional): Filter by `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `NOT_STARTED`, or `CANCELED`

**Response**: Array of `SessionItem` objects

---

#### Get Session by ID
```http
GET /api/v1/activities/{activityId}/sessions/{id}
Authorization: Bearer <access_token>
```

**Response**: Single `SessionItem`

---

#### Delete Session (Soft)
```http
DELETE /api/v1/activities/{activityId}/sessions/{id}
Authorization: Bearer <access_token>
```

**Effect**: Sets `isDeleted=true`; session becomes inaccessible but data preserved.

**Response**: 200 OK with confirmation message

---

#### Update Session Note
```http
PUT /api/v1/activities/{activityId}/sessions/{id}/note?note=Updated%20text
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `note` (required): New note text (URL-encoded)

**Response**: Updated `SessionItem`

---

### Lifecycle Operations

#### Start Session
```http
POST /api/v1/activities/{activityId}/sessions/{id}/start
Authorization: Bearer <access_token>
```

**Preconditions**:
- Status must be `NOT_STARTED`
- Session must not be deleted or completed

**Effects**:
- Status → `IN_PROGRESS`
- `startedAt` → current timestamp
- Timer begins

**Response**: Updated `SessionItem`

---

#### Pause Session
```http
POST /api/v1/activities/{activityId}/sessions/{id}/pause?note=Taking%20a%20break
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `note` (optional): Note to attach (URL-encoded)

**Preconditions**:
- Status must be `IN_PROGRESS`

**Effects**:
- Status → `PAUSED`
- Elapsed time saved (time since `startedAt` added to `elapsedTime`)
- Optional note attached

**Response**: Updated `SessionItem`

---

#### Resume Session
```http
POST /api/v1/activities/{activityId}/sessions/{id}/resume
Authorization: Bearer <access_token>
```

**Preconditions**:
- Status must be `PAUSED`

**Effects**:
- Status → `IN_PROGRESS`
- `startedAt` reset to current timestamp
- Timer resumes from saved `elapsedTime`

**Response**: Updated `SessionItem`

---

#### Stop Session
```http
POST /api/v1/activities/{activityId}/sessions/{id}/stop?note=Stopped%20early
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `note` (optional): Note to attach (URL-encoded)

**Preconditions**:
- Status must be `IN_PROGRESS` or `PAUSED`

**Effects** (CRITICAL):
- Status → `NOT_STARTED`
- Current cycle **invalidated** (does not count toward `cyclesCompleted`)
- Phase reset → `FOCUS`
- `elapsedTime` cleared
- `startedAt` cleared
- Session can be restarted from beginning

**Use Case**: User realizes they need to abort current cycle without penalty.

**Response**: Updated `SessionItem` with message "Session stopped successfully (current cycle invalidated)"

---

#### Cancel Session
```http
POST /api/v1/activities/{activityId}/sessions/{id}/cancel
Authorization: Bearer <access_token>
```

**Preconditions**:
- Status must not be `COMPLETED` or `CANCELED`

**Effects** (CRITICAL):
- Status → `CANCELED`
- **All cycles invalidated**: `cyclesCompleted` → 0
- `completedAt` → current timestamp
- `elapsedTime` cleared
- Session permanently terminated (cannot restart)

**Use Case**: User wants to completely abandon session without any credit.

**Response**: Updated `SessionItem` with message "Session canceled successfully (all cycles invalidated)"

---

#### Complete Phase
```http
POST /api/v1/activities/{activityId}/sessions/{id}/complete-phase?note=Phase%20done
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `note` (optional): Note to attach (URL-encoded)

**Preconditions**:
- Session must be active and not completed

**Effects**:
- **FOCUS → BREAK**: Advances to break phase
- **BREAK → FOCUS**: Advances to focus phase, increments `cyclesCompleted` by 1
- **CLASSIC auto-completion**: If `cyclesCompleted >= totalCycles`, status → `COMPLETED`, `completedAt` set
- **SSE notification**: `phase-change` event sent to subscribers

**Response**: 
- If completed: "Session completed successfully"
- Otherwise: "Phase completed: FOCUS" or "Phase completed: BREAK"

---

#### Finish Session
```http
POST /api/v1/activities/{activityId}/sessions/{id}/finish?note=Done%20for%20today
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `note` (optional): Note to attach (URL-encoded)

**Preconditions**:
- Status must be `IN_PROGRESS` or `PAUSED`

**Effects**:
- **FREESTYLE special rule**:
  - If `currentPhase == BREAK`: Increment `cyclesCompleted` by 1 (current cycle counts)
  - If `currentPhase == FOCUS`: Do NOT increment (partial cycle doesn't count)
- Status → `COMPLETED`
- `completedAt` → current timestamp
- Push notification sent: "You completed X cycle(s)"

**Response**: Updated `SessionItem` with message "Session finished successfully"

---

## Server-Sent Events (SSE)

Real-time event stream for session updates.

### Subscribe to Events
```http
GET /api/v1/activities/{activityId}/sessions/{id}/events
Accept: text/event-stream
Authorization: Bearer <access_token>
```

**Connection**:
- Long-lived HTTP connection
- Events sent as `text/event-stream`
- Timeout: `Long.MAX_VALUE` (effectively no timeout)
- Use browser `EventSource` API

**Event Types**:

#### 1. `connected`
Sent immediately upon subscription.

**Data**:
```
Connected to session {id} events
```

#### 2. `phase-change`
Sent when `complete-phase` is called.

**Data** (JSON):
```json
{
  "sessionId": 123,
  "currentPhase": "BREAK",
  "cyclesCompleted": 2,
  "totalCycles": 4,
  "status": "IN_PROGRESS",
  "timestamp": "2025-12-05T14:30:00"
}
```

**Usage Example** (JavaScript):
```javascript
const eventSource = new EventSource(
  'https://apiv2.pomodify.site/api/v1/activities/1/sessions/10/events',
  { headers: { 'Authorization': 'Bearer ' + accessToken } }
);

eventSource.addEventListener('connected', (e) => {
  console.log('Connected:', e.data);
});

eventSource.addEventListener('phase-change', (e) => {
  const data = JSON.parse(e.data);
  console.log('Phase changed to:', data.currentPhase);
  console.log('Cycles completed:', data.cyclesCompleted);
});

eventSource.onerror = (err) => {
  console.error('SSE error:', err);
  eventSource.close();
};
```

---

## Request & Response Examples

### Session Item Response Format

```json
{
  "id": 123,
  "activityId": 45,
  "sessionType": "CLASSIC",
  "status": "IN_PROGRESS",
  "currentPhase": "FOCUS",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4,
  "cyclesCompleted": 1,
  "totalTimeInMinutes": 120,
  "note": "Working on feature X",
  "startedAt": "2025-12-05T14:00:00",
  "completedAt": null,
  "createdAt": "2025-12-05T13:55:00"
}
```

### Complete Flow Example

```http
# 1. Create CLASSIC session
POST /api/v1/activities/1/sessions
{
  "sessionType": "CLASSIC",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4
}
# Response: status=NOT_STARTED, id=10

# 2. Start session
POST /api/v1/activities/1/sessions/10/start
# Response: status=IN_PROGRESS, currentPhase=FOCUS

# 3. Complete focus phase
POST /api/v1/activities/1/sessions/10/complete-phase
# Response: currentPhase=BREAK, cyclesCompleted=0

# 4. Complete break phase
POST /api/v1/activities/1/sessions/10/complete-phase
# Response: currentPhase=FOCUS, cyclesCompleted=1

# 5. Pause mid-focus
POST /api/v1/activities/1/sessions/10/pause?note=Quick%20interruption
# Response: status=PAUSED, note="Quick interruption"

# 6. Resume
POST /api/v1/activities/1/sessions/10/resume
# Response: status=IN_PROGRESS

# 7. Complete remaining phases (6 more complete-phase calls)
# After 4th cycle completes: status=COMPLETED automatically

# 8. Delete session
DELETE /api/v1/activities/1/sessions/10
# Response: isDeleted=true
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful operation |
| 201 | Created | Session created successfully |
| 400 | Bad Request | Invalid state transition, validation failure |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | User doesn't own the activity |
| 404 | Not Found | Activity or session not found |
| 500 | Internal Server Error | Unexpected server error |

### Error Response Format

```json
{
  "message": "Pomodoro Session is not in progress and cannot be paused",
  "status": 400,
  "timestamp": "2025-12-05T14:30:00"
}
```

### Common Error Scenarios

**Invalid State Transition**:
```http
POST /api/v1/activities/1/sessions/10/pause
# Response 400: "Pomodoro Session is not in progress and cannot be paused"
```

**Missing JWT**:
```http
GET /api/v1/activities/1/sessions
# Response 401: "Missing authentication token"
```

**Invalid User Claim**:
```http
# JWT with no 'user' claim
GET /api/v1/activities/1/sessions
# Response 401: "Invalid token: missing user claim"
```

**Session Already Completed**:
```http
POST /api/v1/activities/1/sessions/10/start
# Response 400: "Pomodoro Session is already completed"
```

---

## Business Rules

### Session Creation
1. `sessionType` is required and must be "CLASSIC" or "FREESTYLE"
2. `focusTimeInMinutes` must be ≥ 1
3. `breakTimeInMinutes` must be ≥ 1
4. CLASSIC requires `cycles` ≥ 1; FREESTYLE ignores `cycles`
5. Session initially created with status `NOT_STARTED`, phase `FOCUS`, `cyclesCompleted=0`

### State Transitions
1. Can only `start` from `NOT_STARTED`
2. Can only `pause` from `IN_PROGRESS`
3. Can only `resume` from `PAUSED`
4. Can only `stop` from `IN_PROGRESS` or `PAUSED`
5. Cannot modify sessions with `isDeleted=true`
6. Cannot modify sessions with status `COMPLETED` or `CANCELED` (except for CLASSIC auto-completion)

### Cycle Counting
1. Cycles increment only on `BREAK → FOCUS` transition
2. `stop` invalidates current cycle (no increment)
3. `cancel` resets `cyclesCompleted` to 0
4. FREESTYLE `finish` during BREAK increments `cyclesCompleted`; during FOCUS does not

### Auto-Completion (CLASSIC only)
1. When `cyclesCompleted >= totalCycles` after `complete-phase`, status → `COMPLETED`
2. Manual `finish` can also complete before all cycles done

### Soft Deletion
1. `isDeleted=true` makes session inaccessible but preserves data
2. List/Get endpoints filter out deleted sessions
3. Deleted sessions cannot be updated or have lifecycle operations performed

### Notes
1. Notes are optional and can be added during `pause`, `stop`, `finish`, `complete-phase`
2. Notes can be updated anytime via `/note` endpoint
3. Notes are trimmed; blank notes stored as `null`

---

## Port & Base URL

**Port**: 8081 (standardized for local/dev/prod)

**Environment Base URLs**:
- **Production**: `https://apiv2.pomodify.site/api/v1/activities/{activityId}/sessions`
- **Development**: `http://localhost:8081/api/v1/activities/{activityId}/sessions`
- **Local**: `http://localhost:8081/api/v1/activities/{activityId}/sessions`

---

## Caching

Sessions are **not cached** by default. Real-time accuracy is prioritized over caching.

If caching is added in future:
- Cache key: `session:{sessionId}`
- Eviction: On any update operation (start, pause, resume, stop, cancel, complete-phase, finish, note update)
- TTL: Short-lived (e.g., 5 minutes)

---

## Version

**API Version**: v1

**Endpoints**: All session endpoints are under `/api/v1/activities/{activityId}/sessions`

**Backward Compatibility**: Changes to session logic or response format will be introduced in v2 with deprecation notices.
