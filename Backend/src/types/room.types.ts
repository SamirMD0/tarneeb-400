// room.types.ts - Phase 2: Type System Foundation

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

// Full room state (used by RoomManager in Phase 14)
export interface RoomState {
  id: RoomID;
  phase: RoomPhase;
  players: Map<PlayerID, {
    name: string;
    isConnected: boolean;
  }>;
  config: RoomConfig;
  createdAt: Date;
}
