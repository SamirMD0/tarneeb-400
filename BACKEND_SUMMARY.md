# BACKEND_SUMMARY

## 1) High-level architecture overview

- **Runtime stack:** TypeScript + Node.js (ESM), Express for HTTP, Socket.IO for realtime gameplay, MongoDB (Mongoose) for persistence, Redis for active-room cache, Prometheus metrics via `prom-client`.
- **Boot flow:** `src/index.ts` validates env, wires security middleware, mounts health routes under `/api`, exposes `/metrics`, initializes Socket.IO, then connects MongoDB and Redis before listening.
- **Core backend layers:**
  - **Game domain (`src/game`)**: pure-ish game state, reducer, rules, and engine.
  - **Room lifecycle (`src/rooms`)**: room creation/join/start/disconnect handling.
  - **Caching (`src/cache`)**: room snapshot serialization + Redis TTL policies.
  - **Realtime transport (`src/sockets`)**: room/bidding/playing socket events and middleware.
  - **Persistence (`src/models`, `src/services`)**: game history and player stats in MongoDB.
  - **Platform concerns (`src/lib`, `src/middlewares`, `src/monitoring`)**: config, logging, metrics, health checks, rate limiting, sanitization, error handling.

## 2) Backend directory tree (with brief descriptions)

```text
Backend/
├── .env.example                 # Sample env vars (server, Mongo, Redis, CORS, rate-limit, security)
├── Dockerfile                   # Multi-stage image build (build TS -> run dist)
├── RUNBOOK.md                   # Ops notes (mainly Redis troubleshooting)
├── docs/
│   ├── API.md                   # Game/User schemas + health endpoint response shape
│   ├── ARCHITECTURE.md          # Cache/persistence architecture and data flow
│   └── ERROR_CODES.md           # Standard API/socket error code catalog
├── jest.config.js               # Jest ESM + ts-jest config
├── package.json                 # Scripts/dependencies
├── package-lock.json            # Locked dependency graph
├── tsconfig.json                # Strict TS config targeting ES2022/NodeNext
├── test_output.txt              # Test execution artifact/log
├── test_results.txt             # Test execution artifact/log
├── node_modules/                # Installed dependencies (vendor code)
└── src/
    ├── index.ts                 # App bootstrap, middleware chain, routes, metrics endpoint, startup
    ├── __tests__/               # Integration/stress + test setup
    ├── cache/
    │   ├── roomCache.ts         # Redis room cache API + serialize/deserialize + TTL logic
    │   └── roomCache.test.ts    # Cache behavior tests
    ├── game/
    │   ├── actions.ts           # Game action union types
    │   ├── deck.ts              # Deck creation/shuffle
    │   ├── engine.ts            # Stateful game engine + persistence trigger
    │   ├── reducer.ts           # Action application/state transitions
    │   ├── rules.ts             # Trick, bidding, score, and helper rules
    │   ├── scoring.ts           # (currently empty placeholder)
    │   ├── state.ts             # Core game state model + initial state builder
    │   └── tests/               # Game unit tests
    ├── lib/
    │   ├── env.ts               # Zod env validation + typed env accessor helpers
    │   ├── logger.ts            # Structured logging + sensitive-field redaction
    │   ├── logger.test.ts       # Logger tests
    │   ├── metrics.ts           # Prometheus counters/gauges/histograms + helpers
    │   ├── metrics.test.ts      # Metrics tests
    │   ├── mongoose.ts          # Mongo connection lifecycle + retry + stats
    │   └── redis.ts             # Redis clients + reconnect policy + circuit breaker
    ├── middlewares/
    │   ├── errorHandler.ts      # Global error/404 handlers + process error hooks
    │   ├── rateLimiter.ts       # HTTP and socket connection throttling
    │   ├── sanitization.ts      # Mongo/XSS/HPP sanitization + security headers
    │   ├── validator.ts         # Zod request/socket payload schemas + validation helpers
    │   └── tests/               # Middleware tests
    ├── models/
    │   ├── Game.model.ts        # Completed game history schema
    │   ├── User.model.ts        # Player profile/statistics schema
    │   └── index.ts             # Model barrel exports
    ├── monitoring/
    │   ├── healthCheck.ts       # /health, /health/live, /health/ready routes
    │   ├── healthCheck.test.ts  # Health endpoint tests
    │   └── performance.ts       # Async/sync timing wrappers + slow-op logging
    ├── rooms/
    │   ├── room.ts              # In-memory room aggregate + player/game lifecycle
    │   ├── roomManager.ts       # Room registry/retrieval/listing/cleanup
    │   ├── room.test.ts         # Room tests
    │   └── roomManager.test.ts  # Room manager tests
    ├── routes/
    │   └── health.ts            # Route alias exporting health router
    ├── services/
    │   ├── gameHistory.service.ts      # Persist games + user stats + leaderboard/history queries
    │   └── gameHistory.service.test.ts # Service tests
    ├── sockets/
    │   ├── socketServer.ts      # Socket.IO server init + connection-level controls
    │   ├── socketHandlers.ts    # Connection registration + game_action handling
    │   ├── socketMiddleware.ts  # Socket auth placeholder + per-socket rate/error wrappers
    │   ├── socketErrors.ts      # Normalized socket error mapping helper
    │   ├── socket.test.ts       # Socket tests
    │   ├── socketSecurity.test.ts # Socket security tests
    │   ├── socket.test.ts.conflict # Conflict artifact file
    │   └── events/
    │       ├── index.ts         # Event handler aggregator
    │       ├── room.handler.ts  # create/join/leave/start room events
    │       ├── bidding.handler.ts # bid/pass/set-trump events
    │       ├── playing.handler.ts # play-card event + trick/round auto-advance
    │       └── .keep            # Keep-empty-dir marker
    ├── types/
    │   ├── game.types.ts        # Shared game/card/round types
    │   ├── player.types.ts      # Player/team/leaderboard types
    │   ├── room.types.ts        # Room config/state types
    │   └── socket.types.ts      # Socket event and socket-data contracts
    └── utils/
        └── errors.ts            # Typed error hierarchy + normalization helpers
```

