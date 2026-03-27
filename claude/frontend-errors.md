# Tarneeb 400 - Frontend Errors Fixed

## 1. Missing Authentication Token on Socket Init
**Issue**: `socketSingleton.ts` configured the Socket.IO client, but failed to extract the `tarneeb_token` from local storage and pass it via the `auth: { token }` handshake payload. The backend `authMiddleware` would invariably reject the connection.
**Fix**: Imported `tokenStorage` generated in `auth.ts` and appended it to the initialization dictionary as `auth: (cb) => { cb({ token: tokenStorage.get() }) }`.

## 2. Invalid Snapshot Merging Practices
**Issue**: Although structurally not causing compile-time errors, the previous usage of snapshot merging (`...state`) with the server payload could let client state diverge silently from server truth.
**Fix**: Reinforced adherence to snapshot replacement exclusively, utilizing the exact `DerivedGameView` and domain hooks (`useGameState`, `useRoomState`) to entirely overwrite the `room` and `gameState` objects over time.

## 3. Strict Mode Double Mount Resiliency (General Review)
**Issue**: React 18+ strict-mode double-mount forces side effects to run twice. If `useSocket` ran twice, it could initialize multiple socket bindings.
**Fix**: Utilized `socketSingleton.ts` properly using dependency guards so that listeners are added exactly once, and connection is driven by `useConnectionState.ts` reducer pattern.
