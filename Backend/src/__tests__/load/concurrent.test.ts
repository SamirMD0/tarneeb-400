// Backend/src/__tests__/load/concurrent.test.ts — Phase 21
// Concurrent room stress test: 10 rooms × 4 players = 40 socket connections.
// Each room starts a game, plays one trick, then verifies state integrity.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
    createTestServer,
    teardownTestServer,
    createFullRoom,
    startGame,
    pickCard,
    buildSocketMap,
    waitForEvent,
    LOAD_TEST_TIMEOUT,
    type TestContext,
    type ClientSocket,
} from '../setup.js';

const NUM_ROOMS = 10;

describe('Concurrent Rooms Load Test', { timeout: LOAD_TEST_TIMEOUT }, () => {
    let ctx: TestContext;

    before(async () => {
        ctx = await createTestServer();
    });

    after(async () => {
        await teardownTestServer(ctx);
    });

    it(`should handle ${NUM_ROOMS} concurrent rooms with ${NUM_ROOMS * 4} sockets`, async () => {
        const startTime = Date.now();

        // ── Phase 1: Create all rooms concurrently ──
        const roomPromises = Array.from({ length: NUM_ROOMS }, () => createFullRoom(ctx));
        const rooms = await Promise.all(roomPromises);

        const roomCreationMs = Date.now() - startTime;
        console.log(`  ✓ ${NUM_ROOMS} rooms created in ${roomCreationMs}ms`);

        assert.equal(rooms.length, NUM_ROOMS);
        // All room IDs should be unique
        const roomIds = new Set(rooms.map((r) => r.roomId));
        assert.equal(roomIds.size, NUM_ROOMS, 'All room IDs should be unique');

        // ── Phase 2: Start all games concurrently ──
        const gameStartTime = Date.now();
        const startPromises = rooms.map((r) => startGame(r.sockets));
        const startResults = await Promise.all(startPromises);

        const gameStartMs = Date.now() - gameStartTime;
        console.log(`  ✓ ${NUM_ROOMS} games started in ${gameStartMs}ms`);

        for (const result of startResults) {
            assert.equal(result.gameState.phase, 'BIDDING');
            assert.equal(result.gameState.players.length, 4);
        }

        // ── Phase 3: Each room bids and plays 1 trick ──
        const trickStartTime = Date.now();

        const trickPromises = rooms.map(async (room, roomIndex) => {
            const { sockets } = room;
            const socketMap = buildSocketMap(sockets);
            let state = startResults[roomIndex]!.gameState;

            // Bid
            const bidderId = state.players[state.currentPlayerIndex].id as string;
            const bidderSocket = socketMap.get(bidderId)!;

            const bidUpdate = waitForEvent<any>(sockets[0], 'game_state_updated');
            bidderSocket.emit('place_bid', { value: 7 });
            state = (await bidUpdate).gameState;

            // 3 passes
            for (let i = 0; i < 3; i++) {
                const passerId = state.players[state.currentPlayerIndex].id as string;
                const passerSocket = socketMap.get(passerId)!;
                const passUpdate = waitForEvent<any>(sockets[0], 'game_state_updated');
                passerSocket.emit('pass_bid', {});
                state = (await passUpdate).gameState;
            }

            // Set trump
            const trumpUpdate = waitForEvent<any>(sockets[0], 'game_state_updated');
            bidderSocket.emit('set_trump', { suit: 'HEARTS' });
            state = (await trumpUpdate).gameState;
            assert.equal(state.phase, 'PLAYING', `Room ${roomIndex} should be in PLAYING`);

            // Play 4 cards (1 trick)
            for (let cardNum = 0; cardNum < 4; cardNum++) {
                const currentId = state.players[state.currentPlayerIndex].id as string;
                const currentSocket = socketMap.get(currentId)!;
                const card = pickCard(currentSocket.id!, state);
                assert.ok(card, `Room ${roomIndex}: player should have a card`);

                const playUpdate = waitForEvent<any>(sockets[0], 'game_state_updated');
                currentSocket.emit('play_card', { card });
                state = (await playUpdate).gameState;
            }

            // Trick should have resolved
            assert.equal(state.trick.length, 0, `Room ${roomIndex}: trick should be cleared`);
            const totalTricks = state.teams[1].tricksWon + state.teams[2].tricksWon;
            assert.equal(totalTricks, 1, `Room ${roomIndex}: should have 1 completed trick`);

            return state;
        });

        const trickResults = await Promise.all(trickPromises);
        const trickMs = Date.now() - trickStartTime;
        console.log(`  ✓ ${NUM_ROOMS} concurrent tricks completed in ${trickMs}ms`);

        // ── Phase 4: Verify no state corruption ──
        for (let i = 0; i < trickResults.length; i++) {
            const state = trickResults[i]!;
            assert.equal(state.players.length, 4, `Room ${i}: should have 4 players`);
            assert.equal(state.phase, 'PLAYING', `Room ${i}: should still be in PLAYING`);

            // Each player should have 12 cards left (13 - 1 played)
            for (const player of state.players) {
                assert.equal(player.hand.length, 12, `Room ${i}: player ${player.id} should have 12 cards`);
            }
        }

        const totalMs = Date.now() - startTime;
        const totalConnections = ctx.clients.length;
        console.log(`\n  Summary: ${NUM_ROOMS} rooms, ${totalConnections} connections, ${totalMs}ms total`);
        console.log(`  Avg per room: ${Math.round(totalMs / NUM_ROOMS)}ms`);
    });

    it('should create and immediately destroy rooms without leaks', async () => {
        // Quick churn test: create 5 rooms, disconnect all clients immediately
        const quickRooms = await Promise.all(
            Array.from({ length: 5 }, () => createFullRoom(ctx))
        );

        // Disconnect all clients
        for (const room of quickRooms) {
            for (const s of room.sockets) {
                s.disconnect();
            }
        }

        // Wait a moment for cleanup
        await new Promise<void>((resolve) => setTimeout(resolve, 200));

        // Server should still be functional — create a new room
        const freshRoom = await createFullRoom(ctx);
        assert.ok(freshRoom.roomId, 'Should still be able to create rooms after churn');
    });
});
