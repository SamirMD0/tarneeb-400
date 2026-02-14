PHASE 15 – MongoDB Integration (TODO)
Missing Core Implementation
[ ] Create Game.model.ts schema

File(s): Backend/src/models/Game.model.ts
What's missing: Complete Mongoose schema for persisting game history
Why it's needed: Phase 15 requires storing completed games with roomId, playerIds, winner, finalScore, rounds[], startedAt, endedAt fields

[ ] Create User.model.ts schema

File(s): Backend/src/models/User.model.ts
What's missing: User schema with socketId, username, gamesPlayed, wins, createdAt
Why it's needed: Track player statistics and game participation across sessions

[ ] Create models/index.ts barrel export

File(s): Backend/src/models/index.ts
What's missing: Central export point for all Mongoose models
Why it's needed: Clean import pattern and model registration

[ ] Implement gameHistory.service.ts

File(s): Backend/src/services/gameHistory.service.ts
What's missing: Three core methods:

saveGame(roomId: string, gameState: GameState): Promise<void>
getGameHistory(userId: string): Promise<Game[]>
getLeaderboard(): Promise<LeaderboardEntry[]>


Why it's needed: Business logic layer for game persistence operations

[ ] Create gameHistory.service.test.ts

File(s): Backend/src/services/gameHistory.service.test.ts
What's missing: Comprehensive tests covering:

Save game after END_ROUND
Retrieve user history pagination
Leaderboard query sorting and limits
Error handling for invalid data


Why it's needed: Verify persistence layer correctness before production

Missing MongoDB Connection Infrastructure
[ ] Enhance mongoose.ts connection handling

File(s): Backend/src/lib/mongoose.ts
What's missing: While basic connection exists, Phase 15 requires:

Connection pooling configuration (maxPoolSize, minPoolSize)
Retry logic with exponential backoff
Graceful shutdown handler
Connection state event listeners (error, disconnected, reconnected)


Why it's needed: Production-grade resilience and observability

[ ] Add MongoDB health check to health route

File(s): Backend/src/routes/health.ts
What's missing: Health endpoint already calls pingMongo(), but needs to include:

MongoDB version info
Connection pool stats
Replica set status (if applicable)


Why it's needed: Comprehensive health reporting for monitoring systems

Missing Integration Points
[ ] Integrate game persistence trigger in GameEngine

File(s): Backend/src/game/engine.ts
What's missing: Hook to call gameHistory.saveGame() when:

Game reaches GAME_OVER phase
isGameOver() returns true


Why it's needed: Automatic persistence without manual triggers

[ ] Add Room ID to GameEngine constructor

File(s): Backend/src/game/engine.ts, Backend/src/game/state.ts
What's missing: GameEngine needs roomId parameter to associate games with rooms for persistence
Why it's needed: Link game history to room context

[ ] Update Room.startGame() to pass roomId

File(s): Backend/src/rooms/room.ts
What's missing: Pass this.id to new GameEngine(playerIds, this.id)
Why it's needed: Enable game-room association for history tracking

Missing Data Models & Types
[ ] Define RoundSnapshot type

File(s): Backend/src/types/game.types.ts or Backend/src/models/Game.model.ts
What's missing: Type/schema for round history:

typescript  {
    roundNumber: number
    bidderId: string
    bidValue: number
    trumpSuit: Suit
    tricksWon: { team1: number, team2: number }
    scoreDeltas: { team1: number, team2: number }
  }

Why it's needed: Store detailed round-by-round progression

[ ] Define LeaderboardEntry type

File(s): Backend/src/types/player.types.ts or service file
What's missing:

typescript  interface LeaderboardEntry {
    userId: string
    username: string
    gamesPlayed: number
    wins: number
    winRate: number
  }

Why it's needed: Type-safe leaderboard queries

Missing Environment Configuration
[ ] Add MongoDB-specific environment variables

File(s): Backend/.env.example
What's missing: While MONGO_URI exists, add:

MONGO_MAX_POOL_SIZE (default: 10)
MONGO_MIN_POOL_SIZE (default: 2)
MONGO_RETRY_WRITES (default: true)
MONGO_WRITE_CONCERN (default: majority)


Why it's needed: Configurable connection tuning for different environments

Missing Documentation
[ ] Document Game schema in API.md

File(s): Backend/docs/API.md (create if missing)
What's missing: Schema documentation with field descriptions
Why it's needed: Developer reference for game history structure

[ ] Document gameHistory service in ARCHITECTURE.md

File(s): Backend/docs/ARCHITECTURE.md (create if missing)
What's missing: Data flow diagram showing:

GameEngine → gameHistory.service → MongoDB
Client → REST endpoint → gameHistory.service


Why it's needed: Architectural clarity for future developers