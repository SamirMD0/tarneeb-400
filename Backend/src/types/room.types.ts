// Backend/src/types/room.types.ts - PHASE 14 CORRECTED

import { PlayerID } from './player.types.js';

export type RoomID = string;

// Room lifecycle phases (different from GamePhase)
export type RoomPhase = 
  | 'WAITING'      // Waiting for players to join
  | 'IN_GAME'      // Game is active
  | 'FINISHED';    // Game completed

export interface RoomConfig {
  maxPlayers: number;         // Always 4 for Tarneeb
  targetScore?: number;       // Win condition (default: 41)
  allowBots?: boolean;        // Future feature
  timePerTurn?: number;       // Seconds (optional)
}

/**
 * Lobby-level player representation
 * Used in Room class before game starts
 * Separate from GameState PlayerState
 */
export interface LobbyPlayer {
  id: PlayerID;
  name: string;
  isConnected: boolean;
}

/**
 * Full room state (used by RoomManager in Phase 14)
 * This is what gets serialized to Redis/broadcast via Socket.IO
 */
export interface RoomState {
  id: RoomID;
  phase: RoomPhase;
  players: LobbyPlayer[];     // Changed from Map for JSON serialization
  config: RoomConfig;
  createdAt: Date;
  gameStarted: boolean;
}