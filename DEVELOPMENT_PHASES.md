# Tarneeb/400 Card Game - Development Phases

## Phase 0: Repository Initialization
**Goal:** Set up empty repository with essential configuration files

**Create:**
- `.gitignore` (node_modules, dist, .env, IDE files)
- `README.md` (project description, Tarneeb rules overview)
- `LICENSE` (MIT or Apache 2.0)
- `.editorconfig` (consistent formatting)
- `.nvmrc` (Node 20+)

**Implemented:**
- Git ignore rules
- Project description
- Editor consistency config
- Node version lock

**Not Implemented:** Any code, package managers, dependencies

---

## Phase 1: Backend Skeleton
**Goal:** Initialize TypeScript Node.js backend with zero game logic

**Create:**
```
Backend/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    └── index.ts
```

**Implemented:**
- `package.json` scripts: `dev`, `build`, `start`, `typecheck`, `test`
- TypeScript strict config (ES2022, NodeNext modules)
- Dependencies: `express`, `dotenv`, `typescript`, `tsx`, `@types/node`, `@types/express`
- Dev server runs with `tsx watch`
- Empty Express server starts successfully

**Not Implemented:** Game logic, Database, WebSockets, Routes

---

## Phase 2: Type System Foundation
**Goal:** Define complete game domain types with zero implementation

**Create:**
```
Backend/src/types/
├── game.types.ts
├── player.types.ts
├── room.types.ts
└── socket.types.ts
```

**Implemented:**
```typescript
// game.types.ts
- Suit, Rank, Card
- GamePhase enum
- BidAction, TrumpAction, PlayCardAction types

// player.types.ts  
- PlayerID, TeamID
- PlayerState interface
- TeamState interface

// room.types.ts
- RoomID, RoomState
- RoomPhase, RoomConfig

// socket.types.ts
- ClientToServerEvents
- ServerToClientEvents
- SocketData
```

**Not Implemented:** Functions, classes, validation logic, state mutations

---

## Phase 3: Deck System
**Goal:** Pure functional deck creation and shuffling with deterministic testing

**Create:**
```
Backend/src/game/
├── deck.ts
└── deck.test.ts
```

**Implemented:**
```typescript
// deck.ts
- createDeck(): Card[] (52 cards, 4 suits × 13 ranks)
- shuffleDeck(deck: Card[], rng: () => number): Card[]
  → Fisher-Yates with injectable RNG
  → Returns new array (immutable)

// deck.test.ts
- Test deck has 52 unique cards
- Test shuffle doesn't mutate original
- Test shuffle with deterministic RNG
- Test edge cases (empty, single card)
```

**Not Implemented:** Dealing logic, hand management, card validation

---

## Phase 4: Game State Model
**Goal:** Immutable game state structure with initialization only

**Create:**
```
Backend/src/game/
├── state.ts
└── state.test.ts
```

**Implemented:**
```typescript
// state.ts
interface GameState {
  players: PlayerState[]
  teams: Record<TeamID, TeamState>
  deck: Card[]
  trumpSuit?: Suit
  currentPlayerIndex: number
  phase: GamePhase
  trick: Card[]
  highestBid?: number
  bidderId?: PlayerID
}

- createInitialGameState(playerIds: string[]): GameState
  → Validates exactly 4 players
  → Shuffles deck, deals 13 cards each
  → Assigns teams (1,3 vs 2,4)
  → Sets phase to DEALING

// state.test.ts
- Test initialization with 4 players
- Test team assignment correctness
- Test each player has 13 cards
- Test deck is shuffled
- Test error on wrong player count
```

**Not Implemented:** State mutations, turn logic, bidding, trick resolution

---

## Phase 5: Card Comparison Logic
**Goal:** Pure function for comparing two cards given trump and lead suit

**Create:**
```
Backend/src/game/
├── rules.ts
└── rules.test.ts
```

**Implemented:**
```typescript
// rules.ts
- Rank order constant: A>K>Q>J>10>9>8>7>6>5>4>3>2
- compareCards(cardA, cardB, trumpSuit, leadSuit): number
  → Returns 1 if A wins, -1 if B wins, 0 if tie
  → Trump beats non-trump
  → Lead suit beats off-suit
  → Same suit: compare rank order

// rules.test.ts
- Test trump vs non-trump
- Test lead suit vs off-suit
- Test rank order within same suit
- Test edge combinations
- Test tie scenarios
```

