// player.types.ts - Phase 2: Type System Foundation

import { Card } from './game.types.js';

export type PlayerID = string;

// TeamID is strictly 1 or 2 for Tarneeb (2 teams of 2 players each)
export type TeamID = 1 | 2;

export interface PlayerState {
  id: PlayerID;
  name: string;
  hand: Card[];
  teamId: TeamID;
  
}

export interface TeamState {
  tricksWon: number;
  score: number;
}
