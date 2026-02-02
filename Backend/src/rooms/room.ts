// Backend/src/rooms/room.ts - PHASE 14 CORRECTED

import { GameEngine } from "../game/engine.js";
import { PlayerID } from "../types/player.types.js";
import { RoomConfig, RoomID } from "../types/room.types.js";

/**
 * Lobby-level player metadata (before game starts)
 * Distinct from GameState PlayerState which has hand, teamId, etc.
 */
interface LobbyPlayer {
  id: PlayerID;
  name: string;
  isConnected: boolean;
}

export class Room {
  public readonly id: RoomID;
  public readonly config: RoomConfig;
  public readonly players: Map<PlayerID, LobbyPlayer>;
  public gameEngine?: GameEngine;

  constructor(id: RoomID, config: RoomConfig) {
    this.id = id;
    this.config = config;
    this.players = new Map();
    this.gameEngine = undefined;
  }

  addPlayer(id: PlayerID, name: string): boolean {
    // Cannot add players once game started
    if (this.gameEngine) return false;
    
    // Room full
    if (this.players.size >= 4) return false;
    
    // Player already in room
    if (this.players.has(id)) return false;

    const player: LobbyPlayer = {
      id,
      name,
      isConnected: true,
    };

    this.players.set(id, player);
    return true;
  }

  removePlayer(id: PlayerID): boolean {
    if (!this.players.has(id)) return false;

    this.players.delete(id);

    // If a game is running, invalidate it immediately
    // In production, you might want to pause/handle reconnection instead
    if (this.gameEngine) {
      this.gameEngine = undefined;
    }

    return true;
  }

  isFull(): boolean {
    return this.players.size === 4;
  }

  isReady(): boolean {
    return this.players.size === 4 && !this.gameEngine;
  }

  startGame(): boolean {
    if (!this.isReady()) return false;

    const playerIds = [...this.players.keys()];

    // Double-check exactly 4 players
    if (playerIds.length !== 4) return false;

    // GameEngine handles creating PlayerState objects with cards, teams, etc.
    this.gameEngine = new GameEngine(playerIds);
    
    return true;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  /**
   * Mark player as disconnected (useful for reconnection logic)
   */
  markPlayerDisconnected(id: PlayerID): boolean {
    const player = this.players.get(id);
    if (!player) return false;

    player.isConnected = false;
    return true;
  }

  /**
   * Mark player as reconnected
   */
  markPlayerReconnected(id: PlayerID): boolean {
    const player = this.players.get(id);
    if (!player) return false;

    player.isConnected = true;
    return true;
  }

  /**
   * Get list of player names for UI display
   */
  getPlayerNames(): string[] {
    return [...this.players.values()].map(p => p.name);
  }

  /**
   * Check if all players are connected
   */
  allPlayersConnected(): boolean {
    return [...this.players.values()].every(p => p.isConnected);
  }
}