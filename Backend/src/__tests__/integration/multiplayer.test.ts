// Backend/src/__tests__/integration/multiplayer.test.ts — Phase 21
// Multi-socket concurrency, disconnect handling, error isolation, and multi-room independence.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
    createTestServer,
    teardownTestServer,
    createTestClient,
    createFullRoom,
    startGame,
    pickCard,
    buildSocketMap,
    waitForEvent,
    connectClient,
    DEFAULT_TIMEOUT,
    type TestContext,
    type ClientSocket,
} from '../setup.js';

describe('Multiplayer Socket Integration', { timeout: DEFAULT_TIMEOUT }, () => {
    let ctx: TestContext;

    before(async () => {
        ctx = await createTestServer();
    });

    after(async () => {
        await teardownTestServer(ctx);
    });

    it('should broadcast player_disconnected when a player drops mid-game', async () => {
        const { sockets } = await createFullRoom(ctx);
        const [s1, s2, s3, s4] = sockets;

        await startGame(sockets);

        // s4 disconnects
        const disconnectPromise = waitForEvent<any>(s1, 'player_disconnected');
        s4.disconnect();
        const event = await disconnectPromise;

        assert.ok(event.playerId, 'Should include playerId in disconnect event');
        assert.ok(event.room, 'Should include room state in disconnect event');
    });

    it('should isolate errors: invalid action from one player does not affect others', async () => {
        const { sockets } = await createFullRoom(ctx);
        const [s1, s2, s3, s4] = sockets;

        const started = await startGame(sockets);
        const state = started.gameState;
        const socketMap = buildSocketMap(sockets);

        // The current player is the bidder; a different player tries to bid (out of turn)
        const currentIdx = state.currentPlayerIndex;
        const wrongPlayerIdx = (currentIdx + 1) % 4;
        const wrongPlayerId = state.players[wrongPlayerIdx].id as string;
        const wrongSocket = socketMap.get(wrongPlayerId)!;

        // Wrong player bids — should get an error
        const errorPromise = waitForEvent<any>(wrongSocket, 'error');
        wrongSocket.emit('place_bid', { value: 8 });
        const err = await errorPromise;
        assert.equal(err.code, 'INVALID_ACTION');

        // Correct player should still be able to bid successfully
        const correctPlayerId = state.players[currentIdx].id as string;
        const correctSocket = socketMap.get(correctPlayerId)!;
        const updatePromise = waitForEvent<any>(s1, 'game_state_updated');
        correctSocket.emit('place_bid', { value: 7 });
        const update = await updatePromise;
        assert.equal(update.gameState.highestBid, 7);
    });

    it('should operate two independent rooms without state leakage', async () => {
        // Room 1
        const room1 = await createFullRoom(ctx);
        const started1Event = await startGame(room1.sockets);
        let state1 = started1Event.gameState;

        // Room 2
        const room2 = await createFullRoom(ctx);
        const started2Event = await startGame(room2.sockets);
        let state2 = started2Event.gameState;

        // Room 1: bidder bids 7
        const socketMap1 = buildSocketMap(room1.sockets);
        const bidder1Id = state1.players[state1.currentPlayerIndex].id as string;
        const bidder1Socket = socketMap1.get(bidder1Id)!;

        const update1Promise = waitForEvent<any>(room1.sockets[0], 'game_state_updated');
        bidder1Socket.emit('place_bid', { value: 7 });
        const update1 = await update1Promise;
        state1 = update1.gameState;

        // Room 2: bidder bids 8
        const socketMap2 = buildSocketMap(room2.sockets);
        const bidder2Id = state2.players[state2.currentPlayerIndex].id as string;
        const bidder2Socket = socketMap2.get(bidder2Id)!;

        const update2Promise = waitForEvent<any>(room2.sockets[0], 'game_state_updated');
        bidder2Socket.emit('place_bid', { value: 8 });
        const update2 = await update2Promise;
        state2 = update2.gameState;

        // Verify independence
        assert.equal(state1.highestBid, 7, 'Room 1 should have bid 7');
        assert.equal(state2.highestBid, 8, 'Room 2 should have bid 8');
        assert.notEqual(room1.roomId, room2.roomId, 'Room IDs should be different');
    });

    it('should reject joining a full room', async () => {
        const { roomId } = await createFullRoom(ctx);

        // 5th player tries to join
        const latePlayer = createTestClient(ctx);
        await connectClient(latePlayer);

        const errPromise = waitForEvent<any>(latePlayer, 'error');
        latePlayer.emit('join_room', { roomId, playerName: 'Late' });
        const err = await errPromise;

        assert.equal(err.code, 'ROOM_FULL');
    });

    it('should handle starting game with fewer than 4 players', async () => {
        // Only 2 players join
        const s1 = createTestClient(ctx);
        const s2 = createTestClient(ctx);
        await Promise.all([connectClient(s1), connectClient(s2)]);

        s1.emit('create_room', { config: { maxPlayers: 4 }, playerName: 'P1' });
        const created = await waitForEvent<any>(s1, 'room_created');
        const roomId = created.roomId;

        s2.emit('join_room', { roomId, playerName: 'P2' });
        await waitForEvent(s2, 'room_joined');

        // Try starting with only 2 players
        const errPromise = waitForEvent<any>(s1, 'error');
        s1.emit('start_game', {});
        const err = await errPromise;
        assert.equal(err.code, 'START_GAME_FAILED');
    });
});
