# Tarneeb 400 - Project Overview

## Description
A comprehensive, full-stack implementation of the popular middle-eastern trick-taking card game Tarneeb (scoring variation up to 41/400).

## Technology Stack
- **Backend**: Node.js, Express, Socket.IO, Mongoose (MongoDB), Redis (Caching), Prom-Client (Metrics), Zod (Validation), JWT (Auth).
- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Socket.IO Client.

## Game Flow
1. **Lobby & Rooms**: Player registers/logs in → Connects to Socket → Calls `create_room` or `join_room`.
2. **Dealing phase**: Engine deals 13 cards to 4 players. Phase is `BIDDING`.
3. **Bidding phase**: Players successively place bids or pass (minimum individual bid rules). Winner dictates `trumpSuit`.
4. **Playing Phase**: Winner leads. Engine strict-checks `canPlayCard` (follow suit). Auto-resolves tricks when 4 cards map.
5. **Scoring Phase**: After 13th trick, `END_ROUND` computes bidder score/penalty and opposing team score.
6. **Next Round**: Auto-transition `START_NEXT_ROUND` begins the loop anew until target score (41 or 400) is hit.

## Endpoints & Socket Events

### API (HTTP)
- `POST /api/auth/register` (Name, Email, Password -> JWT)
- `POST /api/auth/login` (Email, Password -> JWT)
- `GET /api/health` -> Status 200 OK
- `GET /metrics` -> Prometheus output

### WebSockets
**Client -> Server**
- `create_room`
- `join_room`
- `leave_room`
- `start_game`
- `place_bid`
- `pass_bid`
- `set_trump`
- `play_card`

**Server -> Client**
- `room_created`, `room_joined`, `room_left`
- `player_joined`, `player_left`, `player_disconnected`, `player_reconnected`
- `game_started`, `game_state_updated`, `game_over`
- `error`
