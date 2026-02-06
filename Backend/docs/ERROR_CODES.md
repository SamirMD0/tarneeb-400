# Error Codes Reference

This document lists all error codes returned by the API.

## Client Errors (4xx)

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data - request body, query params, or path params failed validation |
| `UNAUTHORIZED` | 401 | Authentication required or token invalid |
| `FORBIDDEN` | 403 | Authenticated but not authorized to access resource |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Resource state conflict (e.g., room already full) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests - wait before retrying |

## Server Errors (5xx)

| Code | Status | Description |
|------|--------|-------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `GAME_ENGINE_ERROR` | 500 | Game state corruption or invalid state transition |
| `SERVICE_UNAVAILABLE` | 503 | External dependency (MongoDB, Redis) unavailable |

## Socket Errors

| Code | Description |
|------|-------------|
| `INVALID_CONFIG` | Room configuration invalid |
| `INVALID_ROOM_ID` | Room ID missing or malformed |
| `ROOM_NOT_FOUND` | Room does not exist |
| `ROOM_FULL` | Room has reached max players |
| `JOIN_FAILED` | Room join failed for unknown reason |
| `NOT_IN_ROOM` | Action requires being in a room |
| `INVALID_ACTION` | Game action malformed or rejected by engine |
| `GAME_NOT_STARTED` | Game action sent before game started |
| `INVALID_PAYLOAD` | Socket event payload validation failed |

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { ... }
  },
  "timestamp": "2026-02-06T15:30:00.000Z",
  "path": "/api/rooms"
}
```

> **Note:** `details` and `stack` are only included in non-production environments or when `EXPOSE_STACK_TRACES=true`.
