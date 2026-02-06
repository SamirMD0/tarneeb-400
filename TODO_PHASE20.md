PHASE 20 – Logging & Monitoring (TODO)
Goal

Production-grade observability: structured logging, metrics, health checks, and performance visibility across REST, WebSocket, and game engine layers.

Core Files to Create
[ ] Create logger.ts

File: Backend/src/lib/logger.ts
Status: Implemented (needs verification)

Must include:

Winston logger with levels (error, warn, info, debug)

Structured JSON logs

Console transport (dev)

File transport (prod)

Timestamp + service name

Redaction of sensitive fields (player hands, tokens, secrets)

Verify / Fix:

Logs are environment-aware

No sensitive game state leaks

Stack traces logged server-side only

Why needed:
Consistent, searchable logs suitable for production debugging.

[ ] Create metrics.ts

File: Backend/src/lib/metrics.ts
Status: Implemented (needs verification)

Must track:

Active rooms (gauge)

Active sockets (gauge)

Games per hour (counter)

Error rate (counter by error code)

Response time histogram (REST + socket events)

Must expose:

/metrics endpoint (Prometheus format)

Verify / Fix:

Metrics are registered once (no duplicate collectors)

Labels are bounded (no unbounded cardinality)

Histogram buckets are sane

Why needed:
Quantifiable visibility into system health and load.

Monitoring Endpoints
[ ] Create healthCheck.ts

File: Backend/src/monitoring/healthCheck.ts
Status: Implemented (needs verification)

Endpoints:

GET /health

{
  "status": "ok",
  "uptime": number,
  "mongodb": "up | down",
  "redis": "up | down"
}


GET /health/live

GET /health/ready

Verify / Fix:

Readiness fails if Mongo or Redis unavailable

Liveness never checks dependencies

No heavy logic in health routes

Why needed:
Kubernetes / Docker / load balancer compatibility.

[ ] Create performance.ts

File: Backend/src/monitoring/performance.ts
Status: Partially implemented / verify

Must include:

Timing helpers for:

Game actions

Reducer execution

Socket event handling

Integration with metrics histograms

Optional slow-operation logging threshold

Why needed:
Detect bottlenecks before users do.

Missing Integration
[ ] Wire logging everywhere

Files: All services, handlers, reducers

Must log:

Server startup/shutdown

Room creation / destruction

Player join/leave

Game start/end

Errors (typed, with codes)

Levels:

info: normal lifecycle events

warn: recoverable issues

error: failed operations

debug: dev-only traces

Why needed:
Logs without coverage are useless.

[ ] Wire metrics into key paths

Files:

REST controllers

Socket handlers

Game engine / reducer

Must track:

Request duration

Socket event duration

Error increments

Room/game counters

Why needed:
Metrics must reflect real usage, not just infra.

Missing Tests
[ ] logger.test.ts

File: Backend/src/lib/logger.test.ts

Must verify:

Correct log levels

JSON structure

Redaction works

No sensitive fields logged

[ ] metrics.test.ts

File: Backend/src/lib/metrics.test.ts

Must verify:

Counters increment correctly

Histograms record values

/metrics endpoint responds

No duplicate registry errors

[ ] healthCheck.test.ts

File: Backend/src/monitoring/healthCheck.test.ts

Must verify:

Healthy state returns 200

Dependency failure affects readiness

Liveness always passes

[ ] Integration monitoring tests

File: Backend/src/__tests__/integration/monitoring.test.ts

Scenarios:

High request volume

Socket churn

Error spikes

Metrics updated accordingly

Known Non-Goals (Explicitly Out of Scope)

❌ APM integration (Datadog, New Relic)
❌ Distributed tracing (OpenTelemetry)
❌ Alerting rules / dashboards

Note: These are deferred, not ignored.