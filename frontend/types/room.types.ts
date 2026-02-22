// Frontend/types/room.types.ts
// Mirrors: Backend/src/types/room.types.ts
// SerializedRoom mirrors the shape returned by serializeRoom() in room.handler.ts

import type { GameState } from './game.types';

export type RoomPhase = 'WAITING' | 'IN_GAME' | 'FINISHED';

// Mirrors Backend/src/types/room.types.ts → RoomConfig
export interface RoomConfig {
  maxPlayers: number;
  targetScore?: number;
  allowBots?: boolean;
  timePerTurn?: number;
}

// Mirrors Backend/src/types/room.types.ts → LobbyPlayer
export interface LobbyPlayer {
  id: string;
  name: string;
  isConnected: boolean;
}

// Shape returned by serializeRoom() in Backend/src/sockets/events/room.handler.ts:
//   { id, players: Array.from(room.players.values()), config, hasGame, gameState? }
export interface SerializedRoom {
  id: string;
  players: LobbyPlayer[];
  config: RoomConfig;
  hasGame: boolean;
  gameState?: GameState;
}

// ─── Frontend-only room UI state (owned by useRoom reducer) ───────────────────

export interface RoomState {
  roomId: string | null;
  room: SerializedRoom | null;
  myPlayerId: string | null;   // Captured from room_created / room_joined response (socket.id)
  isLoading: boolean;
  error: { code: string; message: string } | null;
}

export type RoomAction =
  | { type: 'LOADING' }
  | { type: 'ROOM_JOINED'; roomId: string; room: SerializedRoom; myPlayerId: string }
  | { type: 'ROOM_UPDATED'; room: SerializedRoom }
  | { type: 'ROOM_LEFT' }
  | { type: 'ERROR'; error: { code: string; message: string } }
  | { type: 'CLEAR_ERROR' };

export const initialRoomState: RoomState = {
  roomId: null,
  room: null,
  myPlayerId: null,
  isLoading: false,
  error: null,
};

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };

    case 'ROOM_JOINED':
      return {
        ...state,
        roomId: action.roomId,
        room: action.room,
        myPlayerId: action.myPlayerId,
        isLoading: false,
        error: null,
      };

    case 'ROOM_UPDATED':
      return { ...state, room: action.room, isLoading: false };

    case 'ROOM_LEFT':
      return { ...initialRoomState };

    case 'ERROR':
      return { ...state, isLoading: false, error: action.error };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}