**Not Implemented:** Play validation, trick resolution, bidding validation

---

## Phase 6: Play Validation Rules
**Goal:** Pure functions to validate if a card can be played

**Update:** `Backend/src/game/rules.ts`, `rules.test.ts`

**Implemented:**
```typescript
- canPlayCard(state, playerId, card): boolean
  → Player owns the card
  → Must follow lead suit if possible
  → Must trump if no lead suit and has trump
  → Can play any card if no lead or trump

// Tests:
- Player must follow lead suit when able
- Player can play off-suit when no lead suit cards
- Player must trump when no lead suit
- Player can discard when no lead or trump
- Player cannot play card they don't own
- First card of trick has no restrictions
```

**Not Implemented:** Trick winner resolution, score calculation, state updates

---

## Phase 7: Trick Resolution
**Goal:** Determine winner of a completed trick

**Update:** `Backend/src/game/rules.ts`, `rules.test.ts`

**Implemented:**
```typescript
- resolveTrick(state: GameState): PlayerID | undefined
  → Requires exactly 4 cards in trick
  → Uses compareCards to find winning card
  → Returns winner's PlayerID
  → Updates team tricks count
  → Returns undefined if incomplete

// Tests:
- Trump wins over lead suit
- Highest trump wins when multiple trumps
- Highest lead suit wins when no trump
- Returns undefined if <4 cards
- Team trick counter increments
- All 4 players with various combinations
```

**Not Implemented:** Trick state clearing, turn advancement, score calculation

---

## Phase 8: Bidding Validation
**Goal:** Pure validation for bid actions

**Update:** `Backend/src/game/rules.ts`, `rules.test.ts`

**Implemented:**
```typescript
- isBidValid(bid: number, currentHighestBid?: number): boolean
  → Bid must be 7-13
  → Must be higher than current highest bid
  → No restrictions if first bid

// Tests:
- Valid range (7-13)
- Must exceed current bid
- First bid can be any valid value
- Rejects <7 and >13
- Rejects bid equal to current
```

**Not Implemented:** Bid state updates, pass tracking, trump selection

---

## Phase 9: Scoring System
**Goal:** Calculate round scores based on contract fulfillment

**Update:** `Backend/src/game/rules.ts`, `rules.test.ts`

**Implemented:**
```typescript
- calculateScore(state, contractBid, bidderId): void
  → If bidder team wins >= contract: +tricks * 10
  → If bidder team fails: -contract * 10
  → Defending team always: +tricks * 10
  → Mutates state.teams[].score

// Tests:
- Contract made: bidder team scores correctly
- Contract failed: bidder loses, defender gains
- Exact contract (7 bid, 7 tricks)
- Over-contract (7 bid, 10 tricks)
- Defender scores even when bidder succeeds
- Various trick splits
```

**Not Implemented:** Game-over detection (41+ points), round reset, state transitions

---

## Phase 10: Action Types
**Goal:** Define all possible game actions as discriminated union

**Create:** `Backend/src/game/actions.ts`

**Implemented:**
```typescript
type GameAction =
  | { type: 'START_BIDDING' }
  | { type: 'BID'; playerId: string; value: number }
  | { type: 'PASS'; playerId: string }
  | { type: 'SET_TRUMP'; suit: Suit }
  | { type: 'PLAY_CARD'; playerId: string; card: Card }
  | { type: 'END_TRICK' }
  | { type: 'END_ROUND' }
  | { type: 'RESET_GAME' }
```

**Not Implemented:** Action creators, action handlers, validation

---

## Phase 11: Game Reducer
**Goal:** Pure state reducer that applies actions to game state

**Create:**
```
Backend/src/game/
├── reducer.ts
└── reducer.test.ts
```

**Implemented:**
```typescript
- applyAction(state, action): GameState
  → Returns new state (immutable via structuredClone)
  → Delegates to validation functions from rules.ts
  → Handles each action type:
    - START_BIDDING: DEALING → BIDDING
    - BID: validates and updates highestBid, bidderId
    - PASS: advances currentPlayerIndex
    - SET_TRUMP: sets trump, → PLAYING
    - PLAY_CARD: validates, removes from hand, adds to trick
    - END_TRICK: calls resolveTrick, clears trick
    - END_ROUND: calls calculateScore, → SCORING
    - RESET_GAME: returns createInitialGameState

// Tests:
- Each action type in isolation
- Invalid actions return unchanged state
- State immutability
- Full bidding phase flow
- Full trick flow
- Edge cases: wrong turn, wrong phase
```

