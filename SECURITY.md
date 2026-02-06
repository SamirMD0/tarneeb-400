# Security

This document describes the security measures implemented in the Tarneeb/400 backend.

## Input Validation

### Zod Schema Validation
All inputs are validated using [Zod](https://zod.dev/) schemas before processing:
- **REST API**: Request body, query params, and path params validated via middleware
- **WebSocket**: Event payloads validated before handler execution
- **Game Reducer**: All game actions validated before state mutation

Invalid input is rejected with `400 VALIDATION_ERROR`.

### Schemas Implemented
- `RoomConfigSchema` - Room creation configuration
- `GameActionSchema` - All game actions (BID, PASS, PLAY_CARD, etc.)
- `CardSchema` - Card validation (suit + rank)

## Input Sanitization

### XSS Prevention
All string inputs are sanitized:
- HTML tags removed
- `javascript:` protocol stripped
- Event handlers (`onclick=`, etc.) removed

### MongoDB Injection Prevention
Using `express-mongo-sanitize`:
- Keys starting with `$` are replaced
- Dot notation in keys is sanitized

### HTTP Parameter Pollution
Duplicate query parameters are rejected (except whitelisted: `sort`, `fields`, `filter`).

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global API | 100 requests | 15 minutes |
| Room creation | 3 rooms | 1 hour |
| Socket connections | 10 per IP | 1 minute |
| Socket events | 10 actions | 1 second |

Rate limit exceeded returns `429 RATE_LIMIT_EXCEEDED`.

## Security Headers

All responses include:
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-Content-Type-Options: nosniff` - MIME sniffing prevention
- `X-XSS-Protection: 1; mode=block` - XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` - Script/style source restrictions

## Error Handling

### Operational vs Programming Errors
- **Operational errors** (400-499): Expected, client-facing, detailed messages
- **Programming errors** (500): Logged server-side, generic client message

### Stack Trace Protection
Stack traces are **never** exposed in production. Controlled via `EXPOSE_STACK_TRACES=false`.

### Uncaught Error Handling
Process-level handlers catch:
- Uncaught exceptions → graceful shutdown
- Unhandled rejections → graceful shutdown

## Environment Validation

All environment variables are validated at startup using Zod. If validation fails, the server exits immediately (fail-fast).

## Configuration

Security settings are configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `ROOM_CREATION_LIMIT` | 3 | Max rooms per IP per hour |
| `ENABLE_STRICT_VALIDATION` | true | Strict input validation |
| `LOG_ERRORS` | true | Log errors to console |
| `EXPOSE_STACK_TRACES` | false | Include stack traces in responses |
