// Frontend/types/room.types.ts
// Mirrors: Backend/src/types/room.types.ts
// SerializedRoom mirrors the shape returned by serializeRoom() in room.handler.ts

import type { GameState } from './game.types';
import { replaceRoomSnapshot } from '@/lib/state';

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
  myPlayerId: string | null;   // Stable player identity from server (NOT socket.id)
  availableRooms: SerializedRoom[];
  isLoading: boolean;
  error: { code: string; message: string } | null;
}

export type RoomAction =
  | { type: 'LOADING' }
  | { type: 'ROOM_JOINED'; roomId: string; room: SerializedRoom; myPlayerId: string }
  | { type: 'ROOM_UPDATED'; room: SerializedRoom }
  | { type: 'ROOM_LEFT' }
  | { type: 'ROOM_LIST_UPDATED'; rooms: SerializedRoom[] }
  | { type: 'ERROR'; error: { code: string; message: string } }
  | { type: 'CLEAR_ERROR' };

export const initialRoomState: RoomState = {
  roomId: null,
  room: null,
  myPlayerId: null,
  availableRooms: [],
  isLoading: false,
  error: null,
};

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };

    case 'ROOM_JOINED':
      // Full snapshot replacement via centralized utility, plus join-specific fields
      return {
        ...replaceRoomSnapshot(state, action.room),
        roomId: action.roomId,
        myPlayerId: action.myPlayerId,
      };

    case 'ROOM_UPDATED':
      // Full snapshot replacement — delegates to centralized utility, never merge
      return replaceRoomSnapshot(state, action.room);

    case 'ROOM_LEFT':
      return { ...initialRoomState, availableRooms: state.availableRooms };

    case 'ROOM_LIST_UPDATED':
      return { ...state, availableRooms: action.rooms };

    case 'ERROR':
      return { ...state, isLoading: false, error: action.error };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}