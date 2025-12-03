# Summary Reports API

This document describes the Summary Reports endpoint, its inputs, outputs, security, and typical usage patterns.

## Overview
- Purpose: Provide aggregated metrics, charts, recent sessions, and top activities for a user across a selected time range.
- Endpoint: `GET /api/reports/summary`
- Auth: JWT (OAuth2 Resource Server). Requires a valid token with a `user` claim. Missing/invalid credentials return `401`.

## Request
- Method: `GET`
- Path: `/api/reports/summary`
- Query Parameters:
  - `range`: one of `week` (default), `month`, `year`.

## Authentication
- The controller extracts the user ID from the JWT via the `user` claim.
- If the `user` claim is absent or invalid, the API responds with `401` and message `Unauthorized: invalid user claim`.

## Date Range Semantics
- Timezone: `Asia/Manila`.
- Weekly: Monday to Sunday of the current week.
- Monthly: First to last day of the current month.
- Yearly: First to last day of the current year.

## Response
- Status: `200 OK` on success.
- Body: `SummaryResponse` wrapping a `SummaryItem` object.

Example success payload:
```json
{
  "message": "Summary fetched successfully",
  "item": {
    "meta": {
      "range": "week",
      "start": "2025-12-01",
      "end": "2025-12-07"
    },
    "metrics": {
      "totalHours": 5.0,
      "completionRate": 80,
      "sessionsCount": 25
    },
    "chartData": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "datasets": {
        "focusHours": [1.5, 2.0, 0.5, 1.0, 0.0, 0.0, 0.0],
        "breakHours": [0.5, 0.7, 0.3, 0.6, 0.0, 0.0, 0.0]
      }
    },
    "recentSessions": [
      {
        "id": 123,
        "date": "2025-12-02",
        "type": "FOCUS",
        "status": "COMPLETED",
        "durationMinutes": 25
      }
    ],
    "topActivities": [
      {
        "name": "Coding",
        "totalMinutes": 300,
        "sessions": 12
      }
    ]
  }
}
```

## Error Responses
- `401 Unauthorized` (missing/invalid credentials):
```json
{
  "message": "Unauthorized: invalid user claim"
}
```
- `400 Bad Request` (invalid input):
```json
{
  "message": "<details about invalid argument or validation>"
}
```
- `500 Internal Server Error` (unexpected error):
```json
{
  "message": "<error message>"
}
```

## Usage Examples

Curl (weekly default):
```bash
curl -H "Authorization: Bearer <jwt>" \
  "https://<host>/api/reports/summary?range=week"
```

Curl (monthly):
```bash
curl -H "Authorization: Bearer <jwt>" \
  "https://<host>/api/reports/summary?range=month"
```

HTTP Client (VS Code `request/http/session.http` style):
```
GET {{host}}/api/reports/summary?range=year
Authorization: Bearer {{token}}
```

## Implementation Notes
- Controller: `ReportsController#getSummary(Jwt, String)` parses `range`, computes `start` and `end`, and delegates to `SummaryService`.
- Service: `SummaryService#getSummary(SummaryCommand)` aggregates domain data for metrics, chart datasets, recent sessions, and top activities.
- Mapper: `SummaryMapper#toResponse(SummaryResult)` converts domain result into presentation `SummaryResponse`.
- DTOs are implemented as Java records for immutability and clarity.

## Testing
- WebMvc tests cover:
  - Success path with valid JWT `user` claim.
  - `401` when JWT is missing.
  - `401` when `user` claim is missing/invalid.

## Change Log
- Dec 2025: Aligned unauthorized handling to return `401` (`AuthenticationCredentialsNotFoundException`) for missing/invalid user claim. Added tests for missing JWT.