## 3) `Development.md` analysis (requested)

- I could not find `Backend/Development.md` (or case variants) in this repository.
- Closest operational/setup guidance appears in:
  - `Backend/.env.example`
  - `Backend/package.json`
  - `Backend/Dockerfile`
  - `Backend/RUNBOOK.md`
  - `Backend/docs/*`

### Setup, dependencies, env, build, workflows (from available docs/config)

- **Setup/runtime expectations**
  - Requires MongoDB + Redis connectivity.
  - Server defaults to port `5000`.
  - `docker-compose` exists at repo root; backend has its own Dockerfile for containerized build/run.
- **Dependencies**
  - Runtime: `express`, `socket.io`, `mongoose`, `redis`, `zod`, `winston`, `prom-client`, and security/rate-limit libs.
  - Dev: TypeScript, tsx, Jest/Vitest, Supertest, socket.io-client typing/test tooling.
- **Environment variables** (sampled in `.env.example`)
  - Core: `NODE_ENV`, `PORT`
  - Mongo: `MONGO_URI`, pool + write concern controls
  - Redis: `REDIS_URL`
  - Security/ops: `CORS_ORIGIN`, rate-limit knobs, validation/logging/stack-trace toggles
- **Build/run/test workflow**
  - Dev: `npm run dev` (`tsx watch src/index.ts`)
  - Build: `npm run build` (`tsc` -> `dist/`)
  - Start: `npm start` (`node dist/index.js`)
  - Type-check: `npm run typecheck`
  - Test: `npm test`
- **Operational workflow notes**
  - Runbook emphasizes Redis outage/latency handling and graceful degradation behavior.
  - Architecture docs describe write-through caching and cache-aside hydration.

## 4) Database, API, auth, and key backend logic notes

- **Database setup**
  - **MongoDB**: primary persistence for completed games and user stats; connection includes retry/backoff and pool tuning.
  - **Redis**: active room cache with TTL by room/game state; includes circuit-breaker style protection.
- **API structure**
  - HTTP routes are minimal and centered on health and metrics:
    - `/api/health`, `/api/health/live`, `/api/health/ready`
    - `/metrics`
  - Most gameplay interactions are Socket.IO events rather than REST endpoints.
- **Authentication**
  - Socket auth middleware is currently a **placeholder** (accepts connections; production token validation marked TODO).
  - Error model includes unauthorized/forbidden types but full auth pipeline is not yet implemented.
- **Key logic**
  - `GameEngine` dispatches reducer actions, tracks rounds, and persists completed games.
  - Room system coordinates players and game start; game-state updates are cached with debounce.
  - Realtime handlers are split by domain: room management, bidding, and card playing.
  - Security baseline includes rate limits, sanitization, HPP prevention, structured error responses, and secure headers.
  - Monitoring includes Prometheus metrics and health/readiness/liveness probes.

## 5) Major folder responsibilities + key files

- **`src/routes`**
  - Purpose: HTTP route wiring.
  - Key file: `health.ts` (exports monitoring router).
- **`src/monitoring`**
  - Purpose: health endpoints + performance instrumentation utilities.
  - Key files: `healthCheck.ts`, `performance.ts`.
- **`src/controllers`**
  - Not present in this backend; responsibilities are split across socket handlers, room classes, services, and middleware.
- **`src/services`**
  - Purpose: database-facing business operations.
  - Key file: `gameHistory.service.ts`.
- **`src/models`**
  - Purpose: persistence schemas.
  - Key files: `Game.model.ts`, `User.model.ts`.
- **`src/sockets`**
  - Purpose: realtime transport orchestration and event handlers.
  - Key files: `socketServer.ts`, `socketHandlers.ts`, `events/*.handler.ts`, `socketMiddleware.ts`.
- **`src/rooms`**
  - Purpose: room aggregate + room orchestration and lifecycle.
  - Key files: `room.ts`, `roomManager.ts`.
- **`src/game`**
  - Purpose: game domain state machine and rules.
  - Key files: `engine.ts`, `reducer.ts`, `state.ts`, `rules.ts`, `actions.ts`, `deck.ts`.
- **`src/cache`**
  - Purpose: Redis room cache abstraction.
  - Key file: `roomCache.ts`.
- **`src/lib`**
  - Purpose: shared infrastructure (env/logging/metrics/DB clients).
  - Key files: `env.ts`, `logger.ts`, `metrics.ts`, `mongoose.ts`, `redis.ts`.
- **`src/middlewares`**
  - Purpose: HTTP validation, sanitization, throttling, and global error handling.
  - Key files: `validator.ts`, `sanitization.ts`, `rateLimiter.ts`, `errorHandler.ts`.
- **`src/types` / `src/utils`**
  - Purpose: shared type contracts and common error classes.
  - Key files: `types/*.ts`, `utils/errors.ts`.
