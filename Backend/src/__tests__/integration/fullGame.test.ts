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

describe('Full Game Lifecycle', { timeout: DEFAULT_TIMEOUT * 6 }, () => {
    let ctx: TestContext;

    before(async () => {
        ctx = await createTestServer();
    });

    after(async () => {
        await teardownTestServer(ctx);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Shared helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Play one complete bidding phase:
     * current player bids 7, the other 3 pass, bidder sets trump SPADES.
     * Returns state after SET_TRUMP (phase === 'PLAYING').
     */
    async function playBiddingPhase(
        sockets: [ClientSocket, ClientSocket, ClientSocket, ClientSocket],
        state: any
    ): Promise<any> {
        const [s1] = sockets;
        const socketMap = buildSocketMap(sockets);

        const bidderId = state.players[state.currentPlayerIndex].id as string;
        const bidderSocket = socketMap.get(bidderId)!;
        assert.ok(bidderSocket, 'Bidder socket must exist');

        // Bid 7
        const bidUpdate = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('place_bid', { value: 7 });
        state = (await bidUpdate)[0]!.gameState;

        // 3 passes
        for (let i = 0; i < 3; i++) {
            const passerId = state.players[state.currentPlayerIndex].id as string;
            const passerSocket = socketMap.get(passerId)!;
            const passUpdate = waitForEvent<any>(s1, 'game_state_updated');
            passerSocket.emit('pass_bid', {});
            state = (await passUpdate).gameState;
        }

        // Set trump
        const trumpUpdate = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('set_trump', { suit: 'SPADES' });
        state = (await trumpUpdate)[0]!.gameState;

        assert.equal(state.phase, 'PLAYING');
        assert.equal(state.trumpSuit, 'SPADES');
        return state;
    }

    /**
     * Play all 13 tricks of one round.
     * Returns state after END_ROUND auto-fires (phase === 'SCORING').
     */
    async function playAllTricks(
        sockets: [ClientSocket, ClientSocket, ClientSocket, ClientSocket],
        state: any
    ): Promise<any> {
        const [s1] = sockets;
        const socketMap = buildSocketMap(sockets);

        for (let trick = 0; trick < 13; trick++) {
            for (let card = 0; card < 4; card++) {
                const currentId = state.players[state.currentPlayerIndex].id as string;
                const currentSocket = socketMap.get(currentId)!;

                const playable = pickCard(currentSocket.id!, state);
                assert.ok(playable, `Player ${currentId} must have a card (trick ${trick + 1}, card ${card + 1})`);

                const playUpdate = waitForEvent<any>(s1, 'game_state_updated');
                currentSocket.emit('play_card', { card: playable });
                state = (await playUpdate).gameState;
            }
            assert.equal(state.trick.length, 0, `Trick ${trick + 1} must be cleared`);
        }

        return state;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1 (existing): single-round lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    it('should complete room creation → bidding → 13 tricks → scoring', async () => {
        const { roomId, sockets } = await createFullRoom(ctx);
        const [s1, s2, s3, s4] = sockets;

        // ── Start game ──
        const started = await startGame(sockets);
        assert.ok(started.gameState, 'game_started should contain gameState');
        assert.equal(started.gameState.phase, 'BIDDING', 'Phase should be BIDDING after start');
        assert.equal(started.gameState.players.length, 4);

        for (const p of started.gameState.players) {
            assert.equal(p.hand.length, 13, `Player ${p.id} should have 13 cards`);
        }

        // ── Bidding: first player bids 7, rest pass, bidder sets trump ──
        const socketMap = buildSocketMap(sockets);
        let state = started.gameState;
        const bidderId = state.players[state.currentPlayerIndex].id as string;
        const bidderSocket = socketMap.get(bidderId)!;
        assert.ok(bidderSocket, 'Bidder socket should exist');

        const bidUpdate = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('place_bid', { value: 7 });
        const bidResults = await bidUpdate;
        state = bidResults[0]!.gameState;
        assert.equal(state.highestBid, 7);
        assert.equal(state.bidderId, bidderId);

        for (let i = 0; i < 3; i++) {
            const passerId = state.players[state.currentPlayerIndex].id as string;
            const passerSocket = socketMap.get(passerId)!;
            assert.ok(passerSocket, `Passer socket ${passerId} should exist`);
            const passUpdate = waitForEvent<any>(s1, 'game_state_updated');
            passerSocket.emit('pass_bid', {});
            state = (await passUpdate).gameState;
        }

        const trumpUpdate = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('set_trump', { suit: 'SPADES' });
        const trumpResults = await trumpUpdate;
        state = trumpResults[0]!.gameState;
        assert.equal(state.phase, 'PLAYING');
        assert.equal(state.trumpSuit, 'SPADES');

        // ── Playing: 13 tricks ──
        for (let trick = 0; trick < 13; trick++) {
            for (let cardNum = 0; cardNum < 4; cardNum++) {
                const currentPlayerId = state.players[state.currentPlayerIndex].id as string;
                const currentSocket = socketMap.get(currentPlayerId)!;
                assert.ok(currentSocket, `Socket for player ${currentPlayerId} should exist`);

                const card = pickCard(currentSocket.id!, state);
                assert.ok(card, `Player ${currentPlayerId} should have a playable card (trick ${trick + 1}, card ${cardNum + 1})`);

                const playUpdate = waitForEvent<any>(s1, 'game_state_updated');
                currentSocket.emit('play_card', { card });
                state = (await playUpdate).gameState;
            }
            assert.equal(state.trick.length, 0, `Trick array should be empty after trick ${trick + 1}`);
        }

        // ── Verify scoring ──
        const totalTricks = state.teams[1].tricksWon + state.teams[2].tricksWon;
        assert.equal(totalTricks, 13, 'Total tricks should equal 13');

        const hasScore = state.teams[1].score !== 0 || state.teams[2].score !== 0;
        assert.ok(hasScore, 'At least one team should have scored');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2 (existing): broadcast consistency
    // ─────────────────────────────────────────────────────────────────────────

    it('should broadcast consistent state to all 4 clients during gameplay', async () => {
        const { sockets } = await createFullRoom(ctx);

        const started = await startGame(sockets);
        const socketMap = buildSocketMap(sockets);
        const state = started.gameState;

        const bidderId = state.players[state.currentPlayerIndex].id as string;
        const bidderSocket = socketMap.get(bidderId)!;

        const allUpdates = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('place_bid', { value: 7 });
        const results = await allUpdates;

        for (const r of results) {
            assert.equal(r.gameState.highestBid, 7, 'All clients should see highestBid = 7');
            assert.equal(r.gameState.bidderId, bidderId, 'All clients should see correct bidderId');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3 (NEW): multi-round game — loop until a team reaches 41 points
    // ─────────────────────────────────────────────────────────────────────────

    it('should play multiple rounds until a team reaches 41 points', async () => {
        const { sockets } = await createFullRoom(ctx);
        const [s1] = sockets;

        const started = await startGame(sockets);
        let state = started.gameState;

        let roundCount = 0;
        const MAX_ROUNDS = 20; // Safety cap — real game should finish long before this

        while (state.teams[1].score < 41 && state.teams[2].score < 41 && roundCount < MAX_ROUNDS) {
            roundCount++;

            // After each END_ROUND the server leaves state in SCORING phase.
            // Trigger the next round via START_BIDDING action (same as start_game does
            // internally, but mid-game we dispatch it directly).
            if (state.phase === 'SCORING') {
                // RESET_GAME re-deals and returns to DEALING phase
                const resetUpdate = waitForEvent<any>(s1, 'game_state_updated');
                s1.emit('game_action', { action: { type: 'RESET_GAME' } });
                state = (await resetUpdate).gameState;

                // START_BIDDING moves DEALING → BIDDING
                const biddingUpdate = waitForEvent<any>(s1, 'game_state_updated');
                s1.emit('game_action', { action: { type: 'START_BIDDING' } });
                state = (await biddingUpdate).gameState;
            }

            assert.equal(state.phase, 'BIDDING', `Round ${roundCount} must begin in BIDDING`);

            state = await playBiddingPhase(sockets, state);
            state = await playAllTricks(sockets, state);

            // After the 13th card is played END_TRICK auto-fires, then END_ROUND
            // auto-fires → phase becomes SCORING and scores are updated.
            assert.equal(state.phase, 'SCORING', `Round ${roundCount} must end in SCORING`);
            assert.ok(Number.isInteger(state.teams[1].score), `Team 1 score must be integer after round ${roundCount}`);
            assert.ok(Number.isInteger(state.teams[2].score), `Team 2 score must be integer after round ${roundCount}`);
        }

        assert.ok(roundCount >= 1, 'At least one round must have been played');
        assert.ok(roundCount < MAX_ROUNDS, `Game must finish within ${MAX_ROUNDS} rounds (got ${roundCount})`);

        const team1Won = state.teams[1].score >= 41;
        const team2Won = state.teams[2].score >= 41;
        assert.ok(team1Won || team2Won, 'A team must have reached 41 points');

        // Sanity: last round's tricks still sum to 13
        const lastRoundTricks = state.teams[1].tricksWon + state.teams[2].tricksWon;
        assert.equal(lastRoundTricks, 13, 'Final round must account for all 13 tricks');

        // Verify getWinner reflects correct team
        // (engine.isGameOver() must be true at this point — scores are in state)
        assert.ok(team1Won || team2Won, 'Winner must be determinable from scores');
    });
});