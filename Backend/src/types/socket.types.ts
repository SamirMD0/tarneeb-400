// Backend/src/types/socket.types.ts - Phase 17: Socket Event Types

import type { GameState } from '../game/state.js';
import type { GameAction } from '../game/actions.js';
import type { RoomConfig, LobbyPlayer } from './room.types.js';

// ─── Broadcast-safe game state (deck stripped) ──────────────────────────────
export type SanitizedGameState = Omit<GameState, 'deck'>;

// ─── Serialized room snapshot for client transmission ───────────────────────
export interface SerializedRoom {
  id: string;
  players: LobbyPlayer[];
  config: RoomConfig;
  hasGame: boolean;
  gameState?: SanitizedGameState;
}

/**
 * Events sent from client to server
 */
export interface ClientToServerEvents {
  // Room management
  create_room: (data: { config: RoomConfig; playerName?: string }) => void;
  join_room: (data: { roomId: string; playerName?: string; playerId?: string }) => void;
  leave_room: (data: {}) => void;
  start_game: (data: {}) => void;
  refresh_room_list: (data: {}) => void;

  // Game actions
  game_action: (data: { action: GameAction }) => void;

  // Bidding (Phase 18)
  place_bid: (data: { value: number }) => void;
  pass_bid: (data: {}) => void;
  set_trump: (data: { suit: string }) => void;

  // Playing (Phase 18)
  play_card: (data: { card: { suit: string; rank: string } }) => void;
}

/**
 * Events sent from server to client
 */
export interface ServerToClientEvents {
  // Room events — include myPlayerId so client knows its stable identity
  room_created: (data: { roomId: string; room: SerializedRoom; myPlayerId: string }) => void;
  room_joined: (data: { roomId: string; room: SerializedRoom; myPlayerId: string }) => void;
  room_left: (data: { roomId: string }) => void;
  room_list_updated: (data: { rooms: SerializedRoom[] }) => void;

  // Player events
  player_joined: (data: { playerId: string; playerName: string; room: SerializedRoom }) => void;
  player_left: (data: { playerId: string; room: SerializedRoom }) => void;
  player_disconnected: (data: { playerId: string; room: SerializedRoom }) => void;
  player_reconnected: (data: { playerId: string; room: SerializedRoom }) => void;

  // Game events — SanitizedGameState (no deck)
  game_started: (data: { roomId: string; gameState: SanitizedGameState }) => void;
  game_state_updated: (data: { roomId: string; gameState: SanitizedGameState }) => void;
  game_over: (data: { roomId: string; winner: 1 | 2; finalScore: { team1: number; team2: number } }) => void;

  // Error events
  error: (data: { code: string; message: string }) => void;
}

/**
 * Socket data stored per connection
 */
export interface SocketData {
  roomId?: string;
  playerId?: string;  // stable player identity (userId from auth, NOT socket.id)
  userId?: string;
  connectedAt?: number;
}