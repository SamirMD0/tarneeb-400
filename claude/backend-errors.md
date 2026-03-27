# Tarneeb 400 - Backend Errors Fixed

## 1. Mongoose / TypeScript Type Stripping
**Issue**: Mongoose Document `_id` types and optional string schemas caused `string | undefined` compilation errors in `auth.service.ts` when strictly checking against the Zod schema and `AuthResponse` definitions.
**Fix**: Added explicit `as string` casts upon retrieval of `user._id`, `user.name`, and `user.email` for `login` and `register` since validation guarantees their presence.

## 2. Testing Typo (Socket ID Reference)
**Issue**: In `concurrent.test.ts`, the `pickCard(currentSocket.id!, state)` invocation was passing a string rather than the expected `ClientSocket` object.
**Fix**: Changed the parameter to pass the underlying `ClientSocket` object directly: `pickCard(currentSocket, state)`.

## 3. Pure State Mutation in Redux-like Reducer (Tricks Won)
**Issue**: `resolveTrick` in `src/game/rules.ts` was an impure function mutating `state.teams[winner.teamId].tricksWon += 1` instead of returning the delta for the reducer to apply, violating the immutable state principle.
**Fix**: `resolveTrick` changed to pure function returning `{ winnerId, winnerTeamId }`. `END_TRICK` action handler modified to apply the trick increment via object spread.

## 4. Missing Round Restart Flow
**Issue**: After 13 tricks, the game entered `SCORING` phase but lacked a built-in mechanism or action to automatically progress to a new round, permanently halting the game loop.
**Fix**: Introduced a `START_NEXT_ROUND` action added to `actions.ts` schemas, integrated in `reducer.ts`, and automatically queued in `playing.handler.ts` after the `END_ROUND` emission with a 3-second delay.

## 5. Duplicate Socket Connection Listener
**Issue**: `io.on('connection')` was defined both in `socketServer.ts` and encapsulated inside `registerHandlers` in `socketHandlers.ts`, which attached handlers redundantly.
**Fix**: Removed the duplicate wrapper from `socketServer.ts`, allowing `socketHandlers.ts` sole ownership of the connection lifecycle.

## 6. Unused Legacy Endpoints
**Issue**: `scoring.ts` existed as an empty, dead file.
**Fix**: Cleaned up and removed the file.
