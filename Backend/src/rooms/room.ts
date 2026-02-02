// Backend/src/rooms/room.ts - PHASE 14 CORRECTED

import { GameEngine } from "../game/engine.js";
import { PlayerID } from "../types/player.types.js";
import { RoomConfig, RoomID } from "../types/room.types.js";
import { roomCache } from "../cache/roomCache.js";

/**
 * Lobby-level player metadata (before game starts)
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
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 1000;

  constructor(id: RoomID, config: RoomConfig) {
    this.id = id;
    this.config = config;
    this.players = new Map();
    this.gameEngine = undefined;
  }

  /**
   * Persist room state to cache (debounced or immediate)
   * Fire-and-forget logic to prevent blocking consistency updates from crashing flow
   */
  private async saveState(immediate = false): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    const save = async () => {
      try {
        await roomCache.cacheRoom(this);
      } catch (error) {
        console.error(`Failed to cache room ${this.id}:`, error);
      }
    };

    if (immediate) {
      await save();
    } else {
      this.saveTimeout = setTimeout(save, this.DEBOUNCE_MS);
    }
  }

  async addPlayer(id: PlayerID, name: string): Promise<boolean> {
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
    await this.saveState(true); // Immediate save for lobby changes
    return true;
  }

  async removePlayer(id: PlayerID): Promise<boolean> {
    if (!this.players.has(id)) return false;

    this.players.delete(id);

    // If a game is running, invalidate it immediately
    // In production, you might want to pause/handle reconnection instead
    if (this.gameEngine) {
      this.gameEngine = undefined;
    }

    await this.saveState(true);
    return true;
  }

  isFull(): boolean {
    return this.players.size === 4;
  }

  isReady(): boolean {
    return this.players.size === 4 && !this.gameEngine;
  }

  async startGame(): Promise<boolean> {
    if (!this.isReady()) return false;

    const playerIds = [...this.players.keys()];

    // Double-check exactly 4 players
    if (playerIds.length !== 4) return false;

    // GameEngine handles creating PlayerState objects with cards, teams, etc.
    this.gameEngine = new GameEngine(playerIds, this.id);

    // Subscribe to game engine updates for debounced caching
    this.gameEngine.subscribe(() => {
      this.saveState(false); // Debounced save for game actions
    });

    await this.saveState(true); // Immediate save on start
    return true;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  /**
   * Mark player as disconnected (useful for reconnection logic)
   */
  async markPlayerDisconnected(id: PlayerID): Promise<boolean> {
    const player = this.players.get(id);
    if (!player) return false;

    player.isConnected = false;
    await this.saveState(true);
    return true;
  }

  /**
   * Mark player as reconnected
   */
  async markPlayerReconnected(id: PlayerID): Promise<boolean> {
    const player = this.players.get(id);
    if (!player) return false;

    player.isConnected = true;
    await this.saveState(true);
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