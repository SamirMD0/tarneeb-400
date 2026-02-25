// Frontend/types/socket.types.ts
// Exact mirror of Backend/src/types/socket.types.ts
// Do NOT invent events. All names and payloads verified against backend source.

import type { GameState } from './game.types';
import type { SerializedRoom, RoomConfig } from './room.types';

// ─── Client → Server ──────────────────────────────────────────────────────────

export interface ClientToServerEvents {
  // Room lifecycle — room.handler.ts
  create_room: (data: { config: RoomConfig; playerName?: string }) => void;
  join_room: (data: { roomId: string; playerName?: string; playerId?: string }) => void;
  leave_room: (data: Record<string, never>) => void;
  start_game: (data: Record<string, never>) => void;
  refresh_room_list: (data: Record<string, never>) => void;

  // Bidding — bidding.handler.ts
  place_bid: (data: { value: number }) => void;
  pass_bid: (data: Record<string, never>) => void;
  set_trump: (data: { suit: string }) => void;

  // Playing — playing.handler.ts
  play_card: (data: { card: { suit: string; rank: string } }) => void;
}

// ─── Server → Client ──────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  // Room events — include myPlayerId so client knows its stable identity
  room_created: (data: { roomId: string; room: SerializedRoom; myPlayerId: string }) => void;
  room_joined: (data: { roomId: string; room: SerializedRoom; myPlayerId: string }) => void;
  room_left: (data: { roomId: string }) => void;
  room_list_updated: (data: { rooms: SerializedRoom[] }) => void;

  // Player presence events — room.handler.ts
  player_joined: (data: { playerId: string; playerName: string; room: SerializedRoom }) => void;
  player_left: (data: { playerId: string; room: SerializedRoom }) => void;
  player_disconnected: (data: { playerId: string; room: SerializedRoom }) => void;
  player_reconnected: (data: { playerId: string; room: SerializedRoom }) => void;

  // Game events — all handlers emit game_state_updated after every accepted action
  game_started: (data: { roomId: string; gameState: GameState }) => void;
  game_state_updated: (data: { roomId: string; gameState: GameState }) => void;
  game_over: (data: { roomId: string; winner: 1 | 2; finalScore: { team1: number; team2: number } }) => void;

  // Error — emitted directly to the acting socket on rejected actions
  error: (data: { code: string; message: string }) => void;
}