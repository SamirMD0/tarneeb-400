PHASE 17 – WebSocket Foundation (TODO)
Missing Core Implementation
[ ] Create socketServer.ts

File(s): Backend/src/socket/socketServer.ts
What's missing: Initialize Socket.IO server with:

CORS configuration
Attach Socket.IO to Express HTTP server
Connection and disconnection logging

Why it's needed: Establishes the WebSocket server foundation

[ ] Create socketMiddleware.ts

File(s): Backend/src/socket/socketMiddleware.ts
What's missing: Socket middleware features:

Authentication middleware placeholder
Per-socket rate limiting
Error boundary wrapper for socket handlers

Why it's needed: Provides baseline security and stability

[ ] Create socketHandlers.ts

File(s): Backend/src/socket/socketHandlers.ts
What's missing: Core socket event handlers:

'join_room' → Add player, emit room_state
'leave_room' → Remove player, notify others
'game_action' → Validate, dispatch, broadcast
Error handling and validation for all events

Why it's needed: Enables room lifecycle and game actions via sockets

Missing Integration
[ ] Integrate Socket.IO server into index.ts

File(s): Backend/src/index.ts
What's missing: Wire Socket.IO into the Express app:

Initialize Socket.IO server
Attach middleware and handlers
Include websocket status in health endpoint

Why it's needed: Ensures WebSocket is live in the API server

Missing Tests
[ ] Add socket foundation tests

File(s): Backend/src/socket/socket.test.ts (or equivalent)
What's missing: Tests covering:

Socket server initialization
Connection/disconnection events
Handler registration for join/leave/game_action
Validation/error paths for invalid payloads

Why it's needed: Verify the WebSocket foundation is stable
