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

- `POST /api/v1/sessions` — Create session (body uses `activityId`, `sessionType`, `focusTimeInMinutes`, `breakTimeInMinutes`, `cycles`)
- `GET /api/v1/sessions[?activityId&status]` — List sessions
- `GET /api/v1/sessions/{id}` — Get session by ID
- `DELETE /api/v1/sessions/{id}` — Soft delete
- `POST /api/v1/sessions/{id}/start` — Start
- `POST /api/v1/sessions/{id}/pause?note=...` — Pause (optional note)
- `POST /api/v1/sessions/{id}/resume` — Resume
- `POST /api/v1/sessions/{id}/stop?note=...` — Stop (invalidates current cycle)
- `POST /api/v1/sessions/{id}/cancel` — Cancel (terminal)
- `POST /api/v1/sessions/{id}/complete-phase?note=...` — Complete current phase
- `POST /api/v1/sessions/{id}/finish?note=...` — Finish session
- `GET /api/v1/sessions/{id}/events` — SSE (may be unauthenticated)

## Freestyle finish behavior

- If current phase is `BREAK`, finishing counts the current cycle as completed.
- If current phase is `FOCUS`, finishing does not count an extra cycle.

Examples:
- Completed 3 cycles; on 4th `BREAK` → Finish → `cyclesCompleted = 4`.
- Completed 3 cycles; on 4th `FOCUS` → Finish → `cyclesCompleted = 3`.

---

Happy Coding! 🍅⏱️
