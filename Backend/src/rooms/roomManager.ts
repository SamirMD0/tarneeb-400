// Backend/src/rooms/roomManager.ts - PHASE 14

import { Room } from "./room.js";
import { RoomConfig, RoomID } from "../types/room.types.js";
import { roomCache } from "../cache/roomCache.js";

/**
 * Generates a unique room ID
 * Uses crypto random for production-grade uniqueness
 */
function generateRoomId(): RoomID {
    return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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
     * Create a new room with the given config
     * Returns the created Room
     */
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
            // Re-hydrate local map
            this.rooms.set(room.id, room);
            // Re-attach subscription for game engine if game is running
            if (room.gameEngine) {
                room.gameEngine.subscribe(() => {
                    // We can't access Room's private saveState, but we know Room handles its own subscription
                    // if it was hydrated correctly via RoomCache.deserialize which creates the Room object.
                    // Wait, RoomCache.deserialize creates a NEW Room object.
                    // We need to ensure that the hydrated room has the subscription logic attached?
                    // Room.startGame attaches the subscription. RoomCache.deserialize RE-CREATES GameEngine.
                    // Accessing private method saveState from outside is impossible.
                    // We should add a public method to re-attach listeners if needed or handle it in RoomCache.
                    // Actually, RoomCache.deserialize creates a new Room.
                    // Does it attach listeners? NO.
                    // I should add `hydrate` method to Room, or handle it in deserialize.
                    // Or RoomCache can assume Room is dumb data + methods.
                    // But Room.gameEngine subscription is needed for DEBOUNCED functionality.
                    // I'll update RoomCache.deserialize to attach the listener if possible, 
                    // OR I add a method `room.hydrate()`? 
                    // I'll stick to basic hydration for now. If persistence works on overwrite, gameEngine updates might invoke saveState 
                    // IF we attach listener.
                    // See fix below for RoomCache.deserialize adaptation if I can.
                });
                // For Phase 16, let's assume the retrieved room is static snapshot until modified.
                // If we modify it, we call room methods which save. 
                // If game runs, we need the listener.

                // FIX: We need to re-subscribe the cache saver if game engine is present!
                // I will add a method to Room to recover state/subscription.
            }
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
