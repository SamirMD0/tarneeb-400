// Backend/src/__tests__/load/concurrent.test.ts — Phase 21
// Concurrent room stress test: 100 rooms × 4 players = 400 socket connections.
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
} from '../setup.js';

const NUM_ROOMS = 100;

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

        // ── Phase 1: Create all rooms concurrently in batches of 20 ──
        // Batching avoids exhausting the OS socket/file-descriptor limit in CI.
        const BATCH_SIZE = 20;
        const rooms: Awaited<ReturnType<typeof createFullRoom>>[] = [];

        for (let batch = 0; batch < NUM_ROOMS / BATCH_SIZE; batch++) {
            const batchRooms = await Promise.all(
                Array.from({ length: BATCH_SIZE }, () => createFullRoom(ctx))
            );
            rooms.push(...batchRooms);
        }

        const roomCreationMs = Date.now() - startTime;
        console.log(`  ✓ ${NUM_ROOMS} rooms created in ${roomCreationMs}ms`);

        assert.equal(rooms.length, NUM_ROOMS, `Must have exactly ${NUM_ROOMS} rooms`);

        // All room IDs must be unique
        const roomIds = new Set(rooms.map((r) => r.roomId));
        assert.equal(roomIds.size, NUM_ROOMS, 'All room IDs must be unique');

        // ── Phase 2: Start all games concurrently ──
        const gameStartTime = Date.now();
        const startResults = await Promise.all(rooms.map((r) => startGame(r.sockets)));
        const gameStartMs = Date.now() - gameStartTime;
        console.log(`  ✓ ${NUM_ROOMS} games started in ${gameStartMs}ms`);

        for (const result of startResults) {
            assert.equal(result.gameState.phase, 'BIDDING', 'Every game must start in BIDDING');
            assert.equal(result.gameState.players.length, 4, 'Every game must have 4 players');
        }

        // ── Phase 3: Each room bids and plays 1 trick concurrently ──
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
            assert.equal(state.phase, 'PLAYING', `Room ${roomIndex}: must be PLAYING after set_trump`);

            // Play 4 cards (1 complete trick)
            for (let cardNum = 0; cardNum < 4; cardNum++) {
                const currentId = state.players[state.currentPlayerIndex].id as string;
                const currentSocket = socketMap.get(currentId)!;
                const card = pickCard(currentSocket.id!, state);
                assert.ok(card, `Room ${roomIndex}: player ${currentId} must have a playable card`);

                const playUpdate = waitForEvent<any>(sockets[0], 'game_state_updated');
                currentSocket.emit('play_card', { card });
                state = (await playUpdate).gameState;
            }

            // Trick must have resolved
            assert.equal(state.trick.length, 0, `Room ${roomIndex}: trick must be cleared`);

            const totalTricks = state.teams[1].tricksWon + state.teams[2].tricksWon;
            assert.equal(totalTricks, 1, `Room ${roomIndex}: must have exactly 1 completed trick`);

            return state;
        });

        const trickResults = await Promise.all(trickPromises);
        const trickMs = Date.now() - trickStartTime;
        console.log(`  ✓ ${NUM_ROOMS} concurrent tricks completed in ${trickMs}ms`);

        // ── Phase 4: Verify no state corruption across all rooms ──
        for (let i = 0; i < trickResults.length; i++) {
            const state = trickResults[i]!;
            assert.equal(state.players.length, 4, `Room ${i}: must have 4 players`);
            assert.equal(state.phase, 'PLAYING', `Room ${i}: must still be PLAYING`);

            // Each player must have exactly 12 cards (13 dealt − 1 played)
            for (const player of state.players) {
                assert.equal(
                    player.hand.length,
                    12,
                    `Room ${i}: player ${player.id} must have 12 cards remaining`
                );
            }

            // No card overlap between players (basic integrity check)
            const allCards = state.players.flatMap((p: any) =>
                p.hand.map((c: any) => `${c.suit}-${c.rank}`)
            );
            const uniqueCards = new Set(allCards);
            assert.equal(
                uniqueCards.size,
                allCards.length,
                `Room ${i}: no player must hold duplicate cards`
            );
        }

        const totalMs = Date.now() - startTime;
        const totalConnections = ctx.clients.length;
        console.log(`\n  Summary: ${NUM_ROOMS} rooms, ${totalConnections} connections, ${totalMs}ms total`);
        console.log(`  Avg per room: ${Math.round(totalMs / NUM_ROOMS)}ms`);
        console.log(`  Peak connections: ${totalConnections}`);
    });

    it('should create and immediately destroy rooms without leaks', async () => {
        // Quick churn test: create 5 rooms, disconnect all clients immediately
        const quickRooms = await Promise.all(
            Array.from({ length: 5 }, () => createFullRoom(ctx))
        );

        for (const room of quickRooms) {
            for (const s of room.sockets) {
                s.disconnect();
            }
        }

        // Allow cleanup to propagate
        await new Promise<void>((resolve) => setTimeout(resolve, 200));

        // Server must still be functional after churn
        const freshRoom = await createFullRoom(ctx);
        assert.ok(freshRoom.roomId, 'Must still create rooms after client churn');
    });

    it('should verify no state bleed between rooms under concurrent load', async () => {
        // Create 10 rooms with distinguishable bid values (7 + roomIndex % 7)
        // and verify each room only sees its own state changes.
        const rooms = await Promise.all(
            Array.from({ length: 10 }, () => createFullRoom(ctx))
        );
        const startResults = await Promise.all(rooms.map((r) => startGame(r.sockets)));

        const bidPromises = rooms.map(async (room, i) => {
            const socketMap = buildSocketMap(room.sockets);
            const state = startResults[i]!.gameState;
            const bidderId = state.players[state.currentPlayerIndex].id as string;
            const bidderSocket = socketMap.get(bidderId)!;
            const bidValue = 7 + (i % 7); // values 7–13

            const bidUpdate = waitForEvent<any>(room.sockets[0], 'game_state_updated');
            bidderSocket.emit('place_bid', { value: bidValue });
            const result = (await bidUpdate).gameState;

            return { roomIndex: i, expectedBid: bidValue, actualBid: result.highestBid };
        });

        const bidResults = await Promise.all(bidPromises);

        for (const { roomIndex, expectedBid, actualBid } of bidResults) {
            assert.equal(
                actualBid,
                expectedBid,
                `Room ${roomIndex}: expected bid ${expectedBid} but got ${actualBid} — state bleed detected`
            );
        }
    });
});