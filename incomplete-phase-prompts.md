# Implementation Prompts — Incomplete Phases
> Tarneeb Backend · Production Readiness Remediation
> Generated from audit of BACKEND_TODO.md against current codebase

Each prompt is self-contained. Paste it directly into a coding assistant with the relevant files attached.

---

## BLOCKER FIXES (Must complete before any deployment)

---

### PROMPT C2-FIX — Fix socket.test.ts regression caused by JWT enforcement

**Context:**  
`sockets/socketMiddleware.ts` now enforces real JWT verification via `authMiddleware`, which is registered on `io.use(authMiddleware)` in `sockets/socketServer.ts`. Every socket connection must supply a valid JWT in `socket.handshake.auth.token`. However, `sockets/socket.test.ts` creates all clients without any auth token, so every connection is immediately rejected with `AUTH_REQUIRED`. All socket integration tests are broken.

**Files to attach:**
- `Backend/src/sockets/socket.test.ts`
- `Backend/src/sockets/socketServer.ts`
- `Backend/src/sockets/socketMiddleware.ts`
- `Backend/src/lib/env.ts`
- `Backend/src/types/auth.types.ts`

**Task:**  
Update `sockets/socket.test.ts` so every client socket is created with a valid signed JWT. The test file must:

1. Import `jsonwebtoken` and sign a test token using the same `JWT_SECRET` that `authMiddleware` reads from `getEnv()`. Since `env.ts` requires `JWT_SECRET` to be at least 32 characters and not a known weak default, set `process.env.JWT_SECRET` in a `before()` hook before calling `validateEnv()`.

2. Create a helper function `createClient(userId?: string): ClientSocket` that signs a JWT with `{ userId: userId ?? 'test-user-' + randomUUID(), email: 'test@test.com' }` and passes it in `auth: { token }` to `ioClient(...)`. Replace every direct `ioClient(...)` call in the file with this helper.

3. In `createFullRoom()`, ensure each of the four clients uses a **distinct** `userId` so `socket.data.userId` is unique per socket. This is critical: the game engine assigns players by their `userId`-derived `playerId`, and duplicate IDs would corrupt the room state.

4. Do not change any test assertions — only the socket creation mechanism changes. All existing `waitForEvent`, `assert`, and emit patterns stay identical.

5. Add a `before()` hook at the top of the outer `describe` block that sets:
```ts
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-minimum-32-chars-required!!';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CORS_ORIGIN = 'http://localhost:3000';
```
Then call `validateEnv()` from `lib/env.ts` inside that hook so the singleton is populated before socket server initialization.

**Expected outcome:** All tests in `socket.test.ts` pass. No changes to game logic or middleware.

---

### PROMPT M6 — Fix BidActionSchema minimum to allow bids 2–13

**Context:**  
`middlewares/validator.ts` defines `BidActionSchema` with `value: z.number().int().min(7).max(13)`. The `applyAction` reducer in `game/reducer.ts` validates every incoming action through `GameActionSchema.safeParse(action)` before processing it. `game/rules.ts#getMinIndividualBid` returns 2, 3, or 4 for players with scores below 50. In any game where a player needs to bid below 7, the Zod layer silently rejects the action and returns the unchanged state — the game freezes at the bidding phase. The test file `socket.test.ts` contains the comment `// FIX: value:2 is rejected by BidActionSchema (min:7). Use value:7.` confirming the bug is known.

**Files to attach:**
- `Backend/src/middlewares/validator.ts`
- `Backend/src/game/rules.ts`
- `Backend/src/middlewares/tests/validator.test.ts`

**Task:**

1. In `middlewares/validator.ts`, change **both** of the following:
```ts
// BidActionSchema
value: z.number().int().min(7).max(13)
// → change to:
value: z.number().int().min(2).max(13)

// PlaceBidSchema (used in socket event validation)
value: z.number().int().min(7).max(13)
// → change to:
value: z.number().int().min(2).max(13)
```

2. Add a comment above each changed field:
```ts
// Structural bounds only — game rule enforcement (min per player score) is done by isBidValid() in rules.ts
```

3. In `middlewares/tests/validator.test.ts`, update the existing test `'should reject invalid BID value'` so it tests a value that is structurally invalid (e.g., 0 or 14) rather than 15. Add a new test:
```ts
it('should accept BID value of 2 (valid for low-score players)', () => {
    const result = GameActionSchema.safeParse({ type: 'BID', playerId: 'p1', value: 2 });
    assert.equal(result.success, true);
});
it('should reject BID value of 1 (below structural minimum)', () => {
    const result = GameActionSchema.safeParse({ type: 'BID', playerId: 'p1', value: 1 });
    assert.equal(result.success, false);
});
```

4. Do not add game-rule enforcement (score thresholds) into the Zod schema. That logic belongs exclusively in `isBidValid()`.

**Expected outcome:** Players with scores ≥ 30 who must bid ≥ 3 can do so. The game is no longer stuck in the bidding phase in late rounds.

---

## CRITICAL (Required before production)

---

### PROMPT C3 — Implement validated roomCache.deserialize with GameEngine.fromState()

**Context:**  
`cache/roomCache.ts` was identified as having a critical defect: `deserialize()` uses a type-cast `(room.gameEngine as unknown as { state: unknown }).state = data.gameState` that bypasses all TypeScript safety and produces silently corrupt engines after any `GameState` schema change. The fix utilities now exist: `GameEngine.fromState()` in `game/engine.ts` performs runtime validation and throws on invalid state. `Room.reattachPersistence()` in `rooms/room.ts` reattaches the save callback. Neither is wired into `roomCache.ts` yet.

**Files to attach:**
- `Backend/src/cache/roomCache.ts` ← primary file to modify
- `Backend/src/game/engine.ts` — for `GameEngine.fromState()` signature
- `Backend/src/rooms/room.ts` — for `Room` class and `reattachPersistence()`
- `Backend/src/lib/logger.ts` — for structured logging pattern

**Task:**

