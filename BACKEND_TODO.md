# BACKEND_TODO.md — Production Readiness Roadmap
> Generated from full codebase review · Tarneeb backend · Phase 21+
> Review verdict: **NOT APPROVED FOR PRODUCTION** — see Critical section.

---

## Executive Summary

The backend is a well-structured real-time multiplayer game server built on Express + Socket.IO + MongoDB + Redis. It shows strong engineering ambition: metrics, health checks, structured logging, Zod validation, Redis caching with circuit breakers, and a clean game reducer pattern. However, several **critical defects** exist that would cause data loss, security breaches, or availability failures under real production load.

**Production Readiness Score: 5.5 / 10**

---

## What Is Well-Designed (Keep These)

- **Pure reducer pattern** (`game/reducer.ts`) — state is never mutated, `structuredClone` on every action is correct for correctness (though expensive at scale — see Performance).
- **Error hierarchy** (`utils/errors.ts`) — clean, typed, with `isOperational` semantics. `normalizeError` is a good catch-all.
- **Prometheus metrics** (`lib/metrics.ts`) — correct cardinality discipline (`req.route?.path` not `req.path`), appropriate histogram buckets.
- **Zod validation** — applied consistently at HTTP and socket layers.
- **Redis circuit breaker** — the failure count + open/reset pattern is solid for resilience.
- **Test infrastructure** (`__tests__/setup.ts`) — race-condition-safe `waitForEvent`, listener-before-emit discipline, load test batching. This is genuinely good test engineering.
- **`roomCache` serialize/deserialize** — covers the full persistence boundary including mid-trick state.
- **`sanitizeGameState`** — stripping `deck` before broadcast is a correct cheating prevention measure.
- **Health check endpoints** — liveness vs readiness split is Kubernetes-correct.

---

## CRITICAL ISSUES (Block Deployment)

### C1 — `UserModel` schema mismatch: uses `socketId`/`username` but schema defines `email`/`name`/`password`

**File:** `models/User.model.ts` vs `services/gameHistory.service.ts`

`gameHistory.service.ts` does:
```ts
await UserModel.findOneAndUpdate(
  { socketId: player.id },
  { $inc: { gamesPlayed: 1, wins: isWinner ? 1 : 0 },
    $setOnInsert: { socketId: player.id, username: player.id, createdAt: new Date() }
  },
  { upsert: true }
);
```
But `User.model.ts` has no `socketId` or `username` fields. It has `name`, `email`, `password`, `gamesWon`, not `wins`. `auth.service.ts` also references `gamesWon` but the leaderboard query uses `wins`. **Every game save will either silently fail or upsert documents that don't conform to the schema.**

**Fix:** Either create a separate `PlayerStatsModel` for socket-based stats (recommended — separates auth identity from game stats), or add `socketId`/`username`/`wins` to `User.model.ts` and remove the mismatch. The `getLeaderboard` function queries `wins` which doesn't exist on the schema, returning empty results always.

```ts
// Recommended: separate model
const PlayerStatsSchema = new Schema({
  socketId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  gamesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
export const PlayerStatsModel = mongoose.model('PlayerStats', PlayerStatsSchema);
```

---

### C2 — JWT secret is hardcoded with a weak default; no auth enforced on socket events

**File:** `services/auth.service.ts`, `middlewares/auth.middleware.ts`, `sockets/socketMiddleware.ts`

```ts
const JWT_SECRET = process.env.JWT_SECRET ?? 'change_me_in_production';
```

If `JWT_SECRET` is not set, any attacker can forge tokens using `'change_me_in_production'`. Worse, `authMiddleware` in `socketMiddleware.ts` is a **no-op placeholder**:
```ts
export function authMiddleware(socket, next): void {
  // Placeholder: Accept all connections for now
  socket.data.userId = socket.handshake.auth.userId || socket.id;
  next();
}
```
`userId` is set to `socket.handshake.auth.userId` — **untrusted client input** — with no verification. Any client can impersonate any player by sending `auth: { userId: 'victim_socket_id' }`.

**Real-world consequence:** Players can forge identity, join other players' rooms, hijack game sessions.

**Fix:**
1. Throw at startup if `JWT_SECRET` is missing or is the default string.
2. Implement real JWT verification in `authMiddleware` before `io.use(authMiddleware)` is registered.
3. Never trust `socket.handshake.auth.userId` without verifying the JWT.

