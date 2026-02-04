PHASE 18 – Socket Event Handlers (TODO)
Missing Core Implementation
[ ] Create bidding.handler.ts

File(s): Backend/src/socket/events/bidding.handler.ts
What's missing: Socket event handlers for bidding:

on('place_bid') → Dispatch BID, broadcast updated state
on('pass_bid') → Dispatch PASS, broadcast updated state
on('set_trump') → Dispatch SET_TRUMP, transition to PLAYING

Why it's needed: Complete bidding flow via WebSocket

[ ] Create playing.handler.ts

File(s): Backend/src/socket/events/playing.handler.ts
What's missing: Socket event handlers for playing cards:

on('play_card') → Validate, dispatch PLAY_CARD
Auto-trigger END_TRICK when 4 cards are played
Auto-trigger END_ROUND when 13 tricks are completed

Why it's needed: Automates trick and round transitions

[ ] Create room.handler.ts

File(s): Backend/src/socket/events/room.handler.ts
What's missing: Room lifecycle handlers:

on('create_room') → RoomManager.createRoom
on('join_room') → Room.addPlayer, cache room state
on('start_game') → Room.startGame, initialize engine
on('leave_room') → Handle disconnection cleanup

Why it's needed: Manages room creation and game startup over sockets

[ ] Create socket events index.ts

File(s): Backend/src/socket/events/index.ts
What's missing: Export and register all event handlers:

bidding.handler
playing.handler
room.handler

Why it's needed: Single entry point for socket event wiring

Missing Tests
[ ] Create socket.test.ts integration tests

File(s): Backend/src/socket/socket.test.ts
What's missing: Integration tests for socket events:

Full game simulation via socket events
Concurrent actions from multiple sockets
Invalid action rejection
State broadcast to all room members

Why it's needed: Validate WebSocket event flow end-to-end