1. In `roomCache.ts#deserialize`, replace the type-cast state injection with a call to `GameEngine.fromState()`:
```ts
// BEFORE (remove this):
room.gameEngine = new GameEngine(playerIds, data.id);
(room.gameEngine as unknown as { state: unknown }).state = data.gameState;

// AFTER (use this):
const playerIds = data.players.map((p: any) => p.id);
room.gameEngine = GameEngine.fromState(data.gameState, playerIds, data.id);
```

2. Wrap the entire `deserialize` try-catch so it uses `logger.error` instead of `console.error`:
```ts
} catch (error) {
    logger.error('Failed to deserialize room from cache', { roomId: data?.id, error });
    return null;
}
```

3. Ensure `roomCache.ts` imports `logger` from `../lib/logger.js`. Remove any `console.error` / `console.log` / `console.warn` calls.

4. Verify that `getAllActiveRooms()` returns properly instantiated `Room` class instances (not plain objects). The deserialized rooms must have `reattachPersistence` available as a method — plain objects from `JSON.parse` will not. If `getAllActiveRooms` currently deserializes via `JSON.parse` without calling the `Room` constructor, fix it to call `deserialize()` for each entry.

5. Add a Redis SET maintenance pattern for O(1) room ID listing:
   - On `cacheRoom(room)`: call `SADD active_rooms {room.id}` in the same pipeline/transaction.
   - On `deleteRoom(id)`: call `SREM active_rooms {id}`.
   - Rewrite `getAllActiveRooms()` to: `SMEMBERS active_rooms` → batch `GET` each key → `deserialize` each result. Remove the full key-space `SCAN` call.

**Expected outcome:** Rooms hydrated from Redis use validated `GameState` objects. A corrupted cache entry logs an error and returns `null` rather than producing a broken engine. Room listing is O(1).

---

## HIGH PRIORITY

---

### PROMPT H5 — Replace Redis SCAN with SET index in roomCache

*(Covered in PROMPT C3 step 5 above. If implementing C3 separately from H5, use this standalone prompt.)*

**Context:**  
`roomCache.ts#getAllActiveRooms()` performs a full Redis key-space `SCAN` followed by a batch `MGET` on every call. `RoomManager` calls `listRooms()` → `getAllActiveRooms()` from five different methods: `findAvailableRoom`, `getWaitingRooms`, `getActiveGameRooms`, `getRoomCount`, `removeEmptyRooms`. At 1000 rooms this is 10+ Redis round trips per player join attempt.

**Files to attach:**
- `Backend/src/cache/roomCache.ts`

**Task:**

1. Add two new Redis operations to maintain a SET of active room IDs:
```ts
// In cacheRoom(room): after SET room:{id}
await client.sAdd('active_rooms', room.id);

// In deleteRoom(id): after DEL room:{id}
await client.sRem('active_rooms', id);
```

2. Rewrite `getAllActiveRooms()`:
```ts
async getAllActiveRooms(): Promise<Room[]> {
    const client = redis.getClient();
    if (!client) return [];
    try {
        const ids = await client.sMembers('active_rooms');
        if (ids.length === 0) return [];
        const keys = ids.map(id => `room:${id}`);
        const values = await client.mGet(keys);
        const rooms: Room[] = [];
        for (const json of values) {
            if (!json) continue;
            const room = this.deserialize(json);
            if (room) rooms.push(room);
        }
        return rooms;
    } catch (error) {
        logger.error('Failed to list rooms from Redis', { error });
        return [];
    }
}
```

3. On startup hydration, if `active_rooms` SET is empty but individual `room:*` keys exist (legacy state from before this change), add a migration step in `getAllActiveRooms` that falls back to a one-time SCAN and repopulates the SET. Log a warning when this path is taken.

**Expected outcome:** `listRooms()` makes 2 Redis calls (SMEMBERS + MGET) regardless of total room count.

---

### PROMPT H8 — Migrate socketSecurity.test.ts from Vitest to node:test

**Context:**  
`sockets/socketSecurity.test.ts` imports from `vitest` (`describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`). The project test runner is `node:test`. This file does not execute in CI. The tests cover `toSocketError` formatting and rate limiter existence checks.

**Files to attach:**
- `Backend/src/sockets/socketSecurity.test.ts`
- `Backend/src/sockets/socketErrors.ts`
- `Backend/src/utils/errors.ts`
- `Backend/src/middlewares/rateLimiter.ts`

**Task:**  
Rewrite `socketSecurity.test.ts` completely using `node:test` and `node:assert/strict`. Follow the exact same patterns used in `game/tests/reducer.test.ts` and `middlewares/tests/sanitization.test.ts`.

Rules:
1. Replace all `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'` with `import { describe, it, beforeEach, afterEach, mock } from 'node:test'` and `import assert from 'node:assert/strict'`.
2. Replace `vi.fn()` with `mock.fn()`. Replace `vi.clearAllMocks()` with `mock.restoreAll()`.
3. Replace all `expect(x).toBe(y)` → `assert.equal(x, y)`. Replace `expect(x).toBeDefined()` → `assert.ok(x)`. Replace `expect(x).toEqual(y)` → `assert.deepEqual(x, y)`.
4. The `mockSocket` object: since `authMiddleware` now rejects connections without a JWT, mock the socket directly using a plain object — do not try to create a real socket connection in this file.
5. Keep all existing test cases. Add one new adversarial test:
```ts
it('should format unknown thrown value (non-Error) correctly', () => {
    const formatted = toSocketError({ weird: 'object' });
    assert.equal(formatted.code, 'UNKNOWN_ERROR');
    assert.ok(formatted.timestamp);
});
```
6. Delete the `.ts.conflict` sibling file `sockets/socket.test.ts.conflict` (it contains only `// This file was not moved...`).

**Expected outcome:** `socketSecurity.test.ts` runs under `node:test` and appears in CI output. All tests pass.

---

## MEDIUM PRIORITY

---

### PROMPT M3 — Replace all console.* calls with structured logger

