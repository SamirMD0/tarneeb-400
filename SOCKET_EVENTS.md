# Socket.IO Events Documentation - Phase 17

This document describes the WebSocket events implemented in Phase 17 (WebSocket Foundation).

## Connection Events

### Server-Side

#### `connection`
Emitted when a client connects to the server.

**Handler**: Automatic (Socket.IO built-in)

**Actions**:
- Logs connection with socket ID
- Stores connection timestamp in `socket.data.connectedAt`
- Registers event listeners for the socket

---

#### `disconnect`
Emitted when a client disconnects from the server.

**Handler**: Automatic (Socket.IO built-in)

**Actions**:
- Logs disconnection with socket ID and reason
- Removes socket from all rooms
- Marks player as disconnected (if in a game room)
- Cleans up rate limit data

**Parameters**:
- `reason: string` - Disconnect reason (e.g., "transport close", "client namespace disconnect")

---

## Room Management Events

### Client → Server

#### `create_room`
Creates a new game room and adds the creator as the first player.

**Payload**:
```typescript
{
  config: {
    maxPlayers: number;      // Must be 4 for Tarneeb
    targetScore?: number;    // Optional, defaults to 41
  };
  playerName?: string;       // Optional, defaults to "Player_<socketId>"
}
```

**Success Response**: `room_created`

**Error Codes**:
- `INVALID_CONFIG` - Missing or invalid config.maxPlayers

---

#### `join_room`
Join an existing game room.

**Payload**:
```typescript
{
  roomId: string;            // Required
  playerName?: string;       // Optional, defaults to "Player_<socketId>"
}
```

**Success Response**: `room_joined`

**Broadcasts**: `player_joined` (to all other players in room)

**Error Codes**:
- `INVALID_ROOM_ID` - Missing or invalid roomId
- `ROOM_NOT_FOUND` - Room does not exist
- `ROOM_FULL` - Room already has 4 players
- `JOIN_FAILED` - Failed to add player to room

---

#### `leave_room`
Leave the current game room.

**Payload**:
```typescript
{}  // Empty object
```

**Success Response**: `room_left`

**Broadcasts**: `player_left` (to all remaining players in room)

**Error Codes**:
- `NOT_IN_ROOM` - Socket is not currently in a room

**Side Effects**:
- If room becomes empty, it is automatically deleted

---

#### `game_action`
Dispatch a game action to the game engine.

**Payload**:
```typescript
{
  action: GameAction;  // Any valid game action (e.g., BID, PLAY_CARD, etc.)
}
```

**Success Response**: `game_state_updated` (broadcast to all players)

**Error Codes**:
- `NOT_IN_ROOM` - Socket is not currently in a room
- `INVALID_ACTION` - Action payload is malformed
- `ROOM_NOT_FOUND` - Room does not exist
- `GAME_NOT_STARTED` - Game has not been started yet
- `INVALID_ACTION` - Game engine rejected the action

---

### Server → Client

#### `room_created`
Emitted to the creator after successfully creating a room.

**Payload**:
```typescript
{
  roomId: string;
  room: {
    id: string;
    players: Array<{
      id: string;
      name: string;
      isConnected: boolean;
    }>;
    config: RoomConfig;
    hasGame: boolean;
    gameState?: GameState;
  };
}
```

---

#### `room_joined`
Emitted to the joiner after successfully joining a room.

**Payload**:
```typescript
{
  roomId: string;
  room: SerializedRoom;  // Same structure as room_created
}
```

---

#### `room_left`
Emitted to the player after successfully leaving a room.

**Payload**:
```typescript
{
  roomId: string;
}
```

---

#### `player_joined`
Broadcast to all existing players when a new player joins the room.

**Payload**:
```typescript
{
  playerId: string;
  playerName: string;
  room: SerializedRoom;
}
```

---

#### `player_left`
Broadcast to all remaining players when a player leaves the room.

**Payload**:
```typescript
{
  playerId: string;
  room: SerializedRoom;
}
```

---

#### `player_disconnected`
Broadcast to all players when a player disconnects (not explicitly leaving).

**Payload**:
```typescript
{
  playerId: string;
  room: SerializedRoom;
}
```

