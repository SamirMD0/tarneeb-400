# WebSocket Events Reference
Phase 23 API Documentation

## Client-to-Server Events

### Room Management
- **`create_room`**: `(config: RoomConfig, callback: (res: SuccessResponse<{ roomId: string }>) => void)`
  - Creates a new game room with custom config.
- **`join_room`**: `(roomId: string, callback: (res: SuccessResponse<{ room: RoomState }>) => void)`
  - Joins an existing room.
- **`leave_room`**: `(roomId: string, callback: (res: SuccessResponse<void>) => void)`
  - Leaves the current room.
- **`start_game`**: `(roomId: string, callback: (res: SuccessResponse<void>) => void)`
  - Initiates the game once 4 players are present.

### Game Actions
- **`game_action`**: `(action: GameAction, callback?: (res: SuccessResponse<void>) => void)`
  - Used for generalized game actions. Supported types:
    - `{ type: "BID", playerId: string, value: number }`
    - `{ type: "PASS", playerId: string }`
    - `{ type: "PLAY_CARD", playerId: string, card: Card }`
    - `{ type: "START_NEXT_ROUND" }`

### Specific Action Aliases
- **`place_bid`**: `(roomId: string, bidAction: BidAction, callback: (res: SuccessResponse<void>) => void)`
- **`pass_bid`**: `(roomId: string, playerId: string, callback: (res: SuccessResponse<void>) => void)`
- **`play_card`**: `(roomId: string, action: PlayCardAction, callback: (res: SuccessResponse<void>) => void)`

## Server-to-Client Events

### General
- **`error`**: `({ code: string, message: string })`
  - Emitted when an unhandled error occurs.
- **`disconnect`**: `(reason: string)`
  - Emitted when connection is lost.

### Room State
- **`room_created`**: `({ roomId: string, config: RoomConfig })`
  - Broadcast globally or to lobbies when a room is made.
- **`room_updated`**: `(rooms: RoomState[])`
  - Notifies lobby of changes in available rooms.
- **`room_state`**: `(room: RoomState)`
  - Full room synchronization sent to room members upon join/leave.

### Game State
- **`game_state`**: `(state: GameState)`
  - Broadcast to all users in a room whenever the game state mutates (reducing `GameAction`).
- **`player_joined`**: `(player: PlayerState)`
- **`player_left`**: `(playerId: string)`
- **`game_started`**: `()`
  - Signifies transition from Waiting/Lobby to Dealing phase.
- **`game_over`**: `({ winnerTeam: number, finalScore: object })`
  - End of game payload.
