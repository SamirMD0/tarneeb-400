PHASE 16 – Redis Caching Layer (TODO)
Missing Core Implementation
[ ] Create redis.ts connection module

File(s): Backend/src/lib/redis.ts
What's missing: While redisClient.ts exists, Phase 16 requires:

Proper TLS configuration for production (Upstash)
Pub/Sub client initialization (separate from main client)
Connection state management with reconnection logic
Circuit breaker for repeated failures


Why it's needed: Production-grade Redis connection handling

[ ] Create roomCache.ts cache service

File(s): Backend/src/cache/roomCache.ts
What's missing: Complete cache abstraction with methods:

cacheRoom(roomId: string, state: RoomState): Promise<void>
getRoom(roomId: string): Promise<RoomState | null>
deleteRoom(roomId: string): Promise<void>
getAllActiveRooms(): Promise<RoomState[]>
setRoomTTL(roomId: string, ttl: number): Promise<void>


Why it's needed: Core caching layer for room state

[ ] Create roomCache.test.ts

File(s): Backend/src/cache/roomCache.test.ts
What's missing: Tests covering:

Cache hit/miss scenarios
TTL expiration (use faketime or manual key deletion)
Concurrent writes (race conditions)
Redis connection failure fallback to MongoDB
Cache invalidation on room updates


Why it's needed: Verify cache behavior under all conditions

Missing Redis Configuration
[ ] Configure TTL strategy

File(s): Backend/src/cache/roomCache.ts
What's missing: TTL configuration:

Active game rooms: 1 hour (extendable on activity)
Waiting rooms: 30 minutes
Completed games: immediate expiration after write to MongoDB


Why it's needed: Prevent memory bloat and stale data

[ ] Implement write-through caching pattern

File(s): Backend/src/cache/roomCache.ts
What's missing: On every room state update:

Write to Redis (cache)
Write to persistent store (if applicable)
Return success only if both succeed


Why it's needed: Data consistency between cache and source of truth

[ ] Add Redis health check enhancement

File(s): Backend/src/routes/health.ts
What's missing: While pingRedis() exists, enhance with:

Redis memory usage stats
Key count
Eviction count (if maxmemory-policy active)
Replication lag (if replica set)


Why it's needed: Operational visibility into cache performance

Missing Integration with Room System
[ ] Integrate roomCache in RoomManager

File(s): Backend/src/rooms/roomManager.ts
What's missing: Cache layer integration:

createRoom() → cache new room immediately
getRoom() → check cache first, fallback to in-memory Map
deleteRoom() → invalidate cache entry
listRooms() → consider cache vs. Map as source of truth


Why it's needed: Leverage Redis for distributed room state

[ ] Add cache invalidation on room mutations

File(s): Backend/src/rooms/room.ts
What's missing: Invalidate cache on:

addPlayer() → update cached room state
removePlayer() → update cached room state
startGame() → update cached room state + extend TTL
gameEngine.dispatch() → debounced cache write (every N actions or M seconds)


Why it's needed: Keep cache synchronized with room state changes

Missing Fallback & Error Handling
[ ] Implement cache failure fallback logic

File(s): Backend/src/cache/roomCache.ts
What's missing: On Redis connection failure or timeout:

Log error with context (roomId, operation)
Return null for reads (trigger fallback to primary store)
Skip writes but continue operation (degrade gracefully)
Emit metrics for monitoring


Why it's needed: System remains functional when Redis is unavailable

[ ] Add cache warming strategy

File(s): Backend/src/cache/roomCache.ts or bootstrap script
What's missing: On server startup:

Load active rooms from MongoDB/RoomManager into Redis
Prevents cold cache on restart


Why it's needed: Minimize latency spike after deployment

[ ] Implement cache eviction monitoring

File(s): Backend/src/lib/redis.ts
What's missing: Listen to Redis evicted_keys metric or INFO command

Alert if eviction rate is high (indicates insufficient memory)


Why it's needed: Proactive capacity planning

Missing Serialization & Data Types
[ ] Define RoomState serialization format

File(s): Backend/src/types/room.types.ts
What's missing: While RoomState interface exists, ensure:

All fields are JSON-serializable (no Map, Set, Date → ISO string)
Add toJSON() method or serialization helper
Document max size limit (e.g., 1MB per room)


Why it's needed: Redis stores strings/bytes, not JS objects

[ ] Handle Map → Array conversion for players

File(s): Backend/src/cache/roomCache.ts
What's missing: Convert Room.players: Map<PlayerID, LobbyPlayer> to array for caching:

typescript  players: Array.from(room.players.values())

Why it's needed: Maps don't serialize to JSON properly

Missing Performance Optimizations
[ ] Implement batch cache operations

File(s): Backend/src/cache/roomCache.ts
What's missing: Add batch methods:

cacheRooms(rooms: Room[]): Promise<void> using Redis pipeline
getRooms(roomIds: string[]): Promise<Map<string, RoomState>>


Why it's needed: Reduce round-trip latency for bulk operations

[ ] Add debounced cache writes for high-frequency updates

File(s): Backend/src/rooms/room.ts or GameEngine.ts
What's missing: When game actions happen rapidly:

Debounce cache writes (e.g., max 1 write per 500ms per room)
Batch multiple state changes into single Redis write


Why it's needed: Avoid overwhelming Redis with writes during active gameplay

Missing Environment Configuration
[ ] Add Redis-specific environment variables

File(s): Backend/.env.example
What's missing: While REDIS_URL exists, add:

REDIS_TTL_ACTIVE_GAME (default: 3600 seconds)
REDIS_TTL_WAITING_ROOM (default: 1800 seconds)
REDIS_MAX_RETRIES (default: 10)
REDIS_RETRY_DELAY_MS (default: 100)
REDIS_TIMEOUT_MS (default: 5000)


Why it's needed: Fine-tune cache behavior per environment

Missing Documentation
[ ] Document caching strategy in ARCHITECTURE.md

File(s): Backend/docs/ARCHITECTURE.md (create if missing)
What's missing: Explain:

Write-through vs. write-behind decision
TTL strategy and eviction policy
Cache invalidation triggers
Fallback behavior diagram


Why it's needed: Operational runbook for cache issues

[ ] Add Redis troubleshooting guide to RUNBOOK.md

File(s): RUNBOOK.md (create if missing)
What's missing: Common issues and solutions:

"Cache miss rate high" → Check TTL configuration
"Redis connection timeout" → Check network/firewall
"Memory eviction warnings" → Scale Redis instance


Why it's needed: Faster incident resolution

Missing Monitoring & Observability
[ ] Add cache hit/miss metrics

File(s): Backend/src/cache/roomCache.ts
What's missing: Track and expose:

cache_hits_total counter
cache_misses_total counter
cache_write_errors_total counter
cache_operation_duration_ms histogram


Why it's needed: Measure cache effectiveness and performance

[ ] Integrate cache metrics with /metrics endpoint

File(s): Backend/src/routes/health.ts or separate metrics endpoint
What's missing: If Prometheus integration exists, add Redis metrics
Why it's needed: Centralized observability