**Not Implemented:** Async operations, side effects, multi-round state

---

## Phase 12: Game Engine
**Goal:** High-level orchestrator managing game lifecycle

**Create:**
```
Backend/src/game/
├── engine.ts
└── engine.test.ts
```

**Implemented:**
```typescript
class GameEngine {
  private state: GameState
  
  constructor(playerIds: string[])
  getState(): Readonly<GameState>
  dispatch(action: GameAction): boolean
  getCurrentPlayer(): PlayerState
  isGameOver(): boolean
  getWinner(): TeamID | undefined
  
  private validateAction(action): boolean
  private notifyObservers(action): void
}

// Tests:
- Engine initialization
- Dispatch accepts valid actions
- Dispatch rejects invalid actions  
- getCurrentPlayer returns correct player
- isGameOver detects 41+ points
- getWinner returns correct team
- Full game simulation
```

**Not Implemented:** Observer pattern, persistence, network layer

---

## Phase 13: Edge Case Hardening
**Goal:** Handle all degenerate cases explicitly

**Update:** `reducer.test.ts`, `rules.test.ts`

**Implemented Tests:**
```
Bidding:
- All players pass → round ends in draw
- Bidder disconnects before setting trump
- Invalid trump suit selected

Playing:
- Player plays card from different player's hand
- Player plays card already played
- Player plays after trick complete
- Last trick of round completes at 13 tricks

Scoring:
- Both teams reach 41+ (tiebreaker: bidder wins)
- Negative scores
- Score overflow (>1000 points)

State:
- Unknown action type
- Corrupted data (missing player, empty deck)
```

**Not Implemented:** Reconnection logic, undo/redo, spectator mode

---

## Phase 14: Room Management System
**Goal:** Multi-game lobby and room state management

**Create:**
```
Backend/src/rooms/
├── room.ts
├── room.test.ts
├── roomManager.ts
└── roomManager.test.ts
```

**Implemented:**
```typescript
// room.ts
class Room {
  id: RoomID
  players: Map<PlayerID, PlayerState>
  gameEngine?: GameEngine
  config: RoomConfig
  
  addPlayer(id, name): boolean
  removePlayer(id): boolean
  startGame(): boolean
  isReady(): boolean
  isFull(): boolean
}

// roomManager.ts
class RoomManager {
  private rooms: Map<RoomID, Room>
  
  createRoom(config): Room
  getRoom(id): Room | undefined
  deleteRoom(id): boolean
  listRooms(): Room[]
  findAvailableRoom(): Room | undefined
}

// Tests:
- Room lifecycle (create, add players, start, end)
- RoomManager CRUD operations
- Room capacity limits (4 max)
- Starting game with <4 players fails
- Removing player mid-game
```

**Not Implemented:** Persistence (in-memory only), room expiration, matchmaking

---

## Phase 15: MongoDB Integration
**Goal:** Persist game history and user profiles

**Create:**
```
Backend/src/models/
├── Game.model.ts
├── User.model.ts
└── index.ts

Backend/src/lib/
└── mongoose.ts

Backend/src/services/
├── gameHistory.service.ts
└── gameHistory.service.test.ts
```

**Implemented:**
```typescript
// Game.model.ts
GameSchema {
  roomId, playerIds, winner
  finalScore: { team1, team2 }
  rounds: RoundSnapshot[]
  startedAt, endedAt
}

// User.model.ts
UserSchema {
  socketId, username
  gamesPlayed, wins
  createdAt
}

// gameHistory.service.ts
- saveGame(roomId, gameState)
- getGameHistory(userId)
- getLeaderboard()

// mongoose.ts
- Connection pooling
- Error handling
- Health check endpoint

// Tests:
- Save game after END_ROUND
- Retrieve user history
- Leaderboard query performance
```

**Not Implemented:** Real-time syncing, authentication, transactions

---

## Phase 16: Redis Caching Layer
**Goal:** Cache active room states for low-latency access

**Create:**
```
Backend/src/lib/
└── redis.ts

Backend/src/cache/
├── roomCache.ts
└── roomCache.test.ts
```

**Implemented:**
```typescript
// redis.ts
- Connection with retry logic
- Health check
- Error handling

// roomCache.ts
- cacheRoom(roomId, state)
- getRoom(roomId)
- deleteRoom(roomId)
- getAllActiveRooms()
- TTL: 1 hour (auto-expire)

// Tests:
- Cache hit/miss scenarios
- TTL expiration
- Concurrent writes
- Redis connection failure fallback
```

