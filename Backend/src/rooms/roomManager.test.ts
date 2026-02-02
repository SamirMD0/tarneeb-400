// Backend/src/rooms/roomManager.test.ts - PHASE 14

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "./roomManager.js";
import { RoomConfig } from "../types/room.types.js";

describe("RoomManager", () => {
    let manager: RoomManager;
    const defaultConfig: RoomConfig = { maxPlayers: 4 };

    beforeEach(() => {
        manager = new RoomManager();
    });

    // =================================================================
    // CRUD OPERATIONS
    // =================================================================

    describe("createRoom", () => {
        it("should create a room and return it", () => {
            const room = manager.createRoom(defaultConfig);

            assert.ok(room);
            assert.ok(room.id.startsWith("room_"));
            assert.equal(room.config, defaultConfig);
        });

        it("should create multiple rooms with unique IDs", () => {
            const room1 = manager.createRoom(defaultConfig);
            const room2 = manager.createRoom(defaultConfig);

            assert.notEqual(room1.id, room2.id);
            assert.equal(manager.getRoomCount(), 2);
        });
    });

    describe("getRoom", () => {
        it("should return room by ID", () => {
            const created = manager.createRoom(defaultConfig);
            const retrieved = manager.getRoom(created.id);

            assert.equal(retrieved, created);
        });

        it("should return undefined for non-existent room", () => {
            const result = manager.getRoom("non_existent_id");

            assert.equal(result, undefined);
        });
    });

    describe("deleteRoom", () => {
        it("should delete existing room and return true", () => {
            const room = manager.createRoom(defaultConfig);
            const result = manager.deleteRoom(room.id);

            assert.equal(result, true);
            assert.equal(manager.getRoom(room.id), undefined);
        });

        it("should return false for non-existent room", () => {
            const result = manager.deleteRoom("non_existent_id");

            assert.equal(result, false);
        });
    });

    describe("listRooms", () => {
        it("should return empty array when no rooms exist", () => {
            const rooms = manager.listRooms();

            assert.deepEqual(rooms, []);
        });

        it("should return all rooms", () => {
            const room1 = manager.createRoom(defaultConfig);
            const room2 = manager.createRoom(defaultConfig);

            const rooms = manager.listRooms();

            assert.equal(rooms.length, 2);
            assert.ok(rooms.includes(room1));
            assert.ok(rooms.includes(room2));
        });
    });

    // =================================================================
    // MATCHMAKING
    // =================================================================

    describe("findAvailableRoom", () => {
        it("should return undefined when no rooms exist", () => {
            const result = manager.findAvailableRoom();

            assert.equal(result, undefined);
        });

        it("should return room that is not full", () => {
            const room = manager.createRoom(defaultConfig);
            room.addPlayer("p1", "Player 1");

            const result = manager.findAvailableRoom();

            assert.equal(result, room);
        });

        it("should skip full rooms", () => {
            const fullRoom = manager.createRoom(defaultConfig);
            fullRoom.addPlayer("p1", "Player 1");
            fullRoom.addPlayer("p2", "Player 2");
            fullRoom.addPlayer("p3", "Player 3");
            fullRoom.addPlayer("p4", "Player 4");

            const emptyRoom = manager.createRoom(defaultConfig);

            const result = manager.findAvailableRoom();

            assert.equal(result, emptyRoom);
        });

        it("should skip rooms with active games", () => {
            const gameRoom = manager.createRoom(defaultConfig);
            gameRoom.addPlayer("p1", "Player 1");
            gameRoom.addPlayer("p2", "Player 2");
            gameRoom.addPlayer("p3", "Player 3");
            gameRoom.addPlayer("p4", "Player 4");
            gameRoom.startGame();

            const waitingRoom = manager.createRoom(defaultConfig);

            const result = manager.findAvailableRoom();

            assert.equal(result, waitingRoom);
        });

        it("should return undefined when all rooms are full or in game", () => {
            const fullRoom = manager.createRoom(defaultConfig);
            fullRoom.addPlayer("p1", "Player 1");
            fullRoom.addPlayer("p2", "Player 2");
            fullRoom.addPlayer("p3", "Player 3");
            fullRoom.addPlayer("p4", "Player 4");
            fullRoom.startGame();

            const result = manager.findAvailableRoom();

            assert.equal(result, undefined);
        });
    });

    // =================================================================
    // UTILITY METHODS
    // =================================================================

    describe("getRoomCount", () => {
        it("should return 0 when no rooms exist", () => {
            assert.equal(manager.getRoomCount(), 0);
        });

        it("should return correct count", () => {
            manager.createRoom(defaultConfig);
            manager.createRoom(defaultConfig);
            manager.createRoom(defaultConfig);

            assert.equal(manager.getRoomCount(), 3);
        });
    });

    describe("removeEmptyRooms", () => {
        it("should remove rooms with no players", () => {
            manager.createRoom(defaultConfig); // empty
            manager.createRoom(defaultConfig); // empty
            const occupied = manager.createRoom(defaultConfig);
            occupied.addPlayer("p1", "Player 1");

            const removed = manager.removeEmptyRooms();

            assert.equal(removed, 2);
            assert.equal(manager.getRoomCount(), 1);
            assert.ok(manager.getRoom(occupied.id));
        });

        it("should return 0 when no empty rooms", () => {
            const room = manager.createRoom(defaultConfig);
            room.addPlayer("p1", "Player 1");

            const removed = manager.removeEmptyRooms();

            assert.equal(removed, 0);
        });
    });

    describe("getWaitingRooms", () => {
        it("should return only rooms waiting for players", () => {
            const waiting1 = manager.createRoom(defaultConfig);
            waiting1.addPlayer("p1", "Player 1");

            const waiting2 = manager.createRoom(defaultConfig);

            const inGame = manager.createRoom(defaultConfig);
            inGame.addPlayer("a", "A");
            inGame.addPlayer("b", "B");
            inGame.addPlayer("c", "C");
            inGame.addPlayer("d", "D");
            inGame.startGame();

            const waiting = manager.getWaitingRooms();

            assert.equal(waiting.length, 2);
            assert.ok(waiting.includes(waiting1));
            assert.ok(waiting.includes(waiting2));
        });
    });

    describe("getActiveGameRooms", () => {
        it("should return only rooms with active games", () => {
            const waiting = manager.createRoom(defaultConfig);
            waiting.addPlayer("p1", "Player 1");

            const inGame = manager.createRoom(defaultConfig);
            inGame.addPlayer("a", "A");
            inGame.addPlayer("b", "B");
            inGame.addPlayer("c", "C");
            inGame.addPlayer("d", "D");
            inGame.startGame();

            const active = manager.getActiveGameRooms();

            assert.equal(active.length, 1);
            assert.equal(active[0], inGame);
        });
    });

    describe("clear", () => {
        it("should remove all rooms", () => {
            manager.createRoom(defaultConfig);
            manager.createRoom(defaultConfig);
            manager.createRoom(defaultConfig);

            manager.clear();

            assert.equal(manager.getRoomCount(), 0);
            assert.deepEqual(manager.listRooms(), []);
        });
    });
});
