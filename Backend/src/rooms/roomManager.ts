// Backend/src/rooms/roomManager.ts - PHASE 14

import { randomUUID } from "node:crypto";
import { Room } from "./room.js";
import { RoomConfig, RoomID } from "../types/room.types.js";
import { roomCache } from "../cache/roomCache.js";
import { logger } from "../lib/logger.js";

/**
 * Generates a unique room ID
 * Uses crypto random for production-grade uniqueness
 */
function generateRoomId(): RoomID {
    return `room_${randomUUID()}`;
}

/**
 * Manages all active game rooms (in-memory)
 * Handles CRUD operations for rooms
 */
export class RoomManager {
    private rooms: Map<RoomID, Room>;

    constructor() {
        this.rooms = new Map();
    }

    /**
     * Hydrate rooms from Redis on boot so active games survive restarts.
     * Must be called after Redis is connected and before the server
     * starts accepting connections.
     */
    async initialize(): Promise<void> {
        const cached = await roomCache.getAllActiveRooms();
        for (const room of cached) {
            room.reattachPersistence();
            this.rooms.set(room.id, room);
        }
        logger.info(`Hydrated ${cached.length} room(s) from Redis`);
    }

    /**
     * Create a new room with the given config
     * Returns the created Room
     */
    async createRoom(config: RoomConfig): Promise<Room> {
        const id = generateRoomId();
        const room = new Room(id, config);
        this.rooms.set(id, room);

        await roomCache.cacheRoom(room);
        return room;
    }

    /**
     * Get a room by ID
     * Strategy: Check memory -> Check Cache (hydrate) -> Return undefined
     */
    async getRoom(id: RoomID): Promise<Room | undefined> {
        let room = this.rooms.get(id);
        if (room) return room;

        // Try cache
        room = await roomCache.getRoom(id);
        if (room) {
            // Ensure persistence listeners are attached after hydration
            room.reattachPersistence();
            // Re-hydrate local map
            this.rooms.set(room.id, room);
        }
        return room;
    }

    /**
     * Delete a room by ID
     */
    async deleteRoom(id: RoomID): Promise<boolean> {
        const deletedLocal = this.rooms.delete(id);
        await roomCache.deleteRoom(id);
        return deletedLocal; // Strictly speaking we might want to know if it was in cache too
    }

    /**
     * List all rooms (Active in Cache + Local)
     * For simplistic distributed view, we trust Cache.
     */
    async listRooms(): Promise<Room[]> {
        return roomCache.getAllActiveRooms();
    }

    /**
     * Find first available room
     */
    async findAvailableRoom(): Promise<Room | undefined> {
        // Since we want global discovery, we use listRooms
        const rooms = await this.listRooms();
        for (const room of rooms) {
            if (!room.isFull() && !room.gameEngine) {
                return room;
            }
        }
        return undefined;
    }

    /**
     * Get count of active rooms (Global)
     */
    async getRoomCount(): Promise<number> {
        const rooms = await this.listRooms();
        return rooms.length;
    }

    /**
     * Remove all empty rooms (cleanup utility)
     */
    async removeEmptyRooms(): Promise<number> {
        const rooms = await this.listRooms();
        let removed = 0;
        for (const room of rooms) {
            if (room.isEmpty()) {
                await this.deleteRoom(room.id);
                removed++;
            }
        }
        return removed;
    }

    /**
     * Get all rooms that are waiting for players
     */
    async getWaitingRooms(): Promise<Room[]> {
        const rooms = await this.listRooms();
        return rooms.filter(room => !room.isFull() && !room.gameEngine);
    }

    /**
     * Get all rooms that have an active game
     */
    async getActiveGameRooms(): Promise<Room[]> {
        const rooms = await this.listRooms();
        return rooms.filter(room => room.gameEngine !== undefined);
    }

    /**
     * Clear all rooms
     */
    async clear(): Promise<void> {
        const rooms = await this.listRooms();
        await Promise.all(rooms.map(room => this.deleteRoom(room.id)));
        this.rooms.clear();
    }
}