```ts
// lib/env.ts — add to schema
JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

// socketMiddleware.ts
import jwt from 'jsonwebtoken';
export function authMiddleware(socket: SocketType, next: (err?: Error) => void): void {
  const token = socket.handshake.auth.token;
  if (!token) { next(new Error('AUTH_REQUIRED')); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('INVALID_TOKEN'));
  }
}
```

---

### C3 — `roomCache.deserialize` silently swallows all errors; `Room` deserialized without listener reattachment

**File:** `cache/roomCache.ts`

```ts
deserialize(json: string): Room | null {
  try {
    // ...
    if (data.gameState && data.hasGame) {
      room.gameEngine = new GameEngine(playerIds, data.id);
      (room.gameEngine as unknown as { state: unknown }).state = data.gameState;
    }
    return room;
  } catch (error) {
    console.error('Failed to deserialize room:', error);
    return null;  // ← silent failure
  }
}
```

1. **State injection via type cast** `{ state: unknown }` bypasses TypeScript safety entirely. Any schema change to `GameState` will silently produce a corrupted engine with no error.
2. **No listener reattachment**: When a room is hydrated from Redis, `room.gameEngine.subscribe(() => saveState())` is never called. Game actions after cache hydration will **not be persisted back to Redis**.
3. **`console.error` instead of structured logging** — bypasses the entire `logger` infrastructure.

**Fix:**
```ts
// Add a hydration method to GameEngine
public static fromState(state: GameState, playerIds: string[], roomId: string): GameEngine {
  const engine = new GameEngine(playerIds, roomId);
  // Validate state shape before assignment
  if (!isValidGameState(state)) throw new Error('Invalid GameState schema');
  engine.state = state;
  return engine;
}

// In Room class — add public reattach method
public reattachPersistence(): void {
  if (this.gameEngine) {
    this.gameEngine.subscribe(() => this.saveState(false));
  }
}

// In roomCache.deserialize and roomManager.getRoom — call room.reattachPersistence()
```

---

### C4 — `mongoose.ts` calls `process.exit(1)` on connection failure; no graceful shutdown

**File:** `lib/mongoose.ts`

```ts
if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
  console.error('Max MongoDB connection attempts reached. Exiting.');
  process.exit(1);
}
```

Calling `process.exit(1)` inside a library function that may be called during request handling will crash the process without flushing in-flight responses, closing Socket.IO connections gracefully, or draining the Redis client. In a containerized environment this causes ungraceful pod termination.

**Fix:** Throw an error and let the calling code (`bootstrap()` in `index.ts`) decide to exit. Implement a proper `SIGTERM` handler with connection draining.

```ts
// mongoose.ts — throw instead of exit
throw new Error(`MongoDB: max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`);

// index.ts — handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — draining connections');
  await new Promise(resolve => httpServer.close(resolve));
  io.close();
  await disconnectMongo();
  await redis.disconnect();
  process.exit(0);
});
```

---

### C5 — In-memory `RoomManager` loses all state on process restart; no hydration on boot

**File:** `rooms/roomManager.ts`

`RoomManager` stores rooms in `private rooms: Map<RoomID, Room>`. On process restart (deploy, crash, OOM kill), all active games are lost. Redis caching exists but `RoomManager` never loads from Redis on startup. This makes Redis persistence cosmetic, not functional.

**Fix:** Add boot-time hydration.

```ts
// roomManager.ts
async initialize(): Promise<void> {
  const cached = await roomCache.getAllActiveRooms();
  for (const room of cached) {
    room.reattachPersistence(); // C3 fix
    this.rooms.set(room.id, room);
  }
  logger.info(`Hydrated ${cached.length} rooms from Redis`);
}

// index.ts — in bootstrap()
await roomManager.initialize();
```

---

### C6 — `preventHPP` middleware has broken logic: `filter` (whitelisted) is deduplicated

**File:** `middlewares/sanitization.ts`

```ts
const ALLOWED_DUPLICATES = ['sort', 'fields', 'filter'];

// In preventHPP:
if (!ALLOWED_DUPLICATES.includes(key) && Array.isArray(value)) {
  sanitizedQuery[key] = value[0]; // takes first
}
// ...
sanitizedQuery[key] = value; // else takes full array
```