**Context:**  
Three files bypass the structured Winston logger entirely: `lib/mongoose.ts`, `lib/redis.ts`, and `sockets/socketServer.ts`. In production, `console.*` output goes to stdout unformatted, bypassing log-level control, Prometheus integration, and any log aggregator (Datadog, ELK). It also bypasses the `redactSensitive` format, potentially leaking connection strings in error messages.

**Files to attach:**
- `Backend/src/lib/mongoose.ts`
- `Backend/src/lib/redis.ts`
- `Backend/src/sockets/socketServer.ts`
- `Backend/src/lib/logger.ts`

**Task:**

**In `lib/mongoose.ts`**, add `import { logger } from './logger.js'` and replace every `console.*` call:
```ts
// console.error('MongoDB connection error:', err)  →
logger.error('MongoDB connection error', { error: err });

// console.warn('MongoDB disconnected')  →
logger.warn('MongoDB disconnected');

// console.log('MongoDB reconnected')  →
logger.info('MongoDB reconnected');

// console.error(`MongoDB connection attempt ${connectionAttempts}/...`)  →
logger.error('MongoDB connection attempt failed', { attempt: connectionAttempts, max: MAX_RETRY_ATTEMPTS, error });

// console.log(`Retrying MongoDB connection in ${delay}ms...`)  →
logger.info('Retrying MongoDB connection', { delayMs: delay, attempt: connectionAttempts });

// console.log(`MongoDB connected: ${conn.connection.host}`)  →
logger.info('MongoDB connected', { host: conn.connection.host });

// console.log('MongoDB disconnected')  in disconnectMongo →
logger.info('MongoDB disconnected gracefully');
```

**In `lib/redis.ts`**, add `import { logger } from './logger.js'` and replace all `console.*` in `setupClientListeners` and `handleFailure`:
```ts
// console.log(`${name} Redis client connected`)  →
logger.info('Redis client connected', { client: name });

// console.log(`${name} Redis client ready`)  →
logger.info('Redis client ready', { client: name });

// console.error(`${name} Redis client error:`, err)  →
logger.error('Redis client error', { client: name, error: err });

// console.log(`${name} Redis client reconnecting...`)  →
logger.info('Redis client reconnecting', { client: name });

// console.warn('Redis circuit breaker OPEN...')  →
logger.warn('Redis circuit breaker opened', { failureCount });

// console.log('Redis circuit breaker RESET...')  →
logger.info('Redis circuit breaker reset');

// console.warn('Failed to fetch Redis detailed stats:', e)  →
logger.warn('Failed to fetch Redis stats', { error: e });

// console.log('Redis disconnected')  →
logger.info('Redis disconnected gracefully');
```

**In `sockets/socketServer.ts`**, replace all four `console.*` calls with `logger.*`:
```ts
// console.log(`[Socket] Client connected: ${socket.id}`)  →
logger.info('Socket client connected', { socketId: socket.id, ip: socket.handshake.address });

// console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`)  →
logger.info('Socket client disconnected', { socketId: socket.id, reason });

// console.log(`[Socket] ${socket.id} left room ${room} on disconnect`)  →
logger.debug('Socket left room on disconnect', { socketId: socket.id, roomId: room });

// console.log('[Socket] Socket.IO server initialized')  →
logger.info('Socket.IO server initialized');

// console.error(`[Socket] Error from ${socket.id}:`, error)  →
logger.error('Socket error received', { socketId: socket.id, error });
```

**Expected outcome:** `grep -r "console\." src/ --include="*.ts"` returns zero results. All connection lifecycle events appear in structured log output.

---

### PROMPT M4 — Remove NODE_ENV guard from GameEngine; inject persistence callback

**Context:**  
`game/engine.ts` contains `if (this.isGameOver() && !this.hasPersisted && process.env.NODE_ENV !== 'test')`. This is a layering violation: domain logic (the game engine) should not know about deployment environments. It also makes game persistence impossible to integration-test without hacking `NODE_ENV`. The engine also directly imports `saveGame` from `services/gameHistory.service.ts` — a domain object importing from a persistence layer.

**Files to attach:**
- `Backend/src/game/engine.ts`
- `Backend/src/sockets/events/room.handler.ts`
- `Backend/src/rooms/room.ts`
- `Backend/src/services/gameHistory.service.ts`
- `Backend/src/game/tests/engine.test.ts`

**Task:**

1. Add an optional `onGameOver` callback to `GameEngine`'s constructor:
```ts
constructor(
    playerIds: string[],
    roomId?: string,
    private readonly onGameOver?: (
        state: GameState,
        winner: 1 | 2,
        startedAt: Date,
        rounds: RoundSnapshot[]
    ) => Promise<void>
) {
    this.state = createInitialGameState(playerIds);
    this.roomId = roomId ?? 'unknown';
    this.startedAt = new Date();
}
```

2. In `dispatch()`, replace the `NODE_ENV` guard with an `onGameOver` callback invocation:
```ts
// BEFORE:
if (this.isGameOver() && !this.hasPersisted && process.env.NODE_ENV !== 'test') {
    this.persistGame();
}

// AFTER:
if (this.isGameOver() && !this.hasPersisted && this.onGameOver) {
    this.hasPersisted = true;
    this.onGameOver(this.state, this.getWinner()!, this.startedAt, this.rounds)
        .catch(err => logger.error('Failed to persist game via callback', { roomId: this.roomId, error: err }));
}
```

3. Remove the private `persistGame()` method entirely. Remove the `import { saveGame }` line from `engine.ts`. Remove `import { metrics } from '../lib/metrics.js'` if `metrics.gameCompleted()` was only called inside `persistGame()` — move that call into the callback in `room.ts`.

4. Update `GameEngine.fromState()` to accept the optional `onGameOver` parameter and pass it through.

5. In `rooms/room.ts#startGame()`, wire the callback when creating the engine:
```ts
import { saveGame } from '../services/gameHistory.service.js';
import { metrics } from '../lib/metrics.js';

this.gameEngine = new GameEngine(
    playerIds,
    this.id,
    async (state, winner, startedAt, rounds) => {
        await saveGame(this.id, state, winner, startedAt, rounds);
        metrics.gameCompleted(winner);
    }
);
```