**Not Implemented:** Pub/Sub, distributed locking, invalidation strategies

---

## Phase 17: WebSocket Foundation
**Goal:** Bidirectional real-time communication with Socket.IO

**Create:**
```
Backend/src/socket/
├── socketServer.ts
├── socketHandlers.ts
└── socketMiddleware.ts
```

**Implemented:**
```typescript
// socketServer.ts
- Initialize Socket.IO with CORS
- Attach to Express server
- Connection/disconnection logging

// socketMiddleware.ts
- Authentication middleware (placeholder)
- Rate limiting per socket
- Error boundary wrapper

// socketHandlers.ts
- 'join_room' → Add player, emit room_state
- 'leave_room' → Remove player, notify others
- 'game_action' → Validate, dispatch, broadcast
- Error handling and validation

// Update index.ts:
- Integrate Socket.IO server
- Health endpoint includes websocket status
```

**Not Implemented:** Authentication, reconnection logic, message queuing

---

## Phase 18: Socket Event Handlers
**Goal:** Wire all game actions to WebSocket events

**Create:**
```
Backend/src/socket/
├── events/
│   ├── bidding.handler.ts
│   ├── playing.handler.ts
│   ├── room.handler.ts
│   └── index.ts
└── socket.test.ts
```

**Implemented:**
```typescript
// bidding.handler.ts
- on('place_bid') → Dispatch BID, broadcast
- on('pass_bid') → Dispatch PASS
- on('set_trump') → Dispatch SET_TRUMP, → PLAYING

// playing.handler.ts
- on('play_card') → Validate, dispatch PLAY_CARD
- Auto-trigger END_TRICK when 4 cards
- Auto-trigger END_ROUND when 13 tricks

// room.handler.ts
- on('create_room') → RoomManager.createRoom
- on('join_room') → Room.addPlayer, cache
- on('start_game') → Room.startGame, init engine
- on('leave_room') → Handle disconnection

// socket.test.ts
- Integration: Full game via socket events
- Concurrent actions from multiple sockets
- Invalid action rejection
- State broadcast to all room members
```

**Not Implemented:** Spectator events, chat, admin commands

---

## Phase 19: Error Handling & Validation
**Goal:** Robust error boundaries and input sanitization

**Create:**
```
Backend/src/middleware/
├── errorHandler.ts
├── validator.ts
└── rateLimiter.ts

Backend/src/utils/
└── errors.ts
```

**Implemented:**
```typescript
// errors.ts
class GameError extends Error
class ValidationError extends GameError
class NotFoundError extends Error
class UnauthorizedError extends Error

// errorHandler.ts
- Express error middleware
- Socket error boundary wrapper
- Structured error responses with codes

// validator.ts
- Zod schemas for all client events
- sanitizeInput() for XSS prevention
- validateRoomConfig()
- validateGameAction()

// rateLimiter.ts
- Per-socket: 10 actions/second
- Per-IP room creation: 3/hour
- Exponential backoff for violators

// Update all handlers:
- Wrap with error boundaries
- Validate all inputs before processing
- Return structured errors to client
```

**Not Implemented:** DDoS protection (use nginx/Cloudflare), DB query validation

---

## Phase 20: Logging & Monitoring
**Goal:** Production-grade observability

**Create:**
```
Backend/src/lib/
├── logger.ts
└── metrics.ts

Backend/src/monitoring/
├── healthCheck.ts
└── performance.ts
```

**Implemented:**
```typescript
// logger.ts
- Winston logger with levels
- Structured JSON logs
- File + console transports
- Redact sensitive data (player hands)

// metrics.ts
- Track: active rooms, sockets, games/hour
- Response time histogram
- Error rate counter
- Export /metrics endpoint (Prometheus)

// healthCheck.ts
- GET /health → { status, uptime, mongodb, redis }
- Liveness probe: /health/live
- Readiness probe: /health/ready

// Update all services:
- Log at appropriate levels
- Track metrics on key operations
- Performance timing for game actions
```

**Not Implemented:** APM integration, distributed tracing, alerting rules

---

## Phase 21: Testing Infrastructure
**Goal:** Comprehensive test coverage with CI setup

**Create:**
```
Backend/src/__tests__/
├── integration/
│   ├── fullGame.test.ts
│   ├── multiplayer.test.ts
│   └── persistence.test.ts
├── load/
│   └── concurrent.test.ts
└── setup.ts

.github/workflows/
└── ci.yml
```

