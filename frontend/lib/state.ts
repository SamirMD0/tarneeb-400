// Frontend/lib/state.ts
// Canonical state definitions for the entire app.
// Zero React dependencies — pure TypeScript.
//
// Three rules enforced unconditionally:
//   1. Snapshot replacement only. No deep merge. No Object.assign over old state.
//   2. Every factory/reset returns a fresh object literal. No shared references.
//   3. All initial state is defined here. Domain hooks import from here, not inline.
//      This prevents AppProvider and reducers from drifting apart on first-render shape.

import type { GameState } from '@/types/game.types';
import type { RoomState, SerializedRoom } from '@/types/room.types';
import { initialRoomState } from '@/types/room.types';

// ─── Connection state ─────────────────────────────────────────────────────────
// Owned exclusively by useConnectionState.
// Must never be mixed into GameStore or RoomState.

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;        // true from socket.connect() call until 'connect' fires
  reconnectAttempt: number;     // 0 when not reconnecting; increments on each attempt
  lastError: string | null;     // Last connect_error message; cleared on successful connect
  latencyMs: number | null;     // RTT from ping/pong; null until first measurement
}

export function makeInitialConnectionState(): ConnectionState {
  return {
    isConnected: false,
    isConnecting: false,
    reconnectAttempt: 0,
    lastError: null,
    latencyMs: null,
  };
}

// ─── Game store ───────────────────────────────────────────────────────────────
// Owned by useGameState via gameStateReducer.
// gameState field is ALWAYS a full server snapshot or null — never partially updated.

export interface GameStore {
  gameState: GameState | null;
  gameOver: { winner: 1 | 2; finalScore: unknown } | null;
  lastError: { code: string; message: string } | null;
}

export function makeInitialGameStore(): GameStore {
  return {
    gameState: null,
    gameOver: null,
    lastError: null,
  };
}

// ─── Snapshot replacement utilities ──────────────────────────────────────────
//
// These are the ONLY sanctioned ways to update server-authoritative state.
// Using spread/merge directly in a reducer is explicitly forbidden because:
//   - A field absent in the new snapshot is intentionally absent, not to be preserved.
//   - Merging old fields allows client state to diverge from server truth silently.
//
// Both functions are pure — they take current state and a server snapshot and
// return a new state object. They do not mutate.

export function replaceGameSnapshot(
  store: GameStore,
  snapshot: GameState
): GameStore {
  return {
    gameState: snapshot,  // full replacement — old gameState fields are discarded entirely
    gameOver: store.gameOver,
    lastError: null,      // snapshot arrival always clears the last action error
  };
}

export function replaceRoomSnapshot(
  state: RoomState,
  snapshot: SerializedRoom
): RoomState {
  return {
    ...state,
    room: snapshot,       // full replacement — old room fields are discarded entirely
    isLoading: false,
    error: null,
  };
}

// ─── Reset helpers ─────────────────────────────────────────────────────────────
//
// Called by AppProvider on 'disconnect' and on 'room_left'.
// Each function allocates a fresh object — no reference reuse that could cause
// components subscribed to the old reference to skip re-render.

export function resetRoomState(): RoomState {
  return { ...initialRoomState };
}

export function resetGameStore(): GameStore {
  return makeInitialGameStore();
}

export function resetConnectionState(): ConnectionState {
  return makeInitialConnectionState();
}

// ─── AppState ─────────────────────────────────────────────────────────────────
// The shape surfaced by AppContext. Composed from the three domain slices.
// Each slice is independent — a reset of one does not affect the others.

export interface AppState {
  connection: ConnectionState;
  room: RoomState;
  game: GameStore;
}

export function makeInitialAppState(): AppState {
  return {
    connection: makeInitialConnectionState(),
    room: resetRoomState(),
    game: makeInitialGameStore(),
  };
}

// ─── AppDispatchers ────────────────────────────────────────────────────────────
// The controlled action surface exposed through AppContext.
// Components may call these; they must never call socket.emit directly.
// The concrete implementations are provided by AppProvider via the domain hooks.

export interface RoomDispatchers {
  createRoom: (config: import('@/types/room.types').RoomConfig, playerName?: string) => void;
  joinRoom: (roomId: string, playerName?: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
}

export interface GameDispatchers {
  placeBid: (value: number) => void;
  passBid: () => void;
  selectTrump: (suit: import('@/types/game.types').Suit) => void;
  playCard: (card: import('@/types/game.types').Card) => void;
}

export interface ConnectionDispatchers {
  connect: () => void;
  disconnect: () => void;
}

export interface AppDispatchers {
  room: RoomDispatchers;
  game: GameDispatchers;
  connection: ConnectionDispatchers;
}