6. In `game/tests/engine.test.ts`, add a test that verifies the callback fires:
```ts
it('should invoke onGameOver callback when game ends', async () => {
    let callbackFired = false;
    const engine = new GameEngine(
        MOCK_PLAYERS,
        'test-room',
        async () => { callbackFired = true; }
    );
    const state = (engine as any).state;
    state.teams[1].score = 41;
    engine.dispatch({ type: 'END_ROUND' }); // triggers isGameOver check
    // allow microtask to run
    await new Promise(r => setImmediate(r));
    assert.equal(callbackFired, true);
});
```

**Expected outcome:** `engine.ts` has zero imports from `services/` and zero `process.env` references. Persistence is testable by passing a mock callback.

---

### PROMPT M5 — Fix rate limiter cleanup interval and memory leak

**Context:**  
`sockets/socketMiddleware.ts` runs a `setInterval` every 60,000ms to clean up expired rate-limit entries, but entries expire after 1,000ms. With 400 concurrent sockets each emitting 10 events/second, up to 4,000 stale entries accumulate between cleanup runs. Additionally, `cleanupSocketData` only deletes the Map entry for a disconnected socket — it does not reduce pressure during the 60-second window.

**Files to attach:**
- `Backend/src/sockets/socketMiddleware.ts`

**Task:**

1. Reduce the cleanup interval constant:
```ts
const RATE_LIMIT_CLEANUP_INTERVAL = 5000; // was 60000
```

2. In `cleanupSocketData(socketId)`, confirm the existing `rateLimitMap.delete(socketId)` call is present — if not, add it. This ensures disconnected sockets are cleaned up immediately rather than waiting for the interval.

3. Add a check in `rateLimitMiddleware` that cleans up the calling socket's own expired entry inline before creating a new one (already partly done by the `if (!limitData || now > limitData.resetTime)` reset check — verify this resets rather than accumulates).

4. Export a `getRateLimitMapSize(): number` function for testing purposes:
```ts
export function getRateLimitMapSize(): number {
    return rateLimitMap.size;
}
```

5. The `setInterval` reference should be stored and exported so it can be cleared in tests:
```ts
export const rateLimitCleanupTimer = setInterval(() => { ... }, RATE_LIMIT_CLEANUP_INTERVAL);
```
Add `rateLimitCleanupTimer.unref()` so Node.js does not keep the process alive for this timer alone.

**Expected outcome:** Under 400 concurrent sockets, the Map holds at most ~2,000 entries (5s window × 400 sockets) rather than 24,000. Test teardown can `clearInterval(rateLimitCleanupTimer)`.

---

### PROMPT M7 — Implement reconnection window timer

**Context:**  
`rooms/room.ts#removePlayer()` destroys the game engine immediately. The disconnect handler in `sockets/socketHandlers.ts` correctly calls `markPlayerDisconnected()` instead of `removePlayer()`, so an involuntary disconnect does not destroy the game. However, there is no timer: a disconnected player permanently occupies a slot. A 3-player room where one player drops can never accept a replacement, and the disconnected player cannot detect they have been evicted.

**Files to attach:**
- `Backend/src/rooms/room.ts`
- `Backend/src/sockets/socketHandlers.ts`

**Task:**

1. Add a reconnection timeout constant and a per-player timer Map to `Room`:
```ts
private readonly RECONNECT_TIMEOUT_MS = 30_000; // 30 seconds
private reconnectTimers: Map<PlayerID, NodeJS.Timeout> = new Map();
```

2. In `markPlayerDisconnected()`, start a timer that calls `removePlayer()` after the timeout:
```ts
async markPlayerDisconnected(id: PlayerID): Promise<boolean> {
    const player = this.players.get(id);
    if (!player) return false;
    player.isConnected = false;

    const timer = setTimeout(async () => {
        this.reconnectTimers.delete(id);
        await this.removePlayer(id);
        logger.info('Player removed after reconnect timeout', { roomId: this.id, playerId: id });
    }, this.RECONNECT_TIMEOUT_MS);

    this.reconnectTimers.set(id, timer);
    await this.saveState(true);
    return true;
}
```

3. In `markPlayerReconnected()`, cancel the pending timer:
```ts
async markPlayerReconnected(id: PlayerID): Promise<boolean> {
    const player = this.players.get(id);
    if (!player) return false;
    player.isConnected = true;

    const timer = this.reconnectTimers.get(id);
    if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(id);
    }

    await this.saveState(true);
    return true;
}
```

4. In `removePlayer()`, also cancel any pending reconnect timer for that player to avoid a timer firing after explicit removal:
```ts
const timer = this.reconnectTimers.get(id);
if (timer) { clearTimeout(timer); this.reconnectTimers.delete(id); }
```

5. In `sockets/socketHandlers.ts#handleDisconnect`, after `markPlayerDisconnected`, emit `player_disconnected` with a `reconnectWindowMs` field so clients can display a countdown:
```ts
io.to(roomId).emit('player_disconnected', {
    playerId,
    reconnectWindowMs: 30_000,
    room: serializeRoom(room),
});
```

**Expected outcome:** A player who disconnects has 30 seconds to reconnect before their slot is freed. A player who explicitly leaves via `leave_room` is removed immediately with no timer.

---

### PROMPT M8 — Add Zod payload validation to all socket handlers

**Context:**  
`sockets/events/room.handler.ts` reads `data?.playerName` directly without length or content validation. An attacker can send a 10MB string as `playerName`, which is stored in the players Map and serialized to Redis. `CreateRoomSchema` and `JoinRoomSchema` already exist in `middlewares/validator.ts` with `playerName: z.string().min(1).max(50).optional()` but are never imported into the socket handlers.

**Files to attach:**
- `Backend/src/sockets/events/room.handler.ts`
- `Backend/src/middlewares/validator.ts`
- `Backend/src/sockets/events/bidding.handler.ts`
- `Backend/src/sockets/events/playing.handler.ts`

**Task:**

1. In `room.handler.ts`, import `CreateRoomSchema`, `JoinRoomSchema`, and `validateSocketPayload` from `../../middlewares/validator.js`.