**Implemented:**
```typescript
// integration/fullGame.test.ts
- Simulate complete game bidding → scoring
- Multiple rounds until 41 points
- Verify MongoDB persistence

// integration/multiplayer.test.ts
- 4 socket clients simultaneously
- Verify state consistency across all clients
- Test disconnect/reconnect mid-game

// integration/persistence.test.ts
- Room state survives server restart (Redis)
- Game history queries after completion

// load/concurrent.test.ts
- 100 concurrent rooms with socket clients
- Measure latency under load
- Verify no state corruption

// ci.yml
- Run on push to main/dev
- Jobs: lint, typecheck, test, build
- Cache node_modules
- Upload coverage to Codecov
```

**Not Implemented:** E2E tests with UI, chaos engineering, security scanning

---

## Phase 22: Docker & Deployment
**Goal:** Production-ready containerization

**Create:**
```
Backend/Dockerfile
Backend/.dockerignore
docker-compose.yml
.env.production.example
scripts/
├── deploy.sh
└── migrate.sh
```

**Implemented:**
```dockerfile
# Dockerfile
- Multi-stage build (builder + production)
- Non-root user
- Health check instruction
- Optimize layer caching

# docker-compose.yml
services:
  - backend (with healthcheck)
  - mongodb (persistent volume)
  - redis (persistent volume)
  - nginx (reverse proxy, future)

# Environment:
- .env.production.example (all vars documented)
- Secrets management strategy

# deploy.sh
- Build Docker image
- Push to registry (Docker Hub / AWS ECR)
- Deploy to VPS / Cloud Run / Railway
- Run database migrations

# Documentation:
- README: deployment instructions
- Infrastructure requirements
- Scaling considerations
```

**Not Implemented:** Kubernetes, CI/CD pipeline, blue-green deployments

---

## Phase 23: API Documentation
**Goal:** Complete API reference for WebSocket events and REST endpoints

**Create:**
```
Backend/docs/
├── API.md
├── SOCKET_EVENTS.md
├── GAME_RULES.md
└── ARCHITECTURE.md

Backend/src/swagger.ts
```

**Implemented:**
```markdown
# API.md
- REST endpoints:
  - GET /health
  - GET /metrics
  - GET /api/rooms
  - GET /api/leaderboard

# SOCKET_EVENTS.md
- Client → Server events with payloads
- Server → Client events with payloads
- Error codes and meanings
- Example event sequences for full game

# GAME_RULES.md
- Tarneeb/400 rules explained
- Scoring system
- Edge cases handled
- Differences from standard rules (if any)

# ARCHITECTURE.md
- System diagram (components, data flow)
- Technology stack rationale
- Scaling architecture
- Security considerations

# swagger.ts
- OpenAPI 3.0 spec for REST
- Serve at /api-docs
- Interactive Swagger UI
```

**Not Implemented:** Auto-generated docs, versioning strategy (v1 API)

---

## Phase 24: Security Hardening
**Goal:** Production security checklist

**Create:**
```
Backend/src/security/
├── helmet.config.ts
├── cors.config.ts
└── sanitization.ts

.github/
└── dependabot.yml
```

**Implemented:**
```typescript
// helmet.config.ts
- Security headers (CSP, HSTS, etc.)
- Configure Helmet middleware

// cors.config.ts
- Strict CORS policy (whitelist origins)
- Credentials handling

// sanitization.ts
- mongo-sanitize for query injection
- xss-clean for XSS prevention
- hpp for parameter pollution

// Update dependencies:
- Audit with npm audit
- Update vulnerable packages
- Configure Dependabot for auto-PRs

// Environment:
- Validate all env vars on startup
- Fail fast if required vars missing
- Use secrets manager for production keys

// Rate limiting:
- Global rate limit (express-rate-limit)
- Per-endpoint limits
- Socket connection throttling
```

**Not Implemented:** WAF rules, DDoS mitigation (infrastructure), penetration testing

---

## Phase 25: Performance Optimization
**Goal:** Sub-100ms action latency, support 1000+ concurrent users

**Update:** `reducer.ts`, `roomCache.ts`, `socketServer.ts`

