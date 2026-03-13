// Backend/src/cache/roomCache.ts - Phase 16: Redis Caching Layer

import { Room } from '../rooms/room.js';
import { GameEngine } from '../game/engine.js';
import { redis } from '../lib/redis.js';
import type { RoomID } from '../types/room.types.js';
import { logger } from '../lib/logger.js';

const KEY_PREFIX = 'room:';
const ACTIVE_ROOMS_SET = 'active_rooms';

const TTL_WAITING = 60 * 60;       // 1 hour
const TTL_PLAYING = 60 * 60 * 24;  // 24 hours
const TTL_FINISHED = 60 * 5;       // 5 minutes

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
            logger.error('Failed to serialize room', { roomId: room.id, error });
            throw error;
        }
    },

    /**
     * Deserializes JSON to Room object.
     * Uses GameEngine.fromState() for validated state hydration — never
     * direct state injection, which bypasses runtime validation.
     */
    deserialize(json: string): Room | null {
        let data: any;
        try {
            data = JSON.parse(json);

            if (!data || typeof data !== 'object' || !data.id) {
                logger.error('Failed to deserialize room: missing required fields', { data });
                return null;
            }

            const room = new Room(data.id, data.config);

            if (Array.isArray(data.players)) {
                data.players.forEach(
                    ([id, player]: [string, { id: string; name: string; isConnected: boolean }]) => {
                        room.players.set(id, player);
                    }
                );
            }

            if (data.hasGame && data.gameState) {
                // Extract player IDs from the serialized lobby players (not gameState.players)
                // so the order and identity match what was originally used to create the engine.
                const playerIds: string[] = Array.isArray(data.players)
                    ? data.players.map(([id]: [string, unknown]) => id)
                    : data.gameState.players.map((p: { id: string }) => p.id);

                try {
                    room.gameEngine = GameEngine.fromState(data.gameState, playerIds, data.id);
                } catch (err) {
                    logger.error('Failed to hydrate GameEngine from state', {
                        roomId: data.id,
                        error: err,
                    });
                    return null;
                }
            }

            // Reattach persistence listener so the room keeps saving on state changes
            room.reattachPersistence?.();

            return room;
        } catch (error) {
            logger.error('Failed to deserialize room from cache', {
                roomId: data?.id,
                error,
            });
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
            // SET the room JSON and add its ID to the active-rooms set atomically
            await Promise.all([
                client.set(key, serialized, { EX: ttl }),
                client.sAdd(ACTIVE_ROOMS_SET, room.id),
            ]);
        } catch (error) {
            logger.error('Failed to cache room', { roomId: room.id, error });
        }
    },

    async getRoom(id: RoomID): Promise<Room | undefined> {
        const client = redis.getClient();
        if (!client) return undefined;

        try {
            const json = await client.get(`${KEY_PREFIX}${id}`);
            if (!json) return undefined;

            const room = roomCache.deserialize(json);
            return room ?? undefined;
        } catch (error) {
            logger.error('Failed to get room from cache', { roomId: id, error });
            return undefined;
        }
    },

    async deleteRoom(id: RoomID): Promise<void> {
        const client = redis.getClient();
        if (!client) return;

        try {
            await Promise.all([
                client.del(`${KEY_PREFIX}${id}`),
                client.sRem(ACTIVE_ROOMS_SET, id),
            ]);
        } catch (error) {
            logger.error('Failed to delete room from cache', { roomId: id, error });
        }
    },

    /**
     * Returns all active rooms.
     * Primary path (O(2) Redis calls): SMEMBERS active_rooms → MGET.
     *
     * Migration path (runs at most once after a deploy that introduces the
     * active_rooms SET into a cluster that still has legacy room:* keys):
     *   If active_rooms is empty but room:* keys exist, perform a full SCAN to
     *   rebuild the SET, then continue on the primary path.
     */
    async getAllActiveRooms(): Promise<Room[]> {
        const client = redis.getClient();
        if (!client) return [];

        const rooms: Room[] = [];

        try {
            let ids = await client.sMembers(ACTIVE_ROOMS_SET);

            // ── Legacy migration ─────────────────────────────────────────────
            // The active_rooms SET was introduced in Phase H5. Redis instances
            // that were running before this deploy may still contain room:* keys
            // but have an empty (or absent) active_rooms SET. Detect this once
            // and rebuild the SET so no rooms are silently lost.
            if (!ids || ids.length === 0) {
                const legacyKeys: string[] = [];
                let cursor = 0;
                do {
                    const result = await client.scan(cursor, {
                        MATCH: `${KEY_PREFIX}*`,
                        COUNT: 200,
                    });
                    cursor = result.cursor;
                    legacyKeys.push(...result.keys);
                } while (cursor !== 0);

                if (legacyKeys.length > 0) {
                    logger.warn(
                        'active_rooms SET was empty but legacy room:* keys were found. ' +
                        'Rebuilding SET from SCAN — this should only happen once after a ' +
                        'deploy that introduces the active_rooms index.',
                        { legacyKeyCount: legacyKeys.length }
                    );

                    const legacyIds = legacyKeys.map((k) => k.slice(KEY_PREFIX.length));
                    // sAdd accepts a single member or an array
                    await client.sAdd(ACTIVE_ROOMS_SET, legacyIds);
                    ids = legacyIds;
                }
            }

            if (!ids || ids.length === 0) return [];

            const keys = ids.map((id) => `${KEY_PREFIX}${id}`);
            const values = await client.mGet(keys);

            for (let i = 0; i < values.length; i++) {
                const json = values[i];
                if (!json) {
                    // Key expired or was deleted without SREM — clean up the stale set member
                    const staleId = ids[i];
                    if (staleId) {
                        client.sRem(ACTIVE_ROOMS_SET, staleId).catch(() => { });
                    }
                    continue;
                }

                const room = roomCache.deserialize(json);
                if (room) {
                    rooms.push(room);
                }
            }
        } catch (error) {
            logger.error('Failed to fetch active rooms from cache', { error });
        }

        return rooms;
    },
};