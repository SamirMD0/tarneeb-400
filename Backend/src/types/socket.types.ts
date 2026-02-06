// Backend/src/types/socket.types.ts - Phase 17: Socket Event Types

import type { GameState } from '../game/state.js';
import type { GameAction } from '../game/actions.js';
import type { RoomConfig } from './room.types.js';

/**
 * Events sent from client to server
 */
export interface ClientToServerEvents {
  // Room management
  create_room: (data: { config: RoomConfig; playerName?: string }) => void;
  join_room: (data: { roomId: string; playerName?: string }) => void;
  leave_room: (data: {}) => void;
  start_game: (data: {}) => void;
  
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
  // Room events
  room_created: (data: { roomId: string; room: any }) => void;
  room_joined: (data: { roomId: string; room: any }) => void;
  room_left: (data: { roomId: string }) => void;
  
  // Player events
  player_joined: (data: { playerId: string; playerName: string; room: any }) => void;
  player_left: (data: { playerId: string; room: any }) => void;
  player_disconnected: (data: { playerId: string; room: any }) => void;
  player_reconnected: (data: { playerId: string; room: any }) => void;
  
  // Game events
  game_started: (data: { roomId: string; gameState: GameState }) => void;
  game_state_updated: (data: { roomId: string; gameState: GameState }) => void;
  game_over: (data: { roomId: string; winner: 1 | 2; finalScore: any }) => void;
  
  // Error events
  error: (data: { code: string; message: string }) => void;
}

/**
 * Socket data stored per connection
 */
export interface SocketData {
  roomId?: string;
  playerId?: string;
  userId?: string;
  connectedAt?: number;
}