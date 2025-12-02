# Session API

The Session API manages Pomodoro sessions owned by an Activity. All endpoints are authenticated via JWT. A session is always addressed under its owning activity: `/api/v1/activities/{activityId}/sessions`.

## Auth & Ownership
- Auth: Bearer JWT; server reads `user` claim and authorizes ownership.
- Ownership: An `Activity` belongs to a user; its `PomodoroSession`s are accessible only to that same user.
- Deletion: Soft-delete via `isDeleted=true` (no hard delete).

## Endpoints (nested under Activity)

Base path: `/api/v1/activities/{activityId}/sessions`

### Create
```http
POST /api/v1/activities/{activityId}/sessions
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "sessionType": "CLASSIC" | "FREESTYLE",
  "focusTimeInMinutes": 25,
  "breakTimeInMinutes": 5,
  "cycles": 4,
  "note": "optional"
}
```

### List
```http
GET /api/v1/activities/{activityId}/sessions?status=IN_PROGRESS|PAUSED|COMPLETED
Authorization: Bearer <access_token>
```

### Get by ID
```http
GET /api/v1/activities/{activityId}/sessions/{id}
Authorization: Bearer <access_token>
```

### Delete (soft)
```http
DELETE /api/v1/activities/{activityId}/sessions/{id}
Authorization: Bearer <access_token>
```
Effect: marks session `isDeleted=true`.

### Note (update only)
```http
PUT /api/v1/activities/{activityId}/sessions/{id}/note?note=Updated%20text
Authorization: Bearer <access_token>
```

## Lifecycle

```http
POST /api/v1/activities/{activityId}/sessions/{id}/start
POST /api/v1/activities/{activityId}/sessions/{id}/pause?note=Optional%20note
POST /api/v1/activities/{activityId}/sessions/{id}/resume
POST /api/v1/activities/{activityId}/sessions/{id}/stop?note=Optional%20note
POST /api/v1/activities/{activityId}/sessions/{id}/cancel
POST /api/v1/activities/{activityId}/sessions/{id}/complete-phase?note=Optional%20note
POST /api/v1/activities/{activityId}/sessions/{id}/finish?note=Optional%20note
Authorization: Bearer <access_token>
```

States: `NOT_STARTED → IN_PROGRESS ↔ PAUSED → COMPLETED | CANCELED`. `stop` resets the current cycle to `NOT_STARTED`.

FREESTYLE finish rule: if finishing while current phase is `BREAK`, the current round counts; if finishing during `FOCUS`, it does not.

## SSE (events)
```http
GET /api/v1/activities/{activityId}/sessions/{id}/events
Accept: text/event-stream
Authorization: Bearer <access_token>
```
Events: `connected`, `phase-change`, and others as implemented. Use an `EventSource` in the browser.

## Session Types
- `CLASSIC`: fixed cycles/durations as configured.
- `FREESTYLE`: free-running rounds; totals computed from completed cycles.

## Error Codes
- 401 Unauthorized (missing/invalid JWT)
- 403 Forbidden (not owner)
- 404 Not Found (activity or session)
- 400 Bad Request (invalid transition/args)

## Example Flow
```http
POST /api/v1/activities/1/sessions { ... }
GET  /api/v1/activities/1/sessions
POST /api/v1/activities/1/sessions/10/start
POST /api/v1/activities/1/sessions/10/complete-phase
POST /api/v1/activities/1/sessions/10/pause?note=Break
POST /api/v1/activities/1/sessions/10/resume
POST /api/v1/activities/1/sessions/10/finish
DELETE /api/v1/activities/1/sessions/10
```