But `filter` is in `ALLOWED_DUPLICATES` yet the test asserts it IS deduplicated:
```ts
// sanitization.test.ts
assert.equal((mockRequest.query as any).filter, 'a'); // expects first value, not array
```

The test contradicts the whitelist. `filter` should be an array if whitelisted but the test expects `'a'` (scalar). This inconsistency means either the whitelist or the test is wrong. In production, filter params would be unexpectedly coerced.

**Fix:** Decide whether `filter` should be an array or not and make both the implementation and tests consistent.

---

## HIGH PRIORITY ISSUES

### H1 — `structuredClone` on every game action is O(n) and will bottleneck at scale

**File:** `game/reducer.ts`

```ts
const next: GameState = structuredClone(state);
```

`structuredClone` deep-copies the entire game state on every action, including all 52 card objects and 4 player hands (52 cards total). At 100 concurrent rooms each playing rapidly, this is 100 full deep-clones per trick card. More critically, `structuredClone` is significantly slower than manual shallow copy + targeted mutation for known shapes.

**Fix:** Use Immer or manual shallow clone with targeted array spreading:
```ts
// Only clone what changes
const next = { ...state };
next.players = state.players.map(p => ({ ...p, hand: [...p.hand] }));
next.trick = [...state.trick];
next.teams = { 1: { ...state.teams[1] }, 2: { ...state.teams[2] } };
```

---

### H2 — Room ID generation uses `Date.now()` which collides under concurrent load

**File:** `rooms/roomManager.ts`

```ts
function generateRoomId(): RoomID {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
```

`Date.now()` has millisecond resolution. Two simultaneous room creations in the same millisecond + same random suffix = collision. In the load test with 100 concurrent rooms, this is a realistic failure scenario.

**Fix:** Use `crypto.randomUUID()` (Node 14.17+, no import needed):
```ts
import { randomUUID } from 'crypto';
function generateRoomId(): RoomID {
  return `room_${randomUUID()}`;
}
```

---

### H3 — No authorization on game actions: any player can act out of turn

**File:** `sockets/events/bidding.handler.ts`, `playing.handler.ts`

The handlers check `socket.data.playerId` for dispatch but the game engine itself validates turn order. However, `socket.data.playerId` is set as:
```ts
socket.data.playerId = socket.handshake.auth.userId || socket.id;
```
Since `userId` is untrusted (C2), a malicious client can set `playerId` to any player's ID and attempt to act on their behalf. The engine rejects out-of-turn actions, but this is the **only** security layer — and it only works if `playerId` cannot be spoofed.

**Fix:** After fixing C2, `socket.data.userId` must come from the verified JWT payload only. Then `playerId` = `userId` from verified context.

---

### H4 — `EXPOSE_STACK_TRACES=true` leaks internal stack traces to all clients in non-production

**File:** `middlewares/errorHandler.ts`, `.env.ts`, test setup

```ts
process.env.EXPOSE_STACK_TRACES = 'true'; // in multiple test setup files
```

