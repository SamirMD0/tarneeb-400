// Backend/src/cache/roomCache.ts - Phase 16: Redis Caching Layer

import { Room } from '../rooms/room.js';
import { GameEngine } from '../game/engine.js';
import { redis } from '../lib/redis.js';
import type { RoomID } from '../types/room.types.js';

const KEY_PREFIX = 'room:';
const TTL_WAITING = 60 * 60; // 1 hour
const TTL_PLAYING = 60 * 60 * 24; // 24 hours
const TTL_FINISHED = 60 * 5; // 5 minutes

export const roomCache = {
    /**
     * Serializes Room object to JSON-safe structure
     */
    serialize(room: Room): string {
        try {
            const data = {
                id: room.id,
                config: room.config,
                players: Array.from(room.players.entries()),
                hasGame: !!room.gameEngine,
                gameState: room.gameEngine ? room.gameEngine.getState() : undefined,
                updatedAt: Date.now(),
            };
            return JSON.stringify(data);
        } catch (error) {
            console.error(`Failed to serialize room ${room.id}:`, error);
            throw error;
        }
    },

    /**
     * Deserializes JSON to Room object
     */
    deserialize(json: string): Room | null {
        try {
            const data = JSON.parse(json);
            const room = new Room(data.id, data.config);

            if (Array.isArray(data.players)) {
                data.players.forEach(([id, player]: [string, unknown]) => {
                    room.players.set(id, player as { id: string; name: string; isConnected: boolean });
                });
            }

            if (data.gameState && data.hasGame) {
                const playerIds = data.gameState.players.map((p: { id: string }) => p.id);
                room.gameEngine = new GameEngine(playerIds, data.id);
                (room.gameEngine as unknown as { state: unknown }).state = data.gameState;
            }

            return room;
        } catch (error) {
            console.error('Failed to deserialize room:', error);
            return null;
        }
    },

    async cacheRoom(room: Room): Promise<void> {
        const client = redis.getClient();
        if (!client) return;

        const key = `${KEY_PREFIX}${room.id}`;
        const serialized = roomCache.serialize(room);

        let ttl = TTL_WAITING;
        if (room.gameEngine) {
            ttl = room.gameEngine.isGameOver() ? TTL_FINISHED : TTL_PLAYING;
        }

        try {
            await client.set(key, serialized, { EX: ttl });
        } catch (error) {
            console.error(`Failed to cache room ${room.id}:`, error);
        }
    },

    async getRoom(id: RoomID): Promise<Room | undefined> {
        const client = redis.getClient();
        if (!client) return undefined;

        try {
            const json = await client.get(`${KEY_PREFIX}${id}`);
            if (!json) return undefined;

            const room = roomCache.deserialize(json);
            return room || undefined;
        } catch (error) {
            console.error(`Failed to get room ${id} from cache:`, error);
            return undefined;
        }
    },

    async deleteRoom(id: RoomID): Promise<void> {
        const client = redis.getClient();
        if (!client) return;

        try {
            await client.del(`${KEY_PREFIX}${id}`);
        } catch (error) {
            console.error(`Failed to delete room ${id} from cache:`, error);
        }
    },

    async getAllActiveRooms(): Promise<Room[]> {
        const client = redis.getClient();
        if (!client) return [];

        const rooms: Room[] = [];
        let cursor = 0;

        try {
            do {
                const result = await client.scan(cursor, {
                    MATCH: `${KEY_PREFIX}*`,
                    COUNT: 100
                });

                cursor = result.cursor;
                const keys = result.keys;

                if (keys.length > 0) {
                    const values = await client.mGet(keys);
                    values.forEach((json: string | null) => {
                        if (json) {
                            const room = roomCache.deserialize(json);
                            if (room) rooms.push(room);
                        }
                    });
                }
            } while (cursor !== 0);
        } catch (error) {
            console.error('Failed to scan active rooms:', error);
        }

        return rooms;
    }
};
