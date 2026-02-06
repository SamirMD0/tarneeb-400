// Backend/src/rooms/roomManager.test.ts - PHASE 16 ASYNC TESTS

import { describe, it, beforeEach, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "./roomManager.js";
import { RoomConfig } from "../types/room.types.js";
import { roomCache } from "../cache/roomCache.js";

// Mock RoomCache
mock.module("../cache/roomCache.js", {
    namedExports: {
        RoomCache: {
            cacheRoom: mock.fn(),
            getRoom: mock.fn(),
            deleteRoom: mock.fn(),
            getAllActiveRooms: mock.fn(),
        },
    },
});

describe("RoomManager", () => {
    let manager: RoomManager;
    const defaultConfig: RoomConfig = { maxPlayers: 4 };

    beforeEach(() => {
        manager = new RoomManager();
        // Reset mocks
        (roomCache.cacheRoom as any).mockImplementation(() => Promise.resolve());
        (roomCache.getRoom as any).mockImplementation(() => Promise.resolve(undefined));
        (roomCache.deleteRoom as any).mockImplementation(() => Promise.resolve());
        (roomCache.getAllActiveRooms as any).mockImplementation(() => Promise.resolve([]));
    });

    afterEach(() => {
        mock.restoreAll();
    });

    // =================================================================
    // CRUD OPERATIONS
    // =================================================================

    describe("createRoom", () => {
        it("should create a room and return it", async () => {
            const room = await manager.createRoom(defaultConfig);

            assert.ok(room);
            assert.ok(room.id.startsWith("room_"));
            assert.equal(room.config, defaultConfig);
            assert.equal((roomCache.cacheRoom as any).mock.callCount(), 1);
        });

        it("should create multiple rooms with unique IDs", async () => {
            // Since getAllActiveRooms is mocked to return [], getting counts relies on mock behavior if we use listRooms().
            // However, listRooms calls RoomCache.getAllActiveRooms().
            // So we need to ensure the mock reflects the state if we want to test logic dependent on it.
            // But createRoom also updates local map.
            // listRooms uses RoomCache.getAllActiveRooms() ONLY.
            // So for listRooms to work in tests, we must mock RoomCache.getAllActiveRooms to return what we want.

            const room1 = await manager.createRoom(defaultConfig);
            const room2 = await manager.createRoom(defaultConfig);

            assert.notEqual(room1.id, room2.id);

            // Mock listRooms return
            (roomCache.getAllActiveRooms as any).mockResolvedValue([room1, room2]);
            assert.equal(await manager.getRoomCount(), 2);
        });
    });

    describe("getRoom", () => {
        it("should return room by ID from local memory", async () => {
            const created = await manager.createRoom(defaultConfig);
            const retrieved = await manager.getRoom(created.id);

            assert.equal(retrieved, created);
        });

        it("should return undefined for non-existent room (local & cache)", async () => {
            const result = await manager.getRoom("non_existent_id");
            assert.equal(result, undefined);
        });

        it("should try cache if not in local memory", async () => {
            const result = await manager.getRoom("missing_local");
            assert.equal((roomCache.getRoom as any).mock.callCount(), 1);
        });
    });

    describe("deleteRoom", () => {
        it("should delete existing room and return true", async () => {
            const room = await manager.createRoom(defaultConfig);
            const result = await manager.deleteRoom(room.id);

            assert.equal(result, true);
            assert.equal(await manager.getRoom(room.id), undefined);
            assert.equal((roomCache.deleteRoom as any).mock.callCount(), 1);
        });

        it("should return false for non-existent room", async () => {
            const result = await manager.deleteRoom("non_existent_id");
            assert.equal(result, false);
        });
    });

    describe("listRooms", () => {
        it("should return empty array when no rooms exist", async () => {
            const rooms = await manager.listRooms();
            assert.deepEqual(rooms, []);
        });

        it("should return rooms from cache", async () => {
            const mockRooms = [{ id: 'r1' }, { id: 'r2' }];
            (roomCache.getAllActiveRooms as any).mockResolvedValue(mockRooms);

            const rooms = await manager.listRooms();
            assert.deepEqual(rooms, mockRooms);
        });
    });

    // =================================================================
    // MATCHMAKING
    // =================================================================

    describe("findAvailableRoom", () => {
        it("should return undefined when no rooms exist", async () => {
            const result = await manager.findAvailableRoom();
            assert.equal(result, undefined);
        });

        it("should return room that is not full", async () => {
            const room = await manager.createRoom(defaultConfig);
            (roomCache.getAllActiveRooms as any).mockResolvedValue([room]); // Sync cache view

            await room.addPlayer("p1", "Player 1");

            const result = await manager.findAvailableRoom();
            assert.equal(result, room);
        });

        it("should skip full rooms", async () => {
            const fullRoom = await manager.createRoom(defaultConfig);
            await fullRoom.addPlayer("p1", "Player 1");
            await fullRoom.addPlayer("p2", "Player 2");
            await fullRoom.addPlayer("p3", "Player 3");
            await fullRoom.addPlayer("p4", "Player 4");

            const emptyRoom = await manager.createRoom(defaultConfig);
            (roomCache.getAllActiveRooms as any).mockResolvedValue([fullRoom, emptyRoom]);

            const result = await manager.findAvailableRoom();
            assert.equal(result, emptyRoom);
        });
    });

    // =================================================================
    // UTILITY METHODS
    // =================================================================

    describe("removeEmptyRooms", () => {
        it("should remove rooms with no players", async () => {
            const room1 = await manager.createRoom(defaultConfig); // empty
            const room2 = await manager.createRoom(defaultConfig); // empty
            const occupied = await manager.createRoom(defaultConfig);
            await occupied.addPlayer("p1", "Player 1");

            (roomCache.getAllActiveRooms as any).mockResolvedValue([room1, room2, occupied]);

            const removed = await manager.removeEmptyRooms();

            assert.equal(removed, 2);
            assert.equal((roomCache.deleteRoom as any).mock.callCount(), 2);
        });
    });

    describe("clear", () => {
        it("should remove all rooms", async () => {
            const room1 = await manager.createRoom(defaultConfig);
            (roomCache.getAllActiveRooms as any).mockResolvedValue([room1]);

            await manager.clear();

            assert.equal((roomCache.deleteRoom as any).mock.callCount(), 1);
        });
    });
});