The errorHandler sends stack traces when `EXPOSE_STACK_TRACES=true`. While correct for test, if this env var leaks to staging/production (and it's default `'false'`, but the test setup sets it globally), stack traces reveal internal file paths, framework versions, and logic.

**Fix:** Enforce that `EXPOSE_STACK_TRACES` cannot be `true` in `NODE_ENV=production`:
```ts
// In validateEnv()
if (validatedEnv.NODE_ENV === 'production' && validatedEnv.EXPOSE_STACK_TRACES) {
  throw new Error('EXPOSE_STACK_TRACES must be false in production');
}
```

---

### H5 — `roomCache.getAllActiveRooms()` does a full Redis SCAN on every `listRooms()` call

**File:** `cache/roomCache.ts`, `rooms/roomManager.ts`

`findAvailableRoom()`, `getWaitingRooms()`, `getActiveGameRooms()`, `getRoomCount()`, `removeEmptyRooms()` all call `listRooms()` which calls `roomCache.getAllActiveRooms()` which does a full `SCAN` + `mGet`. With 1000 rooms this is: 10+ round trips to Redis per player join attempt.

**Fix:** Maintain a Redis `SET` of active room IDs:
```ts
// On room create: SADD active_rooms room_id
// On room delete: SREM active_rooms room_id  
// On listRooms: SMEMBERS active_rooms -> batch GET
```
Or better: trust the in-memory `Map` as primary source and only use Redis for cross-process hydration.

---

### H6 — Debounced save in `Room.saveState()` can lose the final game state

**File:** `rooms/room.ts`

```ts
this.saveTimeout = setTimeout(save, this.DEBOUNCE_MS); // 1 second
```

If a process crashes within 1 second of the last game action (e.g., after the 13th trick), the final game state never reaches Redis. Since `hasPersisted` guards MongoDB save, the game history IS saved (via `engine.persistGame()`), but the room's final SCORING state is lost from Redis.

**Fix:** On `END_ROUND` and `END_TRICK` actions, always do an immediate save:
```ts
// In subscribe callback
this.gameEngine.subscribe((state) => {
  const immediate = state.phase === 'SCORING' || state.phase === 'GAME_OVER';
  this.saveState(immediate);
});
```

---

### H7 — No CORS restriction: `CORS_ORIGIN` defaults to `'*'`

**File:** `lib/env.ts`, `index.ts`

```ts
CORS_ORIGIN: z.string().optional().default('*'),
```

In production, `*` allows any origin to make credentialed requests. This enables CSRF-style attacks from arbitrary websites against authenticated users.

**Fix:** Remove the `'*'` default. Require explicit configuration:
```ts
CORS_ORIGIN: z.string().min(1),
// And in env validation, warn if it contains '*' in production
```

---

### H8 — `socketSecurity.test.ts` uses Vitest (`vi`, `expect`) while rest of codebase uses `node:test`

**File:** `sockets/socketSecurity.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

This file won't run with `node:test`. It's dead test code. Either the test runner setup supports both (fragile) or these tests are silently skipped in CI.

**Fix:** Migrate to `node:test` + `assert` like all other test files, or add Vitest to the project and document the split explicitly.

---

## MEDIUM PRIORITY ISSUES

### M1 — `User.model.ts` has `gamesWon` but leaderboard queries `wins`

**File:** `models/User.model.ts` vs `services/gameHistory.service.ts`

`User.model.ts`: `gamesWon: { type: Number, default: 0 }` (line in schema)  
`gameHistory.service.ts`: `sort({ wins: -1 })` — this field doesn't exist. Leaderboard always returns unsorted results.

Fix in conjunction with C1.

---

### M2 — `MongoMemoryServer` used in persistence tests but not in integration tests

**File:** `__tests__/integration/persistence.test.ts` uses `MongoMemoryServer`; other integration tests use mocked mongoose via `setup.ts`. This is correct, but the mock in `setup.ts` is a shallow object that doesn't validate document schemas:

```ts
const mockMongoose = {
  model: () => ({
    find: async () => [],
    findOne: async () => null,
    create: async () => ({}),
  }),
};
```

Any test that exercises code paths calling `UserModel.findOneAndUpdate` or `GameModel.create` will silently succeed without hitting real validation logic.

**Fix:** For integration tests that involve persistence (e.g., `errorTracking.test.ts`), either use `MongoMemoryServer` or explicitly document that persistence is not tested.

---

### M3 — `console.error` / `console.log` / `console.warn` used throughout instead of `logger`

**Files:** `lib/mongoose.ts`, `lib/redis.ts`, `rooms/room.ts`, `cache/roomCache.ts`, `sockets/socketServer.ts`

This bypasses structured logging, Prometheus integration, and log level control. In production, `console.*` goes to stdout unformatted.

**Fix:** Replace all `console.*` with `logger.*` from `lib/logger.ts`. Search: `grep -r "console\." src/ --include="*.ts"`.

---

### M4 — `GameEngine.persistGame()` skips persistence in test environment but relies on env check inside domain logic

**File:** `game/engine.ts`

```ts
if (this.isGameOver() && !this.hasPersisted && process.env.NODE_ENV !== 'test') {
  this.persistGame();
}
```

Domain logic (`GameEngine`) should not know about `NODE_ENV`. This is a layering violation. It also means you can never integration-test game persistence with a real engine without hacking `NODE_ENV`.

**Fix:** Use dependency injection for the persistence callback:
```ts
constructor(
  playerIds: string[],
  roomId?: string,
  private readonly onGameOver?: (state: GameState, winner: 1|2) => Promise<void>
) {}

// In dispatch(), when game is over:
if (this.isGameOver() && !this.hasPersisted && this.onGameOver) {
  this.hasPersisted = true;
  this.onGameOver(this.state, this.getWinner()!).catch(err => logger.error(...));
}
```

---

### M5 — Rate limiter in `socketMiddleware.ts` is per-event, not per-connection; map never garbage-collected properly

**File:** `sockets/socketMiddleware.ts`

```ts
const rateLimitMap = new Map<string, RateLimitData>();
setInterval(() => { /* cleanup expired */ }, 60000);
```

The cleanup interval runs every 60 seconds but entries expire after 1 second. With 400 concurrent sockets each emitting 10 events/second, that's 4000 entries held for up to 60 seconds unnecessarily. At scale this is a memory leak pattern.

**Fix:** Clean up on socket disconnect (already partially done via `cleanupSocketData`) and reduce cleanup interval to 5 seconds, or use a `WeakMap` alternative pattern with explicit socket lifecycle management.

---

### M6 — `BidActionSchema` sets `min: 7` but `isBidValid` allows bids as low as 2

**File:** `middlewares/validator.ts` vs `game/rules.ts`

```ts
// validator.ts
value: z.number().int().min(7).max(13),

// rules.ts
export function getMinIndividualBid(playerScore: number): number {
  if (playerScore >= 50) return 5;
  // ...
  return 2;
}
```

Zod rejects valid bids (2–6) that the game rules allow for lower scores. Players with high scores who need to bid above minimum 7 are fine, but the validator blocks all bids under 7 regardless of game state.

**Fix:** Remove the min-7 constraint from `BidActionSchema` (structural validation should not encode game rules) and rely solely on `isBidValid` in the reducer.

```ts
export const BidActionSchema = z.object({
  type: z.literal('BID'),
  playerId: z.string(),
  value: z.number().int().min(2).max(13), // structural bounds only
});
```

---

### M7 — `Room.removePlayer()` silently destroys an active game on any disconnect

**File:** `rooms/room.ts`

```ts
async removePlayer(id: PlayerID): Promise<boolean> {
  // ...
  if (this.gameEngine) {
    this.gameEngine = undefined; // Game destroyed immediately
  }
  // ...
}
```

If a player disconnects mid-game (network drop, browser refresh), the entire game is destroyed. `handleDisconnect` in `socketHandlers.ts` calls `markPlayerDisconnected` (which is correct), but `leave_room` calls `removePlayer` (which destroys the game). The two paths need to be clearly separated: voluntary leave vs involuntary disconnect.

**Fix:** Only `markPlayerDisconnected` on socket disconnect. Only `removePlayer` on explicit `leave_room`. Add a reconnection window with a timer that removes the player only if they haven't reconnected within N seconds.

---

### M8 — No input length validation on `playerName` at the socket handler level

**File:** `sockets/events/room.handler.ts`

```ts
const playerName = data?.playerName || `Player_${playerId.substring(0, 6)}`;
```

`playerName` from socket payload has no length or content validation before being stored in `room.players`. An attacker can send a 10MB string as `playerName` which gets stored in memory and Redis.

**Fix:** Validate socket payloads with Zod schemas, same as `validateSocketPayload` is used elsewhere:
```ts
const CreateRoomPayloadSchema = z.object({
  config: RoomConfigSchema,
  playerName: z.string().min(1).max(50).optional(),
});
const validated = validateSocketPayload(CreateRoomPayloadSchema, data);
```

---

### M9 — `logger.ts` `redactFormat` does not handle circular references

**File:** `lib/logger.ts`

`redactSensitive` iterates object entries recursively with a depth cap but `structuredClone` (used in reducer) can expose objects with prototype chains that `Object.entries` doesn't fully guard against. If a `GameState` object somehow reaches the logger (e.g., logged on error), `redactSensitive` could throw on circular structures.

**Fix:**
```ts
function redactSensitive(obj: unknown, depth = 0, seen = new WeakSet()): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj && typeof obj === 'object') {
    if (seen.has(obj as object)) return '[CIRCULAR]';
    seen.add(obj as object);
  }
  // ... rest of logic
}
```

---

### M10 — Health check `pingMongo()` and `redis.ping()` called concurrently on every health request with no caching

**File:** `monitoring/healthCheck.ts`

Under high traffic (Kubernetes probes every 5 seconds × multiple instances), every probe makes 2 round trips to MongoDB and Redis admin APIs. `db.admin().ping()` and `db.admin().serverInfo()` are non-trivial operations.

**Fix:** Cache health check results for 3–5 seconds:
```ts
let cachedHealth: FullHealthStatus | null = null;
let cacheExpiry = 0;

