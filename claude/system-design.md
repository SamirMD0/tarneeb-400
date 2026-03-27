# System Design

## Server-Authoritative Architecture
The game heavily leverages a **server-authoritative model**. The client purely acts as a dumb terminal reporting what actions the player wants to execute, and rendering the exact UI state dictated by the server JSON payloads.
- Input actions are passed through Zod schemas.
- `GameEngine` ensures rule verification before applying generic reducers.
- The `reducer.ts` represents purely mathematical state conversions without side-effects.

## Real-time Communication
Real-time state uses `Socket.IO`.
- Clients receive monolithic payloads (`GameState` or `SerializedRoom`) on state mutation.
- Connections specify JWT tokens. `socket.data.playerId` stays stable even amidst disconnects.
- `RoomManager.ts` leverages `Redis` to gracefully retain room instances across deployments or node restarts.

## Scalability and Robustness
- **Redis Caching**: Debounced state savings minimize write-amplification to Redis while ensuring memory fault tolerance.
- **Monitoring**: Express + socket routes are wrapped with Prometheus metric timers (`game_action_duration`, etc.) allowing cluster observability.
- **Rate-Limiting**: Flexible global rate limiters throttle bad actors attempting to spam actions dynamically.
