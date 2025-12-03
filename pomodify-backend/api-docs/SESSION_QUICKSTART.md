# Session API Quick Start

## What's Implemented

✅ Complete Session API (CRUD + lifecycle + finish) with JPA persistence  
✅ JWT-authenticated endpoints (via `Authorization: Bearer <token>`)  
✅ Server-Sent Events (SSE) for real-time phase notifications  
✅ HTTP test files in `request/http/`  
✅ Full documentation in `SESSION_API.md`

## Run the application

```bash
./mvnw spring-boot:run
```

Default base URL: `http://localhost:8081`

## Get a JWT

Use the existing auth requests to obtain a token:
- Open `request/http/auth.http` (or `request/authRequest.http`) and run the login request.
- Copy the access token value and paste it into the browser test page (below).

## Test with your browser (CORS)

This verifies CORS by calling the API from a different origin.

1) Serve the static test page
```bash
# From project root
python3 -m http.server -d test/browser 8000
# or use VS Code Live Server on the `test/browser` folder
```

2) Open the page in your browser
- Go to `http://localhost:8000/session-api-browser-test.html`
- Enter:
  - Base URL: `http://localhost:8081`
  - JWT: your token from the auth step
  - Activity ID: your activity (e.g., `1`)
  - Session type, durations, and cycles

3) Click buttons to exercise endpoints
- Create → Start → Pause/Resume → Complete Phase → Finish → Delete
- Use Get and List to verify persisted state
- Subscribe to SSE to see `phase-change` events

If CORS blocks requests, adjust your Spring CORS config to allow `http://localhost:8000`.

## Endpoint Summary (auth required)

All session resources are now nested under their owning activity:

- `POST /api/v1/activities/{activityId}/sessions` — Create session (body provides timing & cycle config)
- `GET /api/v1/activities/{activityId}/sessions` — List sessions for activity
- `GET /api/v1/activities/{activityId}/sessions/{sessionId}` — Get session
- `DELETE /api/v1/activities/{activityId}/sessions/{sessionId}` — Soft delete
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/start` — Start
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/pause` — Pause
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/resume` — Resume
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/stop` — Stop (invalidates current cycle)
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/cancel` — Cancel (terminal)
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/complete-phase` — Complete current phase
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/finish` — Finish session
- `PUT /api/v1/activities/{activityId}/sessions/{sessionId}/note` — Update note
- `GET /api/v1/activities/{activityId}/sessions/{sessionId}/events` — SSE (phase-change stream)

Push notification preference endpoints:
- `POST /api/v1/push/register-token` — Register/update FCM token (implicitly enabled)
- `PUT /api/v1/push/enable` — Enable notifications
- `PUT /api/v1/push/disable` — Disable notifications (opt-out)
- `GET /api/v1/push/status` — Current enabled state
- `DELETE /api/v1/push/unregister-token` — Remove token

## Freestyle finish behavior

- If current phase is `BREAK`, finishing counts the current cycle as completed.
- If current phase is `FOCUS`, finishing does not count an extra cycle.

Examples:
- Completed 3 cycles; on 4th `BREAK` → Finish → `cyclesCompleted = 4`.
- Completed 3 cycles; on 4th `FOCUS` → Finish → `cyclesCompleted = 3`.

---

### Angular Test Harness (Optional)
Run `npm start` in `test/angular/pomodify-test` to interact with all endpoints including push preferences and observe foreground FCM messages in console.

Happy Coding! 🍅⏱️
