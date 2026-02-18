// Backend/src/__tests__/integration/fullGame.test.ts — Phase 21
// Full game lifecycle test: room → bidding → 13 tricks → scoring → game over.

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
    DEFAULT_TIMEOUT,
    type TestContext,
    type ClientSocket,
} from '../setup.js';

describe('Full Game Lifecycle', { timeout: DEFAULT_TIMEOUT }, () => {
    let ctx: TestContext;

    before(async () => {
        ctx = await createTestServer();
    });

    after(async () => {
        await teardownTestServer(ctx);
    });

    it('should complete room creation → bidding → 13 tricks → scoring', async () => {
        const { roomId, sockets } = await createFullRoom(ctx);
        const [s1, s2, s3, s4] = sockets;

        // ── Start game ──
        const started = await startGame(sockets);
        assert.ok(started.gameState, 'game_started should contain gameState');
        assert.equal(started.gameState.phase, 'BIDDING', 'Phase should be BIDDING after start');
        assert.equal(started.gameState.players.length, 4);

        // Every player should have 13 cards
        for (const p of started.gameState.players) {
            assert.equal(p.hand.length, 13, `Player ${p.id} should have 13 cards`);
        }

        // ── Bidding: first player bids 7, rest pass, bidder sets trump ──
        const socketMap = buildSocketMap(sockets);
        let state = started.gameState;
        const bidderId = state.players[state.currentPlayerIndex].id as string;
        const bidderSocket = socketMap.get(bidderId)!;
        assert.ok(bidderSocket, 'Bidder socket should exist');

        // Place bid
        const bidUpdate = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('place_bid', { value: 7 });
        const bidResults = await bidUpdate;
        state = bidResults[0]!.gameState;
        assert.equal(state.highestBid, 7);
        assert.equal(state.bidderId, bidderId);

        // 3 remaining players pass
        for (let i = 0; i < 3; i++) {
            const passerIdx = state.currentPlayerIndex;
            const passerId = state.players[passerIdx].id as string;
            const passerSocket = socketMap.get(passerId)!;
            assert.ok(passerSocket, `Passer socket ${passerId} should exist`);

            const passUpdate = waitForEvent<any>(s1, 'game_state_updated');
            passerSocket.emit('pass_bid', {});
            const passResult = await passUpdate;
            state = passResult.gameState;
        }

        // Set trump (bidder)
        const trumpUpdate = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('set_trump', { suit: 'SPADES' });
        const trumpResults = await trumpUpdate;
        state = trumpResults[0]!.gameState;
        assert.equal(state.phase, 'PLAYING');
        assert.equal(state.trumpSuit, 'SPADES');

        // ── Playing: 13 tricks ──
        for (let trick = 0; trick < 13; trick++) {
            for (let cardNum = 0; cardNum < 4; cardNum++) {
                const currentIdx = state.currentPlayerIndex;
                const currentPlayerId = state.players[currentIdx].id as string;
                const currentSocket = socketMap.get(currentPlayerId)!;
                assert.ok(currentSocket, `Socket for player ${currentPlayerId} should exist`);

                const card = pickCard(currentSocket.id!, state);
                assert.ok(card, `Player ${currentPlayerId} should have a playable card (trick ${trick + 1}, card ${cardNum + 1})`);

                const playUpdate = waitForEvent<any>(s1, 'game_state_updated');
                currentSocket.emit('play_card', { card });
                const playResult = await playUpdate;
                state = playResult.gameState;
            }

            // After END_TRICK auto-fires, trick array resets
            assert.equal(state.trick.length, 0, `Trick array should be empty after trick ${trick + 1}`);
        }

        // ── Verify scoring ──
        const totalTricks = state.teams[1].tricksWon + state.teams[2].tricksWon;
        assert.equal(totalTricks, 13, 'Total tricks should equal 13');

        // At least one team should have a non-zero score after END_ROUND auto-fires
        const hasScore = state.teams[1].score !== 0 || state.teams[2].score !== 0;
        assert.ok(hasScore, 'At least one team should have scored');
    });

    it('should broadcast consistent state to all 4 clients during gameplay', async () => {
        const { sockets } = await createFullRoom(ctx);

        const started = await startGame(sockets);
        const socketMap = buildSocketMap(sockets);
        let state = started.gameState;

        // Bidder places bid — all 4 should receive identical state
        const bidderId = state.players[state.currentPlayerIndex].id as string;
        const bidderSocket = socketMap.get(bidderId)!;

        const allUpdates = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('place_bid', { value: 7 });
        const results = await allUpdates;

        // All 4 clients should have same highestBid and bidderId
        for (const r of results) {
            assert.equal(r.gameState.highestBid, 7, 'All clients should see highestBid = 7');
            assert.equal(r.gameState.bidderId, bidderId, 'All clients should see correct bidderId');
        }
    });
});
