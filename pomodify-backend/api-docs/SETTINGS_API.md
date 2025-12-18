# User Settings API

Port: `8081` (local/dev and recommended default)
Base path: `/api/v2/settings`

Authentication: JWT (claim `user` holds numeric user ID). Secured under `prod` profile.

## Enums
- `SoundType`: `BELL`, `CHYME`, `DIGITAL_BEEP`, `SOFT_DING`
- `AppTheme`: `LIGHT`, `DARK`, `SYSTEM`

## GET /api/v1/settings
Returns current user's settings. Auto-creates defaults if not found.

Example:
```http
GET /api/v1/settings HTTP/1.1
Authorization: Bearer <JWT>
```

Response:
```json
{
  "userId": 123,
  "notificationsEnabled": true,
  "notificationSound": true,

  "soundType": "BELL",
  "volume": 80,
  "autoStartPomodoros": true,
  "autoStartBreaks": false,

  "theme": "SYSTEM",
  "updatedAt": "2025-12-01T10:12:30Z"
}
```

## PATCH /api/v1/settings
Partial update. Only provided fields are applied. `volume` clamped to `0..100`.

Example (toggle + change volume + theme):
```http
PATCH /api/v1/settings HTTP/1.1
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "notificationsEnabled": false,
  "volume": 50,
  "theme": "DARK"
}
```

Response: same shape as GET.

### Behavior & Rules
- Defaults created on first access: see GET response.
- Push enforcement: if `notificationsEnabled` is false, server prevents push dispatches; token must exist and be enabled.
- Event on toggle: token enabled/disabled updated via listener.
- Caching: GET is cached per user; PATCH evicts the cache.
- Auditing: `updatedAt` maintained automatically.

### Examples (curl)
```bash
# Get
curl -sS -H "Authorization: Bearer $JWT" http://localhost:8081/api/v1/settings

# Patch
curl -sS -X PATCH -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"soundType":"DIGITAL_BEEP","volume":20}' \
  http://localhost:8081/api/v1/settings
```

### Operational Notes
- Flyway migrations (prod): `classpath:db/migration` (e.g., `V3__create_user_settings.sql`).
- Firebase: set `FCM_SERVICE_ACCOUNT` to enable; unset skips with warning.
- Profiles:
  - `local`: H2, Hibernate `ddl-auto=update`, Firebase optional.
  - `dev`: Postgres/local DB, `ddl-auto=update`.
  - `prod`: Flyway, `ddl-auto=none`.