2. In `handleCreateRoom`, validate the payload at the top before touching `roomManager`:
```ts
let validated: z.infer<typeof CreateRoomSchema>;
try {
    validated = validateSocketPayload(CreateRoomSchema, data);
} catch {
    socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid create_room payload' });
    return;
}
const { config, playerName } = validated;
```

3. In `handleJoinRoom`, validate similarly with `JoinRoomSchema`.

4. In `bidding.handler.ts#handlePlaceBid`, replace the manual `typeof value !== 'number'` check with `PlaceBidSchema` validation via `validateSocketPayload`.

5. In `bidding.handler.ts#handleSetTrump`, validate the suit with `SetTrumpSchema`.

6. In `playing.handler.ts#handlePlayCard`, validate the card with `PlayCardSchema`.

7. Add a `z.string().max(36)` constraint to `roomId` in `JoinRoomSchema` to prevent oversized room IDs from hitting Redis.

**Expected outcome:** All socket event payloads are validated via Zod before reaching business logic. Oversized or malformed inputs are rejected with `INVALID_PAYLOAD` before any DB or memory operations.

---

### PROMPT M9 — Add WeakSet cycle detection to logger's redactSensitive

**Context:**  
`lib/logger.ts#redactSensitive` recurses into objects up to depth 10 but has no circular reference detection. If an object with circular references (e.g., a `GameState` that has been augmented with back-references, or a Mongoose document) reaches the logger, the function will recurse until the depth cap and return `'[MAX_DEPTH]'` for every node — hiding all log data — or in edge cases with prototype-chain objects, may throw. A `WeakSet` tracking visited objects is the standard fix.

**Files to attach:**
- `Backend/src/lib/logger.ts`
- `Backend/src/lib/logger.test.ts`

**Task:**

1. Add a `seen` parameter to `redactSensitive`:
```ts
function redactSensitive(obj: unknown, depth = 0, seen = new WeakSet()): unknown {
    if (depth > 10) return '[MAX_DEPTH]';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;

    if (typeof obj === 'object') {
        if (seen.has(obj as object)) return '[CIRCULAR]';
        seen.add(obj as object);
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => redactSensitive(item, depth + 1, seen));
    }

    if (typeof obj === 'object') {
        const redacted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as object)) {
            if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
                redacted[key] = '[REDACTED]';
            } else {
                redacted[key] = redactSensitive(value, depth + 1, seen);
            }
        }
        return redacted;
    }

    return obj;
}
```

2. Update all internal calls to pass `seen` through: `redactSensitive(item, depth + 1, seen)` in the array branch and `redactSensitive(value, depth + 1, seen)` in the object branch.

3. In `logger.test.ts`, add a test:
```ts
it('should handle circular references without crashing', () => {
    const circular: any = { name: 'test' };
    circular.self = circular; // circular reference
    // Should not throw
    assert.doesNotThrow(() => {
        logger.info('Circular test', circular);
    });
});
```

**Expected outcome:** The logger never throws on circular structures. Circular references appear as `'[CIRCULAR]'` in log output.

---

### PROMPT M10 — Cache health check results to reduce DB probe load

**Context:**  
`monitoring/healthCheck.ts` calls `pingMongo()`, `redis.ping()`, `getMongoStats()`, and `redis.getStats()` on every `/health` request. Under Kubernetes with 5-second probe intervals across 3 replicas, this is 36 admin-level DB/Redis operations per minute at baseline. `getMongoStats()` calls `db.admin().serverInfo()` and `db.admin().serverStatus()` — non-trivial operations.

**Files to attach:**
- `Backend/src/monitoring/healthCheck.ts`

**Task:**

1. Add a module-level cache above the router definition:
```ts
interface CachedHealth {
    data: FullHealthStatus;
    expiresAt: number;
}
let healthCache: CachedHealth | null = null;
const HEALTH_CACHE_TTL_MS = 5000; // 5 seconds
```

2. Wrap the `/health` handler body:
```ts
router.get('/health', async (_req, res) => {
    const now = Date.now();
    if (healthCache && now < healthCache.expiresAt) {
        const statusCode = healthCache.data.status === 'ok' ? 200 : 503;
        return res.status(statusCode).json(healthCache.data);
    }

    const [mongoOk, redisOk, mongoStats, redisStats] = await Promise.all([...]);
    const health: FullHealthStatus = { ... };

    healthCache = { data: health, expiresAt: now + HEALTH_CACHE_TTL_MS };
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});
```

3. The `/health/ready` probe (used by Kubernetes for traffic routing) should **not** be cached — it must reflect real-time dependency status. Only cache `/health`.

4. The `/health/live` probe is already instant (no DB calls) and needs no change.

5. Export `clearHealthCache(): void` for test use:
```ts
export function clearHealthCache(): void { healthCache = null; }
```

6. In `healthCheck.test.ts`, add a test verifying the cache returns a stale response within the TTL window rather than making a second DB call.

**Expected outcome:** Under 5-second Kubernetes probes × 3 replicas, the `/health` endpoint makes at most 1 full DB probe per 5-second window per instance, not 1 per probe.

---

## LOW PRIORITY

---

### PROMPT L2+L3 — Delete empty scoring.ts and resolve .conflict file

**Context:**  
`game/scoring.ts` is completely empty (0 bytes). Scoring logic lives in `game/rules.ts`. The empty file creates false navigation paths. `sockets/socket.test.ts.conflict` contains only `// This file was not moved because a file with the same name already exists in the target location.` — it is a git merge artifact.

**Task:**  
Delete both files:
```bash
rm Backend/src/game/scoring.ts
rm Backend/src/sockets/socket.test.ts.conflict
```
Verify no file imports from `./scoring.js`. If any import exists, redirect it to `./rules.js`.

**Expected outcome:** `find . -name "scoring.ts" -o -name "*.conflict"` returns no results.

---

### PROMPT L4 — Add resetValidatedEnv() for test isolation