**Note**: Player is marked as disconnected but not removed from the room (for reconnection support).

---

#### `game_state_updated`
Broadcast to all players in a room when the game state changes.

**Payload**:
```typescript
{
  roomId: string;
  gameState: GameState;
}
```

**Triggers**:
- After any successful game action dispatch
- State includes all game data (players, teams, phase, trick, scores, etc.)

---

## Error Events

### Server → Client

#### `error`
Emitted when any error occurs during event handling.

**Payload**:
```typescript
{
  code: string;    // Error code (e.g., "ROOM_NOT_FOUND")
  message: string; // Human-readable error message
}
```

**Common Error Codes**:

| Code | Description |
|------|-------------|
| `INVALID_CONFIG` | Room configuration is invalid |
| `INVALID_ROOM_ID` | Room ID is missing or invalid |
| `ROOM_NOT_FOUND` | Room does not exist |
| `ROOM_FULL` | Room has reached maximum capacity |
| `JOIN_FAILED` | Failed to join room |
| `NOT_IN_ROOM` | Operation requires being in a room |
| `INVALID_ACTION` | Game action is invalid or malformed |
| `GAME_NOT_STARTED` | Action requires an active game |
| `RATE_LIMIT_EXCEEDED` | Too many requests in a short time |
| `INVALID_PAYLOAD` | Event payload structure is invalid |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Middleware

### Authentication Middleware
**Status**: Placeholder (accepts all connections)

**Future Implementation**:
- Verify JWT token from `socket.handshake.auth.token`
- Reject unauthorized connections
- Store authenticated user ID in `socket.data.userId`

---

### Rate Limiting Middleware
**Configuration**:
- **Window**: 1 second
- **Max Actions**: 10 per window
- **Cleanup Interval**: 60 seconds

**Behavior**:
- Tracks actions per socket ID
- Emits `error` event with code `RATE_LIMIT_EXCEEDED` when limit exceeded
- Automatically resets after time window expires

---

### Error Boundary Middleware
**Behavior**:
- Wraps all event handlers in try-catch
- Catches exceptions and converts to structured error events
- Logs errors to console
- Prevents server crashes from handler errors

---

## Socket Data

Each socket connection stores metadata in `socket.data`:

```typescript
interface SocketData {
  roomId?: string;        // Current room ID (if in a room)
  playerId?: string;      // Player ID (usually same as socket ID)
  userId?: string;        // Authenticated user ID (from auth middleware)
  connectedAt?: number;   // Connection timestamp (milliseconds)
}
```

---

## Connection Configuration

### Server Settings
```typescript
{
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,      // 60 seconds
  pingInterval: 25000,     // 25 seconds
  connectTimeout: 45000,   // 45 seconds
}
```

---

## Example Event Sequences

### Creating and Joining a Room

```javascript
// Client 1 (Creator)
socket.emit('create_room', {
  config: { maxPlayers: 4 },
  playerName: 'Alice'
});

socket.on('room_created', (data) => {
  console.log('Room created:', data.roomId);
});

// Client 2 (Joiner)
socket.emit('join_room', {
  roomId: '<roomId>',
  playerName: 'Bob'
});

socket.on('room_joined', (data) => {
  console.log('Joined room:', data.roomId);
});

// Client 1 receives:
socket.on('player_joined', (data) => {
  console.log(`${data.playerName} joined the room`);
});
```

### Handling Errors

```javascript
socket.on('error', (data) => {
  console.error(`Error [${data.code}]: ${data.message}`);
});

socket.emit('join_room', {
  roomId: 'invalid_room',
  playerName: 'Charlie'
});

// Receives:
// { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' }
```

---

## Testing

Comprehensive tests are located in `Backend/src/socket/socket.test.ts`.

**Test Coverage**:
- Server initialization
- Connection/disconnection handling
- Event handler registration
- Error handling and validation
- Rate limiting enforcement
- Room broadcasting
- Concurrent connections

**Run Tests**:
```bash
npm test
```

---

## Future Enhancements (Phase 18+)

- Authentication with JWT tokens
- Reconnection logic with state recovery
- Spectator mode
- Chat messages
- Admin commands
- Detailed game event handlers (bidding, playing)