**Implemented:**
```typescript
// 1. State management
- Replace structuredClone with shallow copy + immutable updates
- Object pooling for frequently created objects (Card[])

// 2. Caching strategy
- Cache serialized GameState in Redis (avoid re-serialization)
- Write-through cache for room updates
- Use Redis pub/sub for room state sync across instances

// 3. Socket.IO tuning
- Enable WebSocket compression (perMessageDeflate)
- Use binary parser for large payloads
- Implement event batching (combine updates)

// 4. Database
- Add indexes: Game.roomId, User.socketId
- Use lean() queries (skip Mongoose hydration)
- Connection pooling tuned for expected load

// 5. Profiling
- performance.now() timers around hot paths
- Log slow operations (>50ms)
- Memory profiling to detect leaks

// Load test results:
- 1000 concurrent sockets: <100ms p99 latency
- 200 active games simultaneously
- <500MB memory per instance
```

**Not Implemented:** Horizontal scaling (single instance), CDN, DB sharding

---

## Phase 26: Production Readiness Checklist
**Goal:** Final validation before launch

**Create:**
```
DEPLOYMENT_CHECKLIST.md
RUNBOOK.md
SECURITY.md
```

**Verify:**

**Infrastructure:**
- [ ] MongoDB Atlas production cluster configured
- [ ] Upstash Redis production instance configured
- [ ] Environment variables documented and set
- [ ] SSL/TLS certificates valid
- [ ] Backup strategy implemented (daily DB snapshots)
- [ ] Monitoring dashboards configured

**Code:**
- [ ] All tests passing (unit + integration)
- [ ] TypeScript strict mode: no errors
- [ ] ESLint: zero warnings
- [ ] Test coverage >80%
- [ ] No console.log in production code
- [ ] Error handling comprehensive

**Security:**
- [ ] npm audit: zero vulnerabilities
- [ ] Secrets not committed to git
- [ ] CORS configured for production origin
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] Helmet security headers active

**Operations:**
- [ ] Health checks responding
- [ ] Metrics endpoint functional
- [ ] Logging structured and searchable
- [ ] Deployment script tested on staging
- [ ] Rollback procedure documented
- [ ] Database migration script tested

**Documentation:**
- [ ] README complete with setup instructions
- [ ] API documentation published
- [ ] Architecture diagram up-to-date
- [ ] Runbook for common issues
- [ ] Contributing guidelines (if open-source)

---

## Repository Final Structure
```
tarneeb-game/
├── .github/
│   ├── workflows/ci.yml
│   └── dependabot.yml
├── Backend/
│   ├── src/
│   │   ├── game/          # Core game logic (pure functions)
│   │   ├── types/         # Shared TypeScript types
│   │   ├── rooms/         # Multi-game room management
│   │   ├── models/        # MongoDB schemas
│   │   ├── services/      # Business logic layer
│   │   ├── socket/        # WebSocket handlers
│   │   ├── cache/         # Redis caching
│   │   ├── lib/           # External connections
│   │   ├── middleware/    # Express/Socket middleware
│   │   ├── routes/        # REST endpoints
│   │   ├── utils/         # Helpers
│   │   ├── __tests__/     # Integration tests
│   │   └── index.ts       # Entry point
│   ├── docs/              # Documentation
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── scripts/
│   ├── deploy.sh
│   └── migrate.sh
├── docker-compose.yml
├── .gitignore
├── README.md
├── LICENSE
├── DEPLOYMENT_CHECKLIST.md
├── RUNBOOK.md
└── SECURITY.md
```

---

## Development Commands
```bash
# Development
npm run dev          # Start dev server with hot reload
npm run typecheck    # Validate types without building
npm test             # Run all tests
npm run test:watch   # Watch mode for TDD

# Build & Production
npm run build        # Compile TypeScript
npm start            # Run production build
npm run lint         # ESLint check

# Testing
npm run test:integration  # Full game simulation
npm run test:load         # Load testing

# Docker
docker-compose up -d      # Start all services
npm run migrate           # Run DB migrations

# Security
npm audit                 # Security check
npm run audit:fix         # Auto-fix vulnerabilities
```

---

## Success Criteria
- ✅ 4-player game completes successfully via WebSocket events
- ✅ State persists across server restarts (Redis)
- ✅ Game history saved to MongoDB
- ✅ All tests pass with >80% coverage
- ✅ Load test: 1000 concurrent users, <100ms latency
- ✅ Zero critical vulnerabilities
- ✅ Documentation complete
- ✅ Deployed to production environment
- ✅ Monitoring dashboards active

**This backend is now ready for frontend integration or public API release.**