**Context:**  
`lib/env.ts` caches the validated environment in `let validatedEnv: Env | null = null`. The first call to `validateEnv()` in a test process wins for the entire process lifetime. Tests that set different `process.env` values before importing modules that call `validateEnv()` silently receive stale configuration.

**Files to attach:**
- `Backend/src/lib/env.ts`

**Task:**  
Add a single exported function after the `getEnv` function:
```ts
/**
 * Reset the validated environment cache.
 * FOR TEST USE ONLY — do not call in production code.
 */
export function resetValidatedEnv(): void {
    validatedEnv = null;
}
```

In any test file that calls `validateEnv()` inside a `beforeEach` or `before`, add a corresponding `afterEach`/`after` that calls `resetValidatedEnv()` to prevent cross-test pollution.

**Expected outcome:** Test files can independently configure `process.env` and call `validateEnv()` without inheriting state from other test files.

---

### PROMPT L5 — Remove dead auth.middleware.ts

**Context:**  
`middlewares/auth.middleware.ts` is exported but never imported anywhere in the codebase. It contains a dangerous fallback: `const JWT_SECRET = process.env.JWT_SECRET ?? 'change_me_in_production'`. Socket auth is handled by `sockets/socketMiddleware.ts#authMiddleware`. HTTP route auth, if ever needed, should use the same pattern with `getEnv().JWT_SECRET`.

**Task:**  
1. Confirm with `grep -r "auth.middleware" src/ --include="*.ts"` that the file is never imported.
2. Delete `Backend/src/middlewares/auth.middleware.ts`.
3. If HTTP route authentication is planned, create a new `middlewares/httpAuth.middleware.ts` that imports `JWT_SECRET` from `getEnv()` — never from `process.env` directly, never with a fallback default.

**Expected outcome:** `grep -r "change_me_in_production" src/` returns zero results.

---

### PROMPT L6 — Standardize mongoose.model() pattern across all models

**Context:**  
`User.model.ts` and `PlayerStats.model.ts` use the Next.js HMR-guard pattern:
```ts
(mongoose.models.User as Model<IUser> | undefined) ?? mongoose.model<IUser>('User', UserSchema)
```
This pattern exists to prevent "Cannot overwrite model once compiled" errors during Next.js hot module replacement. This is a pure Node.js Express server — HMR does not apply. `Game.model.ts` correctly uses `mongoose.model<IGame>('Game', GameSchema)` directly. The inconsistency causes confusion and adds dead branches.

**Files to attach:**
- `Backend/src/models/User.model.ts`
- `Backend/src/models/PlayerStats.model.ts`
- `Backend/src/models/Game.model.ts`

**Task:**  
In both `User.model.ts` and `PlayerStats.model.ts`, replace the HMR-guard export with a direct model call matching `Game.model.ts`:
```ts
// User.model.ts — BEFORE:
export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>('User', UserSchema);

// AFTER:
export const UserModel = mongoose.model<IUser>('User', UserSchema);
```
Apply the same change to `PlayerStats.model.ts`.

**Note:** If tests import these models in a way that causes "model already registered" errors (because tests re-import modules in the same process), the correct fix is to use `MongoMemoryServer` and reconnect between test suites — not to restore the HMR guard.

**Expected outcome:** All three model files use the same export pattern. `mongoose.models` is not referenced anywhere in `src/`.

---

### PROMPT L7 — Complete barrel index.ts exports

**Context:**  
`sockets/events/index.ts` was added but `middlewares/` and `services/` lack barrel files. Internal consumers import by full file path, making refactoring harder and creating implicit coupling to directory structure.

**Task:**  
Create the following two files:

**`Backend/src/middlewares/index.ts`:**
```ts
export { globalLimiter, roomCreationLimiter, authenticatedLimiter, socketConnectionLimiter } from './rateLimiter.js';
export { sanitizeMongoQueries, sanitizeXSS, preventHPP, securityHeaders } from './sanitization.js';
export { validate, validateSocketPayload, RoomConfigSchema, GameActionSchema, BidActionSchema, PlayCardActionSchema, sanitizeString, sanitizeObject } from './validator.js';
export { errorHandler, notFoundHandler, handleUncaughtException, handleUnhandledRejection } from './errorHandler.js';
```

**`Backend/src/services/index.ts`:**
```ts
export { saveGame, getGameHistory, getLeaderboard, getUserStats } from './gameHistory.service.js';
export { authService } from './auth.service.js';
```

Do not change any existing imports in other files — barrel exports are additive. Existing direct imports remain valid.

**Expected outcome:** Consumers can optionally import from `'../middlewares/index.js'` or `'../services/index.js'` as a single entry point.

---

### PROMPT L8 — Extract withRoom() helper to eliminate handler boilerplate

**Context:**  
Every socket event handler in `sockets/events/room.handler.ts`, `bidding.handler.ts`, and `playing.handler.ts` repeats the same 8–12 line pattern: check `socket.data.roomId`, emit `NOT_IN_ROOM`, get the room, emit `ROOM_NOT_FOUND`, check `room.gameEngine`, emit `GAME_NOT_STARTED`. This pattern has already drifted: `bidding.handler.ts` checks `gameEngine` existence but `playing.handler.ts` does not check `roomId` before the engine check in one place. Centralize it.

**Files to attach:**
- `Backend/src/sockets/events/room.handler.ts`
- `Backend/src/sockets/events/bidding.handler.ts`
- `Backend/src/sockets/events/playing.handler.ts`

**Task:**  
Create `Backend/src/sockets/utils.ts`:
```ts
import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket.types.js';
import type { RoomManager } from '../rooms/roomManager.js';
import type { Room } from '../rooms/room.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

interface RoomContext {
    room: Room;
    roomId: string;
    playerId: string;
}

/**
 * Resolves room membership and game engine for a socket event.
 * Emits the appropriate error and returns null if any check fails.
 * requireGame = true also checks that a game engine is active.
 */
export async function withRoom(
    socket: SocketType,
    roomManager: RoomManager,
    requireGame = false
): Promise<RoomContext | null> {
    const roomId = socket.data.roomId;
    if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You must be in a room to perform this action' });
        return null;
    }

    const room = await roomManager.getRoom(roomId);
    if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' });
        return null;
    }

    if (requireGame && !room.gameEngine) {
        socket.emit('error', { code: 'GAME_NOT_STARTED', message: 'Game has not started yet' });
        return null;
    }

    const playerId = socket.data.playerId || socket.data.userId;
    if (!playerId) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return null;
    }

    return { room, roomId, playerId };
}
```

