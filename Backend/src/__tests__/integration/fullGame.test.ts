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
import { cleanupSocketData } from '../../sockets/socketMiddleware.js';

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

    async function playBiddingPhase(
        sockets: [ClientSocket, ClientSocket, ClientSocket, ClientSocket],
        state: any
    ): Promise<any> {
        const [s1] = sockets;
        const socketMap = buildSocketMap(sockets);

        const totalMinReq = state.players.reduce((sum: number, p: any) => sum + (p.score >= 40 ? 4 : p.score >= 30 ? 3 : 2), 0);
        let needed = Math.max(11, totalMinReq);
        const base = Math.ceil(needed / 4);

        for (let i = 0; i < 4; i++) {
            const bidderId = state.players[state.currentPlayerIndex].id as string;
            const bidderSocket = socketMap.get(bidderId)!;
            
            const bidUpdate = waitForEvent<any>(s1, 'game_state_updated');
            bidderSocket.emit('place_bid', { value: base });
            state = (await bidUpdate).gameState;
        }

        // After the 4th bid, it should auto-transition to PLAYING and set trump to HEARTS
        assert.equal(state.phase, 'PLAYING');
        assert.equal(state.trumpSuit, 'HEARTS');
        return state;
    }

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

                const playable = pickCard(currentSocket, state);
                assert.ok(playable, `Player ${currentId} must have a card`);

                const playUpdate = waitForEvent<any>(s1, 'game_state_updated');
                currentSocket.emit('play_card', { card: playable });
                state = (await playUpdate).gameState;
            }
            assert.equal(state.trick.length, 0);
            for (const s of sockets) {
                if (s.id) cleanupSocketData(s.id);
            }
        }

        return state;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tests
    // ─────────────────────────────────────────────────────────────────────────

    it('should complete room creation → bidding → 13 tricks → scoring', async () => {
        const { sockets } = await createFullRoom(ctx);
        const [s1] = sockets;

        const started = await startGame(sockets);
        let state = started.gameState;
        
        // Ensure initial bidding
        state = await playBiddingPhase(sockets, state);
        
        // 13 tricks
        state = await playAllTricks(sockets, state);

        const totalTricks = Object.values(state.teams).reduce((acc: any, t: any) => acc + t.tricksWon, 0);
        assert.equal(totalTricks, 13, 'Total tricks should equal 13');
    });

    it('should broadcast consistent state to all 4 clients during gameplay', async () => {
        const { sockets } = await createFullRoom(ctx);
        const started = await startGame(sockets);
        const socketMap = buildSocketMap(sockets);
        const state = started.gameState;

        const bidderId = state.players[state.currentPlayerIndex].id as string;
        const bidderSocket = socketMap.get(bidderId)!;

        const allUpdates = Promise.all(sockets.map((s) => waitForEvent<any>(s, 'game_state_updated')));
        bidderSocket.emit('place_bid', { value: 3 });
        const results = await allUpdates;

        for (const r of results) {
            assert.equal(r.gameState.playerBids[bidderId], 3, 'All clients should see player bid = 3');
        }
    });

    it('should play multiple rounds until a team reaches 41 points', async () => {
        const { sockets } = await createFullRoom(ctx);
        const [s1] = sockets;

        const started = await startGame(sockets);
        let state = started.gameState;

        let roundCount = 0;
        const MAX_ROUNDS = 20;

        function isGameOver(gameState: any) {
            for (const p of gameState.players) {
                if (p.score >= 41) {
                    const partner = gameState.players.find((p2: any) => p2.teamId === p.teamId && p2.id !== p.id);
                    if (partner && partner.score > 0) return true;
                }
            }
            return false;
        }

        while (!isGameOver(state) && roundCount < MAX_ROUNDS) {
            roundCount++;

            if (state.phase === 'SCORING' || state.phase === 'REDEAL') {
                const resetUpdate = waitForEvent<any>(s1, 'game_state_updated');
                s1.emit('game_action', { action: { type: 'START_NEXT_ROUND' } });
                state = (await resetUpdate).gameState;

                const biddingUpdate = waitForEvent<any>(s1, 'game_state_updated');
                s1.emit('game_action', { action: { type: 'START_BIDDING' } });
                state = (await biddingUpdate).gameState;
            }

            if (state.phase === 'BIDDING') {
                state = await playBiddingPhase(sockets, state);
            }
            
            if (state.phase === 'PLAYING') {
                state = await playAllTricks(sockets, state);
            }
        }

        assert.ok(roundCount >= 1, 'At least one round must have been played');
        assert.ok(roundCount < MAX_ROUNDS, `Game must finish within ${MAX_ROUNDS} rounds`);
        assert.equal(state.phase, 'GAME_OVER');
    });
});