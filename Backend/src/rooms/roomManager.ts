// Backend/src/rooms/roomManager.ts - PHASE 14

import { Room } from "./room.js";
import { RoomConfig, RoomID } from "../types/room.types.js";

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
    createRoom(config: RoomConfig): Room {
        const id = generateRoomId();
        const room = new Room(id, config);
        this.rooms.set(id, room);
        return room;
    }

    /**
     * Get a room by ID
     * Returns undefined if room doesn't exist
     */
    getRoom(id: RoomID): Room | undefined {
        return this.rooms.get(id);
    }

    /**
     * Delete a room by ID
     * Returns true if room was deleted, false if it didn't exist
     */
    deleteRoom(id: RoomID): boolean {
        return this.rooms.delete(id);
    }

    /**
     * List all rooms
     * Returns array of Room objects
     */
    listRooms(): Room[] {
        return [...this.rooms.values()];
    }

    /**
     * Find first available room that is not full and not in game
     * Useful for matchmaking / quick join
     * Returns undefined if no available room exists
     */
    findAvailableRoom(): Room | undefined {
        for (const room of this.rooms.values()) {
            if (!room.isFull() && !room.gameEngine) {
                return room;
            }
        }
        return undefined;
    }

    /**
     * Get count of active rooms
     */
    getRoomCount(): number {
        return this.rooms.size;
    }

    /**
     * Remove all empty rooms (cleanup utility)
     * Returns number of rooms removed
     */
    removeEmptyRooms(): number {
        let removed = 0;
        for (const [id, room] of this.rooms) {
            if (room.isEmpty()) {
                this.rooms.delete(id);
                removed++;
            }
        }
        return removed;
    }

    /**
     * Get all rooms that are waiting for players
     * Useful for lobby listing
     */
    getWaitingRooms(): Room[] {
        return [...this.rooms.values()].filter(
            room => !room.isFull() && !room.gameEngine
        );
    }

    /**
     * Get all rooms that have an active game
     */
    getActiveGameRooms(): Room[] {
        return [...this.rooms.values()].filter(
            room => room.gameEngine !== undefined
        );
    }

    /**
     * Clear all rooms (useful for testing or shutdown)
     */
    clear(): void {
        this.rooms.clear();
    }
}