Then refactor `handlePlaceBid`, `handlePassBid`, `handleSetTrump`, and `handlePlayCard` to use it:
```ts
const ctx = await withRoom(socket, roomManager, true);
if (!ctx) return;
const { room, roomId, playerId } = ctx;
```

Remove the duplicated `roomId` / `playerId` / `room` / `gameEngine` checks from each handler body.

**Expected outcome:** All game action handlers reduce by ~10 lines each. The `NOT_IN_ROOM`, `ROOM_NOT_FOUND`, `GAME_NOT_STARTED`, and `AUTH_REQUIRED` error responses are defined in exactly one place.

---

### PROMPT L9 — Move side effects out of GameEngine into service layer

**Context:**  
`game/engine.ts` imports `logger` from `lib/logger.ts` and `metrics` from `lib/metrics.ts`. A game engine should be a pure state machine: it takes state + action, returns new state, and fires subscriber callbacks. All logging and metric recording belongs in the calling layer (`RoomManager`, socket handlers, or a `GameService`). This is covered by PROMPT M4 for persistence — this prompt covers the remaining logging and metrics calls.

**Files to attach:**
- `Backend/src/game/engine.ts`
- `Backend/src/rooms/room.ts`

**Task:**

1. After completing PROMPT M4 (removing `persistGame()` and `saveGame` import), the remaining imports in `engine.ts` that belong to the infrastructure layer are `logger` and `metrics`. Identify every remaining call:
   - `logger.info('Game persisted successfully', ...)` — removed with `persistGame()`
   - `logger.error('Failed to persist game', ...)` — removed with `persistGame()`
   - `metrics.gameCompleted(winner)` — removed with `persistGame()`
   - Any remaining `logger.debug` or `logger.warn` calls in `dispatch()`

2. For any `logger.debug` calls in `dispatch()` that trace action processing, remove them from `engine.ts` and instead log in the caller (`socketHandlers.ts#handleGameAction`) after a successful `dispatch()` returns `true`:
```ts
// In socketHandlers.ts, after: const success = room.gameEngine.dispatch(action);
if (success) {
    logger.debug('Game action dispatched', { type: action.type, roomId });
}
```

3. After these removals, verify `engine.ts` no longer imports `logger` or `metrics`. Remove those import lines.

4. The `withTimingSync` import from `monitoring/performance.ts` in `engine.ts` is borderline — timing infrastructure is reasonable inside the engine for now. Leave it.

**Expected outcome:** `engine.ts` imports: `state.ts`, `actions.ts`, `reducer.ts`, `monitoring/performance.ts`, and nothing from `lib/` or `services/`. The engine is a pure state machine with a timing side-car.

---

## TESTING TASKS

---

### PROMPT T1 — Auth service integration tests with MongoMemoryServer

**Context:**  
`services/auth.service.ts` has no integration tests against a real database. The existing mock in `__tests__/setup.ts` is a shallow stub that bypasses Mongoose schema validation entirely. Register and login flows, duplicate email detection, password hashing, and JWT signing need real DB coverage.

**Files to attach:**
- `Backend/src/services/auth.service.ts`
- `Backend/src/models/User.model.ts`
- `Backend/src/types/auth.types.ts`

**Task:**  
Create `Backend/src/__tests__/integration/auth.service.test.ts` using `mongodb-memory-server`:

```ts
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { authService } from '../../services/auth.service.js';

// Must set env before auth.service imports getEnv()
process.env.JWT_SECRET = 'integration-test-secret-minimum-32-chars!!';
process.env.JWT_EXPIRES_IN = '1h';
// ...other required env vars
```

Write tests covering:
1. `register()` with valid data returns a JWT and user object — verify JWT contains `userId`.
2. `register()` with a duplicate email throws with status 409.
3. `register()` with invalid email format (if Mongoose validates) throws.
4. `login()` with correct credentials returns a JWT.
5. `login()` with wrong password throws with status 401.
6. `login()` with non-existent email throws with status 401.
7. The returned JWT can be decoded to extract the `userId` matching the created user's `_id`.
8. Passwords are not stored in plaintext — query the raw document and assert `password !== original_password`.

Use `before` to start `MongoMemoryServer` and `mongoose.connect()`. Use `after` to stop. Use `beforeEach` to clear the `users` collection between tests.

---

### PROMPT T2 — gameHistory.service integration tests with MongoMemoryServer

**Context:**  
`services/gameHistory.service.ts#saveGame` uses `PlayerStatsModel.findOneAndUpdate` with `upsert: true`. The existing test file is entirely unit-test style with no DB calls — it only validates plain object shapes. Real coverage requires a `MongoMemoryServer` to verify upsert behavior, leaderboard sorting, and win-rate calculation.

**Files to attach:**
- `Backend/src/services/gameHistory.service.ts`
- `Backend/src/models/PlayerStats.model.ts`
- `Backend/src/models/Game.model.ts`
- `Backend/src/game/state.ts`

**Task:**  
Create `Backend/src/__tests__/integration/gameHistory.service.test.ts`. Write tests covering:

1. `saveGame()` creates a `Game` document with correct `roomId`, `playerIds`, `winner`, and `finalScore`.
2. `saveGame()` upserts `PlayerStats` for all 4 players — `gamesPlayed` increments by 1 for each.
3. `saveGame()` increments `wins` only for the winning team's players.
4. Calling `saveGame()` twice for the same players (same `socketId`) increments `gamesPlayed` to 2, not 1 (upsert accumulates).
5. `getLeaderboard()` returns players sorted by `wins` descending.
6. `getLeaderboard()` calculates `winRate` correctly: `(wins / gamesPlayed) * 100`.
7. `getLeaderboard()` returns at most `limit` entries.
8. `getUserStats()` returns `null` for an unknown `socketId`.
9. `getUserStats()` returns correct stats after a `saveGame()`.