router.get('/health', async (_req, res) => {
  if (cachedHealth && Date.now() < cacheExpiry) {
    return res.status(cachedHealth.status === 'ok' ? 200 : 503).json(cachedHealth);
  }
  // ... perform checks
  cachedHealth = health;
  cacheExpiry = Date.now() + 5000;
  res.status(statusCode).json(health);
});
```

---

## LOW PRIORITY ISSUES

### L1 — `RoomManager.getRoom()` has a dead comment block (unfinished thought from development)

**File:** `rooms/roomManager.ts` lines 65–90 — 25 lines of commented-out reasoning about subscription reattachment. Remove before production.

---

### L2 — `scoring.ts` is empty

**File:** `game/scoring.ts` — empty file. Scoring logic lives in `rules.ts`. Delete the file or move scoring logic there for clarity.

---

### L3 — `socketSecurity.test.ts` imports from `vitest` but file has `.ts.conflict` sibling

**Files:** `sockets/socketSecurity.test.ts`, `sockets/socket.test.ts.conflict` — the `.conflict` file suggests a merge conflict was never resolved. Audit the git history and clean up.

---

### L4 — `env.ts` caches `validatedEnv` as module-level singleton, which breaks between test files that re-call `validateEnv()` with different env vars

**File:** `lib/env.ts`

```ts
let validatedEnv: Env | null = null;
export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv; // Returns stale cache
  // ...
}
```

Test files set different `process.env` values then call `validateEnv()`. The first call wins and all subsequent calls return the cached (possibly wrong) values. This is a subtle test isolation bug.

**Fix:** Export a `resetValidatedEnv()` for test use, or make `validateEnv(force = false)` accept a force parameter.

---

### L5 — `auth.middleware.ts` is defined but never registered in `index.ts` or socket setup

**File:** `middlewares/auth.middleware.ts` — `requireAuth` is exported but never imported/used anywhere. Dead code.

---

### L6 — `models/User.model.ts` double-exports with `mongoose.models.User ?? mongoose.model(...)` pattern, but `Game.model.ts` does not

```ts
// User.model.ts
export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>('User', UserSchema);
```

This pattern is for Next.js HMR environments, not needed in a pure Node.js server. `Game.model.ts` uses the direct pattern. Inconsistency will cause confusion. Standardize on `mongoose.model()` directly.

---

### L7 — Missing `index.ts` barrel exports for most directories

Only `models/index.ts` has barrel exports. `sockets/events/`, `middlewares/`, `services/` all have no barrel. This forces consumers to know internal file paths, making refactoring harder.

---

### L8 — `withTimingSync` in `monitoring/performance.ts` logs slow operations at >100ms but is called from the reducer which should never take 100ms

**File:** `game/engine.ts`

```ts
const { result: nextState } = withTimingSync(
  `reducer:${action.type}`,
  () => applyAction(this.state, action),
  { slowThresholdMs: 10, metricType: 'game_action' }
);
```

Good that threshold is overridden to 10ms, but the `DEFAULT_SLOW_THRESHOLD_MS = 100` in `performance.ts` would be misleading for reducer calls that don't override it.

---

## ARCHITECTURE OBSERVATIONS

### A1 — Mixed abstraction levels in socket handlers

`socketHandlers.ts` has `handleGameAction` which does room lookup + validation + dispatch + broadcast. `room.handler.ts` duplicates the same room-lookup + error-emit pattern. A `RoomActionContext` helper would centralize this:

```ts
async function withRoom(socket, roomManager, callback) {
  const roomId = socket.data.roomId;
  if (!roomId) { socket.emit('error', { code: 'NOT_IN_ROOM', ... }); return; }
  const room = await roomManager.getRoom(roomId);
  if (!room) { socket.emit('error', { code: 'ROOM_NOT_FOUND', ... }); return; }
  await callback(room, roomId);
}
```

### A2 — `GameEngine` has side effects (logging, metrics, persistence) that belong in the service layer

`engine.ts` imports `logger`, `metrics`, and `saveGame`. A game engine should be a pure state machine. Move all side effects to `socketHandlers.ts` or a `GameService` class that wraps the engine.

### A3 — Redis and MongoDB connection are not health-checked before accepting socket connections

On startup, `httpServer.listen()` happens before `connectMongo()` and `redis.connect()` complete checks. Socket.IO starts accepting connections immediately. If DB/Redis are slow to connect, the first few connections will encounter `undefined` room managers and uninitialized caches.

**Fix:** Start HTTP server only after all dependencies are healthy:
```ts
// bootstrap() — already correct structure, but ensure ordering:
await connectMongo();
await redis.connect();
httpServer.listen(PORT, ...); // Only after both are ready
```

---

## TESTING GAPS

### T1 — No tests for auth flows (register, login, JWT verification)
### T2 — No tests for `gameHistory.service.ts` with real DB (only mock tests)
### T3 — No tests for reconnection flow (`markPlayerReconnected`, re-join existing room)
### T4 — No tests for the debounce save behavior (1-second debounce could be tested with fake timers)
### T5 — `socketSecurity.test.ts` tests are Vitest-based and likely not running in CI
### T6 — No adversarial tests: spoofed `playerId`, oversized payloads, malformed JSON bodies
### T7 — Load test (`concurrent.test.ts`) does not verify Redis state after 100 rooms (only in-memory state)

---

---

# Structured TODO List

---

## 🔴 CRITICAL (Must Fix Before Any Production Deployment)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| C1 | Fix `UserModel` schema mismatch — create `PlayerStatsModel` with `socketId`, `username`, `wins` fields | `models/User.model.ts`, `services/gameHistory.service.ts` | M |
| C2 | Implement real JWT verification in socket auth middleware; throw on missing/default `JWT_SECRET`; never trust client-supplied `userId` | `sockets/socketMiddleware.ts`, `lib/env.ts` | M |
| C3 | Fix `roomCache.deserialize` — replace type cast with validated hydration; add `reattachPersistence()` to `Room`; call it in `roomManager.getRoom()` | `cache/roomCache.ts`, `rooms/room.ts`, `rooms/roomManager.ts` | M |
| C4 | Remove `process.exit(1)` from `mongoose.ts`; implement proper `SIGTERM`/`SIGINT` graceful shutdown in `index.ts` | `lib/mongoose.ts`, `index.ts` | S |
| C5 | Implement boot-time Redis hydration in `RoomManager.initialize()` and call it in `bootstrap()` | `rooms/roomManager.ts`, `index.ts` | M |
| C6 | Fix `preventHPP` logic — align implementation and tests on whether `filter` is whitelisted or not | `middlewares/sanitization.ts`, tests | S |

---

## 🟠 HIGH (Fix Before Launch, Security/Data Integrity)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| H1 | Replace `structuredClone` with targeted shallow clone in reducer for performance | `game/reducer.ts` | S |
| H2 | Replace `Date.now() + Math.random()` room ID with `crypto.randomUUID()` | `rooms/roomManager.ts` | XS |
| H3 | After fixing C2, ensure `socket.data.playerId` is always derived from verified JWT, not client input | All socket handlers | S |
| H4 | Add startup enforcement: `EXPOSE_STACK_TRACES=false` required in production | `lib/env.ts` | XS |
| H5 | Replace `getAllActiveRooms()` SCAN with Redis SET index for O(1) room listing | `cache/roomCache.ts`, `rooms/roomManager.ts` | M |
| H6 | Fix debounced save: use immediate save on `SCORING`/`GAME_OVER` phase transitions | `rooms/room.ts` | S |
| H7 | Remove `CORS_ORIGIN='*'` default; require explicit configuration; enforce in env schema | `lib/env.ts`, `index.ts` | XS |
| H8 | Migrate `socketSecurity.test.ts` from Vitest to `node:test` | `sockets/socketSecurity.test.ts` | S |

---

## 🟡 MEDIUM (Fix Within First Sprint Post-Launch)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| M1 | Fix `gamesWon` vs `wins` field name mismatch in User model and leaderboard query | `models/User.model.ts`, `services/gameHistory.service.ts` | XS |
| M2 | Add `MongoMemoryServer` to integration tests that exercise persistence paths | `__tests__/integration/` | M |
| M3 | Replace all `console.*` calls with `logger.*` across codebase | `lib/mongoose.ts`, `lib/redis.ts`, `rooms/room.ts`, `cache/roomCache.ts` | S |
| M4 | Remove `process.env.NODE_ENV !== 'test'` from `GameEngine`; use dependency injection for `onGameOver` callback | `game/engine.ts` | S |
| M5 | Fix rate limiter cleanup interval (5s not 60s) and ensure cleanup on socket disconnect | `sockets/socketMiddleware.ts` | XS |
| M6 | Fix `BidActionSchema` min value: allow 2–13 structurally, rely on `isBidValid` for game rules | `middlewares/validator.ts` | XS |
| M7 | Separate voluntary leave vs involuntary disconnect in Room; add reconnection window timer | `rooms/room.ts`, `sockets/socketHandlers.ts` | L |
| M8 | Add Zod payload validation to all socket handlers (`playerName`, `roomId`, `card`) | `sockets/events/room.handler.ts`, `bidding.handler.ts`, `playing.handler.ts` | S |
| M9 | Add `WeakSet` cycle detection to `redactSensitive` in logger | `lib/logger.ts` | XS |
| M10 | Cache health check results for 3–5 seconds to reduce DB/Redis probe load | `monitoring/healthCheck.ts` | XS |

---

## 🟢 LOW (Tech Debt, Cleanup, Nice-to-Have)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| L1 | Remove dead comment block from `roomManager.ts` | `rooms/roomManager.ts` | XS |
| L2 | Delete empty `game/scoring.ts` or populate it with scoring logic from `rules.ts` | `game/scoring.ts` | XS |
| L3 | Resolve/delete `.ts.conflict` file; audit git history | `sockets/socket.test.ts.conflict` | XS |
| L4 | Add `resetValidatedEnv()` to `lib/env.ts` for test isolation | `lib/env.ts` | XS |
| L5 | Remove or implement `auth.middleware.ts` — currently dead code | `middlewares/auth.middleware.ts` | XS |
| L6 | Standardize `mongoose.model()` pattern — remove HMR-style pattern from `User.model.ts` | `models/User.model.ts` | XS |
| L7 | Add barrel `index.ts` files to `middlewares/`, `sockets/events/`, `services/` | All | S |
| L8 | Extract `withRoom()` helper to eliminate duplicated room-lookup boilerplate in handlers | `sockets/events/*.ts` | S |
| L9 | Move side effects (logging, metrics, persistence) out of `GameEngine` into service layer | `game/engine.ts` | L |
| L10 | Add `GameEngine.fromState()` static factory method replacing type-cast state injection | `game/engine.ts`, `cache/roomCache.ts` | S |

---

## 📋 Testing Tasks

| # | Task | Priority |
|---|------|----------|
| T1 | Write integration tests for `auth.service.ts` register/login flows with `MongoMemoryServer` | High |
| T2 | Write integration tests for `gameHistory.service.ts` with real DB models | High |
| T3 | Write tests for reconnection flow (disconnect → rejoin → state restored) | High |
| T4 | Write adversarial tests: oversized payloads, spoofed `playerId`, malformed JSON | High |
| T5 | Write tests for debounce save using fake timers (`clock.tick`) | Medium |
| T6 | Write tests for boot-time Redis hydration (after C5 fix) | Medium |
| T7 | Extend load test to verify Redis state is consistent with in-memory state after 100 rooms | Medium |

---

## Size Legend
- **XS** — < 1 hour
- **S** — 1–4 hours  
- **M** — 4–8 hours (half day)
- **L** — 1–2 days

---

## Deployment Checklist (All Must Pass)

- [ ] C1–C6 all resolved and tested
- [ ] H1–H8 all resolved
- [ ] `JWT_SECRET` set to 64+ char random value in secrets manager
- [ ] `CORS_ORIGIN` set to exact frontend domain (no wildcards)
- [ ] `EXPOSE_STACK_TRACES=false` verified in production config
- [ ] `LOG_ERRORS=true` verified in production config
- [ ] `NODE_ENV=production` verified
- [ ] Redis TTLs validated against expected game session lengths
- [ ] MongoDB indexes created (roomId, playerIds) — auto-index is disabled in production
- [ ] Graceful shutdown tested under load (SIGTERM during active games)
- [ ] Health check endpoints verified by Kubernetes readiness probe
- [ ] Rate limiter values load-tested and confirmed appropriate
- [ ] All test suites (node:test) passing with 0 skips
