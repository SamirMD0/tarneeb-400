# API Documentation - Phase 15

## Game Schema

The `Game` model stores completed game history in MongoDB.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `roomId` | string | Room identifier where game was played |
| `playerIds` | string[] | Array of 4 player socket IDs |
| `winner` | 1 \| 2 | Winning team number |
| `finalScore.team1` | number | Team 1's final score |
| `finalScore.team2` | number | Team 2's final score |
| `rounds` | RoundSnapshot[] | Round-by-round history |
| `startedAt` | Date | Game start timestamp |
| `endedAt` | Date | Game end timestamp |

### RoundSnapshot

| Field | Type | Description |
|-------|------|-------------|
| `roundNumber` | number | Sequential round number |
| `bidderId` | string | Player who won the bid |
| `bidValue` | number | Winning bid (7-13) |
| `trumpSuit` | Suit | Trump suit for the round |
| `tricksWon.team1` | number | Tricks won by team 1 |
| `tricksWon.team2` | number | Tricks won by team 2 |
| `scoreDeltas.team1` | number | Points gained/lost by team 1 |
| `scoreDeltas.team2` | number | Points gained/lost by team 2 |

---

## User Schema

The `User` model tracks player statistics.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `socketId` | string | Unique player identifier |
| `username` | string | Display name |
| `gamesPlayed` | number | Total games completed |
| `wins` | number | Total games won |
| `createdAt` | Date | Account creation timestamp |

---

## Endpoints

### GET /health

Returns server health status including MongoDB stats.

#### Response

```json
{
  "status": "healthy",
  "mongo": true,
  "redis": true,
  "timestamp": "2026-02-02T16:00:00.000Z",
  "mongoStats": {
    "isConnected": true,
    "version": "7.0.0",
    "poolSize": 10,
    "host": "localhost"
  },
  "uptime": 3600
}
```