---

### PROMPT T3 — Reconnection flow integration tests

**Context:**  
The reconnection path in `sockets/events/room.handler.ts#handleJoinRoom` detects an existing `playerId` in the room and calls `markPlayerReconnected()` instead of `addPlayer()`. This path has no test coverage. After PROMPT M7, the reconnect window timer also needs testing.

**Files to attach:**
- `Backend/src/sockets/socket.test.ts` (for test infrastructure patterns)
- `Backend/src/sockets/events/room.handler.ts`
- `Backend/src/rooms/room.ts`

**Task:**  
Add a new `describe('Reconnection flow', ...)` block to `socket.test.ts` (or a separate `reconnection.test.ts`):

1. A player creates a room, then disconnects. Within 30 seconds, they reconnect with the same `userId` in their JWT. They should receive `room_joined` (not `player_joined`) and the current game state if a game is active.
2. The room should show the player as connected after reconnect — other sockets receive `player_reconnected`.
3. A player that disconnects and does NOT reconnect within the 30-second window should be removed from the room — other sockets receive `player_left`.
4. Reconnecting after the window has expired should fail with `ROOM_NOT_FOUND` or place the user as a new player (whichever behavior is chosen — document it).

Use fake timers (`clock` / `setTimeout` mocking) for the 30-second window test to avoid real waits.

---

### PROMPT T4 — Adversarial security tests

**Context:**  
No tests verify that the system handles malicious inputs correctly: oversized payloads, spoofed player IDs, malformed JSON, or forged JWTs.

**Task:**  
Create `Backend/src/__tests__/security/adversarial.test.ts`:

1. **Oversized playerName:** Connect with a valid JWT, emit `create_room` with `playerName: 'A'.repeat(10_000)`. Assert `INVALID_PAYLOAD` error is received (after M8 fix) and the room was not created.

2. **Spoofed playerId in game action:** Connect with valid JWT (userId = 'attacker'). Join a room. Emit `game_action` with `action: { type: 'BID', playerId: 'victim', value: 7 }`. The handler must overwrite `playerId` with the verified JWT userId. Assert the emitted `game_state_updated` reflects `bidderId === 'attacker'`, not `'victim'`.

3. **Forged JWT:** Connect with `auth: { token: jwt.sign({ userId: 'admin' }, 'wrong-secret') }`. Assert the connection is rejected with `INVALID_TOKEN`.

4. **Missing JWT:** Connect with no auth token. Assert connection is rejected with `AUTH_REQUIRED`.

5. **Malformed card payload:** Connect and join a room with 4 players, start a game. Emit `play_card` with `{ card: { suit: 'INVALID', rank: '99' } }`. Assert `INVALID_ACTION` error.

6. **Rate limit test:** Emit 15 `create_room` events in rapid succession from one socket. Assert at least one `RATE_LIMIT_EXCEEDED` error is received.

---

### PROMPT T5 — Debounced save fake-timer tests

**Context:**  
`rooms/room.ts#saveState` uses a 1-second debounce timer. The immediate-save path is tested implicitly (addPlayer calls `saveState(true)`), but the debounced path and the `SCORING`/`GAME_OVER` immediate-save behavior from the engine subscriber are not tested.

**Task:**  
Add to `rooms/room.test.ts` a new `describe('saveState debounce', ...)` block. Use Node.js built-in fake timer support or `mock.timers` from `node:test` (available in Node 20+):

1. After `addPlayer`, verify `roomCache.cacheRoom` is called immediately (immediate = true path).
2. After a game engine action that changes phase to `BIDDING` (not SCORING), verify `roomCache.cacheRoom` is NOT called immediately — it is scheduled after 1 second. Advance fake timers by 1000ms and verify the call then occurs.
3. After a game engine action that changes phase to `SCORING`, verify `roomCache.cacheRoom` IS called immediately (immediate = true path from the subscriber).
4. Verify that multiple rapid non-immediate saves within the 1-second window result in only ONE call to `roomCache.cacheRoom` (debounce collapses them).

---

### PROMPT T6 — Boot-time Redis hydration tests

**Context:**  
`rooms/roomManager.ts#initialize()` calls `roomCache.getAllActiveRooms()` and hydrates the in-memory Map. This path has no test coverage. A regression here would cause all active games to be lost on every deploy.

**Task:**  
Add to `rooms/roomManager.test.ts` a new `describe('initialize() — boot hydration', ...)` block:

1. Mock `roomCache.getAllActiveRooms` to return two pre-built `Room` instances (with a `gameEngine` set via `GameEngine.fromState()`).
2. Call `await manager.initialize()`.
3. Assert `await manager.getRoom(room1.id)` returns the hydrated room without a cache miss.
4. Assert `reattachPersistence()` was called on each hydrated room — mock the method and verify call count equals 2.
5. Test the failure case: if `getAllActiveRooms` throws, `initialize()` should either re-throw (causing `bootstrap()` to fail fast) or log a warning and continue with an empty map. Document and test whichever behavior is chosen.

---

### PROMPT T7 — Verify Redis state in load tests

**Context:**  
`__tests__/integration/concurrent.test.ts` (not shown but referenced in TODO) verifies in-memory state after 100 concurrent rooms. It does not verify Redis state — meaning roomCache write failures would be invisible.

**Task:**  
Extend the load test to add Redis verification after the 100-room batch:

1. After all rooms are created and the test assertions pass, call `roomCache.getAllActiveRooms()` directly and assert it returns 100 rooms (or the same count as the in-memory manager).
2. For a sample of 10 rooms, call `roomCache.getRoom(id)` and assert the returned room's player count matches the in-memory version.
3. After calling `manager.clear()`, call `roomCache.getAllActiveRooms()` again and assert it returns 0 rooms — verifying that delete propagates to Redis.
4. Assert that the Redis `active_rooms` SET (after H5/C3 fix) has the correct cardinality at each checkpoint.
