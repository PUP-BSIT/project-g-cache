# API Design Specification (v2): Productivity Summary Reports

This is a comprehensive API Design Specification (v2) for the Summary Reports endpoint. This version integrates all the improvements discussed: flexible date ranges, structured error handling, context-rich metrics, and actionable insights.

## 1. Overview
This endpoint aggregates user session data into a holistic productivity report. It supports both standard periods (Week/Month/Year) and user-defined custom date ranges. It is designed to drive frontend dashboards, visualization widgets, and progress tracking modules.

- **Endpoint**: `GET /api/v1/reports/summary`
- **Auth**: Bearer `<JWT>` (Requires `user` claim)
- **Timezone**: `Asia/Manila` (Strict adherence for day boundaries)

## 2. Request Specifications
### Query Parameters
We introduce `startDate`, `endDate`, and `fields` to make the API flexible.

- `range` (optional): One of `week`, `month`, `year` (default: `week` if no dates provided).
- `startDate` (optional): Start date in `YYYY-MM-DD` format.
- `endDate` (optional): End date in `YYYY-MM-DD` format.
- `fields` (optional): Comma-separated list of fields to include (e.g., `overview,trends,insights`). If omitted, returns all.

### Range Resolution Logic
- **Custom Range Priority**: If `startDate` AND `endDate` are provided, the system ignores `range` and calculates statistics for the specific interval.
- **Fallback**: If dates are missing, the system defaults to the `range` parameter (defaulting to current week).
- **Validation**:
  - `startDate` cannot be after `endDate`.
  - Ranges cannot exceed 365 days (performance guardrail).
  - Dates must be in `YYYY-MM-DD` format.

## 3. Response Structure (Elaborated)
The response body is a `SummaryResponse` containing the `SummaryReport`.

### A. Period Info
Metadata about the time frame covered.
```json
{
  "period": {
    "startDate": "2025-12-01",
    "endDate": "2025-12-07",
    "range": "week"
  }
}
```

### B. Overview (Expanded)
Now includes Break Time and explicit units for clarity.
```json
{
  "overview": {
    "totalFocusHours": 5.0,
    "totalBreakHours": 2.1,
    "completionRate": 80,
    "sessionsCount": 25,
    "averageSessionLength": 25
  }
}
```

### C. Trends (Contextualized)
Instead of just % change, we show Previous vs. Current values.
```json
{
  "trends": {
    "focusHours": {
      "current": 5.0,
      "previous": 4.5,
      "changePercent": 11.1
    },
    "completionRate": {
      "current": 80,
      "previous": 75,
      "changePercent": 6.7
    }
  }
}
```

### D. Insights (Structured)
Now an array of objects, not strings. This allows the UI to render icons, colors, or filter by severity.
```json
{
  "insights": [
    {
      "type": "positive",
      "severity": "high",
      "message": "Great job! Your focus hours increased by 11% this week.",
      "actionable": "Keep up the momentum!"
    },
    {
      "type": "warning",
      "severity": "medium",
      "message": "Break time is 42% of total time. Consider optimizing breaks.",
      "actionable": "Try shorter breaks for better flow."
    }
  ]
}
```

### E. Chart Data, Recent Sessions, Top Activities
Remains similar to v1, but integrated into the full response.

### Complete Success Example (200 OK)
```json
{
  "message": "Summary report generated successfully",
  "report": {
    "period": {
      "startDate": "2025-12-01",
      "endDate": "2025-12-07",
      "range": "week"
    },
    "overview": {
      "totalFocusHours": 5.0,
      "totalBreakHours": 2.1,
      "completionRate": 80,
      "sessionsCount": 25,
      "averageSessionLength": 25
    },
    "trends": {
      "focusHours": {
        "current": 5.0,
        "previous": 4.5,
        "changePercent": 11.1
      },
      "completionRate": {
        "current": 80,
        "previous": 75,
        "changePercent": 6.7
      }
    },
    "insights": [
      {
        "type": "positive",
        "severity": "high",
        "message": "Great job! Your focus hours increased by 11% this week.",
        "actionable": "Keep up the momentum!"
      }
    ],
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

## 4. Standardized Error Handling
We abandon the generic string message for 400 Bad Request in favor of a detailed field-level error report.

- **Status**: `400 Bad Request`
```json
{
  "message": "Invalid request parameters",
  "errors": [
    {
      "field": "startDate",
      "message": "Start date cannot be after end date"
    },
    {
      "field": "endDate",
      "message": "Date range exceeds 365 days"
    }
  ]
}
```

- **401 Unauthorized** (missing/invalid credentials):
```json
{
  "message": "Unauthorized: invalid user claim"
}
```

- **500 Internal Server Error** (unexpected error):
```json
{
  "message": "<error message>"
}
```

## 5. Implementation & Logic Elaboration
### Controller Layer (ReportsController)
- Input Parsing: Uses a DTO `ReportRequest` to capture query params.
- Validation: Checks date format, `startDate <= endDate`, range enum, max 365 days.
- Delegation: Calls `SummaryService.generateReport(user_id, start_date, end_date)`.

### Service Layer (SummaryService)
- Date Normalization: Converts inputs to `Asia/Manila` `ZonedDateTime`. Sets start to 00:00:00, end to 23:59:59.999.
- Aggregation Strategy: Single optimized SQL query to fetch sessions. Uses Stream API for streaks and distributions.
- Comparison Logic: Calculates "Previous Period" by subtracting current range duration from start date.
- Insights Generation: Analyzes metrics to generate structured insights.

### Security
- Authorization: `@PreAuthorize("@securityService.isOwner(authentication, #userId)")` ensures users access only their data.
- Rate Limiting: Limit custom range queries (e.g., 10/minute).

## 6. Usage Examples
Curl (weekly default):
```bash
curl -H "Authorization: Bearer <jwt>" \
  "https://<host>/api/v1/reports/summary?range=week"
```

Curl (custom range):
```bash
curl -H "Authorization: Bearer <jwt>" \
  "https://<host>/api/v1/reports/summary?startDate=2025-12-01&endDate=2025-12-07"
```

HTTP Client:
```
GET {{host}}/api/v1/reports/summary?range=month&fields=overview,trends
Authorization: Bearer {{token}}
```

## Testing
- WebMvc tests cover success, 401 (missing JWT/claim), 400 (invalid dates/ranges).

## Change Log
- Dec 2025: Updated to v2 with flexible date ranges, trends, structured insights, and detailed error handling.
