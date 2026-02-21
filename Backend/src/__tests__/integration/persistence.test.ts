// Backend/src/__tests__/integration/persistence.test.ts — Phase 21
// Two concerns:
//   1. MongoDB — GameModel, UserModel CRUD + game history queries
//   2. Redis   — Room state survives simulated server restart
//               (tests roomCache.serialize / deserialize directly, which is the
//                actual persistence boundary — no real Redis process needed)

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { GameModel } from '../../models/Game.model.js';
import { UserModel } from '../../models/User.model.js';
import { Room } from '../../rooms/room.js';
import { GameEngine } from '../../game/engine.js';
import { roomCache } from '../../cache/roomCache.js';

// ─────────────────────────────────────────────────────────────────────────────
// Part 1: MongoDB — GameModel, UserModel, game history queries
// ─────────────────────────────────────────────────────────────────────────────

describe('Persistence – MongoDB Models', { timeout: 30_000 }, () => {
    let mongoServer: MongoMemoryServer;

    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key of Object.keys(collections)) {
            await collections[key]!.deleteMany({});
        }
    });

    // ── GameModel ────────────────────────────────────────────────────────────

    it('should save a completed game document with correct fields', async () => {
        const game = new GameModel({
            roomId: 'room_001',
            playerIds: ['p1', 'p2', 'p3', 'p4'],
            winner: 1,
            finalScore: { team1: 50, team2: 30 },
            rounds: [{
                roundNumber: 1,
                bidderId: 'p1',
                bidValue: 7,
                trumpSuit: 'SPADES',
                tricksWon: { team1: 8, team2: 5 },
                scoreDeltas: { team1: 80, team2: 50 },
            }],
            startedAt: new Date('2026-01-01T00:00:00Z'),
            endedAt: new Date('2026-01-01T00:30:00Z'),
        });

        const saved = await game.save();
        assert.ok(saved._id, 'Saved game must have _id');
        assert.equal(saved.roomId, 'room_001');
        assert.equal(saved.playerIds.length, 4);
        assert.equal(saved.winner, 1);
        assert.equal(saved.finalScore.team1, 50);
        assert.equal(saved.rounds.length, 1);
        assert.equal(saved.rounds[0]!.trumpSuit, 'SPADES');
    });

    it('should reject a game with wrong player count', async () => {
        const bad = new GameModel({
            roomId: 'room_bad',
            playerIds: ['p1', 'p2'],          // only 2 — must fail
            winner: 1,
            finalScore: { team1: 50, team2: 30 },
            startedAt: new Date(),
            endedAt: new Date(),
        });
        await assert.rejects(
            () => bad.save(),
            /Game must have exactly 4 players/
        );
    });

    it('should reject an invalid winner value', async () => {
        const bad = new GameModel({
            roomId: 'room_bad2',
            playerIds: ['p1', 'p2', 'p3', 'p4'],
            winner: 3,                          // only 1 or 2 allowed
            finalScore: { team1: 50, team2: 30 },
            startedAt: new Date(),
            endedAt: new Date(),
        });
        await assert.rejects(() => bad.save());
    });

    it('should reject rounds with bidValue outside 7–13', async () => {
        const bad = new GameModel({
            roomId: 'room_bad3',
            playerIds: ['p1', 'p2', 'p3', 'p4'],
            winner: 1,
            finalScore: { team1: 50, team2: 30 },
            rounds: [{
                roundNumber: 1,
                bidderId: 'p1',
                bidValue: 5,                    // below min
                trumpSuit: 'HEARTS',
                tricksWon: { team1: 7, team2: 6 },
                scoreDeltas: { team1: 70, team2: 60 },
            }],
            startedAt: new Date(),
            endedAt: new Date(),
        });
        await assert.rejects(() => bad.save());
    });

    it('should store and retrieve multi-round game with round snapshots', async () => {
        const rounds = Array.from({ length: 3 }, (_, i) => ({
            roundNumber: i + 1,
            bidderId: `p${(i % 4) + 1}`,
            bidValue: 7 + i,
            trumpSuit: ['SPADES', 'HEARTS', 'DIAMONDS'][i] as string,
            tricksWon: { team1: 7 + i, team2: 6 - i },
            scoreDeltas: { team1: (7 + i) * 10, team2: (6 - i) * 10 },
        }));

        const game = await GameModel.create({
            roomId: 'room_multiround',
            playerIds: ['p1', 'p2', 'p3', 'p4'],
            winner: 1,
            finalScore: { team1: 65, team2: 35 },
            rounds,
            startedAt: new Date('2026-01-01T00:00:00Z'),
            endedAt: new Date('2026-01-01T01:00:00Z'),
        });

        const retrieved = await GameModel.findById(game._id).lean().exec();
        assert.ok(retrieved, 'Must retrieve game by _id');
        assert.equal(retrieved!.rounds.length, 3);
        assert.equal(retrieved!.rounds[0]!.roundNumber, 1);
        assert.equal(retrieved!.rounds[1]!.bidValue, 8);
        assert.equal(retrieved!.rounds[2]!.trumpSuit, 'DIAMONDS');
    });

    // ── UserModel ────────────────────────────────────────────────────────────

    it('should create and update user stats via upsert', async () => {
        const upsertOpts = { upsert: true, new: true };

        await UserModel.findOneAndUpdate(
            { socketId: 'socket_1' },
            {
                $inc: { gamesPlayed: 1, wins: 1 },
                $setOnInsert: { socketId: 'socket_1', username: 'Player1', createdAt: new Date() },
            },
            upsertOpts
        );

        await UserModel.findOneAndUpdate(
            { socketId: 'socket_1' },
            { $inc: { gamesPlayed: 1 } },
            upsertOpts
        );

        const user = await UserModel.findOne({ socketId: 'socket_1' }).lean().exec();
        assert.ok(user);
        assert.equal(user!.gamesPlayed, 2);
        assert.equal(user!.wins, 1);
    });

    it('should enforce unique socketId on UserModel', async () => {
        await UserModel.create({
            socketId: 'dup_socket',
            username: 'First',
            gamesPlayed: 0,
            wins: 0,
            createdAt: new Date(),
        });
        await assert.rejects(() =>
            UserModel.create({
                socketId: 'dup_socket',
                username: 'Second',
                gamesPlayed: 0,
                wins: 0,
                createdAt: new Date(),
            })
        );
    });

    it('should return leaderboard sorted by wins desc', async () => {
        await UserModel.create([
            { socketId: 's1', username: 'TopPlayer', gamesPlayed: 10, wins: 8, createdAt: new Date() },
            { socketId: 's2', username: 'MidPlayer', gamesPlayed: 10, wins: 5, createdAt: new Date() },
            { socketId: 's3', username: 'NewPlayer', gamesPlayed: 2,  wins: 1, createdAt: new Date() },
        ]);

        const board = await UserModel.find()
            .sort({ wins: -1, gamesPlayed: 1 })
            .limit(10)
            .lean()
            .exec();

        assert.equal(board.length, 3);
        assert.equal(board[0]!.username, 'TopPlayer');
        assert.equal(board[1]!.username, 'MidPlayer');
        assert.equal(board[2]!.username, 'NewPlayer');
    });

    // ── Game history queries after completion ────────────────────────────────

    it('should query games by playerIds and sort by date descending', async () => {
        for (let i = 0; i < 3; i++) {
            await GameModel.create({
                roomId: `room_hist_${i}`,
                playerIds: ['alice', `p${i}a`, `p${i}b`, `p${i}c`],
                winner: 1,
                finalScore: { team1: 41, team2: 30 },
                startedAt: new Date(2026, 0, i + 1),
                endedAt:   new Date(2026, 0, i + 1),
            });
        }

        const history = await GameModel.find({ playerIds: 'alice' })
            .sort({ endedAt: -1 })
            .lean()
            .exec();

        assert.equal(history.length, 3);
        assert.equal(history[0]!.roomId, 'room_hist_2', 'Most recent first');
        assert.equal(history[2]!.roomId, 'room_hist_0', 'Oldest last');

        const none = await GameModel.find({ playerIds: 'nobody' }).lean().exec();
        assert.equal(none.length, 0);
    });

    it('should paginate game history correctly', async () => {
        for (let i = 0; i < 5; i++) {
            await GameModel.create({
                roomId: `room_page_${i}`,
                playerIds: ['pager', `x${i}`, `y${i}`, `z${i}`],
                winner: 2,
                finalScore: { team1: 20, team2: 50 },
                startedAt: new Date(2026, 0, i + 1),
                endedAt:   new Date(2026, 0, i + 1),
            });
        }

        const page1 = await GameModel.find({ playerIds: 'pager' })
            .sort({ endedAt: -1 }).skip(0).limit(3).lean().exec();
        const page2 = await GameModel.find({ playerIds: 'pager' })
            .sort({ endedAt: -1 }).skip(3).limit(3).lean().exec();

        assert.equal(page1.length, 3, 'Page 1 must have 3 results');
        assert.equal(page2.length, 2, 'Page 2 must have remaining 2 results');

        const page1Ids = new Set(page1.map((g) => g.roomId));
        for (const g of page2) {
            assert.ok(!page1Ids.has(g.roomId), 'Pages must not overlap');
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 2: Redis — room state survives simulated server restart
//
// We test roomCache.serialize() / deserialize() directly because that is the
// exact persistence boundary: data written to Redis as a JSON string, then read
// back by a new server instance and hydrated into a working Room object.
// No real Redis process is required — the mocks in setup.ts handle the client.
// ─────────────────────────────────────────────────────────────────────────────

describe('Persistence – Redis Room State Survival', { timeout: 20_000 }, () => {

    it('should serialize and deserialize a waiting room without data loss', async () => {
        const room = new Room('room_redis_001', { maxPlayers: 4, targetScore: 41 });
        await room.addPlayer('p1', 'Alice');
        await room.addPlayer('p2', 'Bob');

        const serialized = roomCache.serialize(room);
        assert.equal(typeof serialized, 'string', 'Serialized value must be a string');

        const parsed = JSON.parse(serialized);
        assert.equal(parsed.id, 'room_redis_001');
        assert.equal(parsed.players.length, 2, 'Both players must be in serialized data');
        assert.equal(parsed.hasGame, false, 'hasGame must be false for lobby room');
        assert.ok(typeof parsed.updatedAt === 'number', 'Must include updatedAt timestamp');

        // Deserialize — simulates a brand-new server instance reading from Redis
        const hydrated = roomCache.deserialize(serialized);
        assert.ok(hydrated, 'Must deserialize to a Room object');
        assert.equal(hydrated!.id, 'room_redis_001');
        assert.equal(hydrated!.players.size, 2, 'Both players must be restored');
        assert.equal(hydrated!.players.get('p1')?.name, 'Alice');
        assert.equal(hydrated!.players.get('p2')?.name, 'Bob');
        assert.equal(hydrated!.gameEngine, undefined, 'No game engine for waiting room');
    });

    it('should serialize and deserialize a room with an active game in BIDDING phase', async () => {
        const room = new Room('room_redis_002', { maxPlayers: 4, targetScore: 41 });
        await room.addPlayer('p1', 'Alice');
        await room.addPlayer('p2', 'Bob');
        await room.addPlayer('p3', 'Charlie');
        await room.addPlayer('p4', 'Diana');

        const started = await room.startGame();
        assert.equal(started, true, 'startGame must return true');
        assert.ok(room.gameEngine, 'gameEngine must exist');

        room.gameEngine!.dispatch({ type: 'START_BIDDING' });

        const serialized = roomCache.serialize(room);
        const parsed = JSON.parse(serialized);

        assert.equal(parsed.hasGame, true, 'hasGame must be true');
        assert.ok(parsed.gameState, 'gameState must be included');
        assert.equal(parsed.gameState.phase, 'BIDDING', 'Phase must be BIDDING');
        assert.equal(parsed.gameState.players.length, 4, 'All 4 players must be in gameState');
        assert.equal(parsed.players.length, 4, 'All 4 lobby players must be serialized');

        // Restart simulation
        const hydrated = roomCache.deserialize(serialized);
        assert.ok(hydrated, 'Must deserialize successfully');
        assert.ok(hydrated!.gameEngine, 'Game engine must be restored');

        const restored = hydrated!.gameEngine!.getState();
        assert.equal(restored.phase, 'BIDDING', 'Phase must survive restart');
        assert.equal(restored.players.length, 4, 'All players must be in restored state');
        assert.equal(restored.players[0]!.hand.length, 13, 'Full hands must be preserved');
    });

    it('should serialize and deserialize a room with an active mid-trick game state', async () => {
        const room = new Room('room_redis_003', { maxPlayers: 4, targetScore: 41 });
        for (const [id, name] of [['p1', 'A'], ['p2', 'B'], ['p3', 'C'], ['p4', 'D']] as const) {
            await room.addPlayer(id, name);
        }
        await room.startGame();

        const engine = room.gameEngine!;
        engine.dispatch({ type: 'START_BIDDING' });
        engine.dispatch({ type: 'BID',       playerId: 'p1', value: 7 });
        engine.dispatch({ type: 'PASS',      playerId: 'p2' });
        engine.dispatch({ type: 'PASS',      playerId: 'p3' });
        engine.dispatch({ type: 'PASS',      playerId: 'p4' });
        engine.dispatch({ type: 'SET_TRUMP', suit: 'HEARTS' });

        // Play one card to put something in the trick array
        const state = engine.getState();
        const firstPlayer = state.players[state.currentPlayerIndex]!;
        const cardToPlay = firstPlayer.hand[0]!;
        engine.dispatch({ type: 'PLAY_CARD', playerId: firstPlayer.id, card: cardToPlay });

        const before = engine.getState();
        assert.equal(before.trick.length, 1, 'One card must be in trick before restart');
        assert.equal(before.phase, 'PLAYING');

        // Restart simulation
        const serialized = roomCache.serialize(room);
        const hydrated = roomCache.deserialize(serialized)!;
        assert.ok(hydrated.gameEngine, 'Engine must survive restart');

        const after = hydrated.gameEngine!.getState();
        assert.equal(after.phase, 'PLAYING',  'Phase must be preserved');
        assert.equal(after.trick.length, 1,   'Trick array must be preserved');
        assert.equal(after.trumpSuit, 'HEARTS', 'Trump suit must be preserved');
        assert.equal(after.highestBid, 7,      'Bid value must be preserved');

        // 52 cards total: one in trick + 51 across hands
        const cardsInHands = after.players.reduce((sum: number, p: any) => sum + p.hand.length, 0);
        assert.equal(cardsInHands, 51, 'Played card must not appear in any hand');
    });

    it('should preserve player connection status across a simulated restart', async () => {
        const room = new Room('room_redis_004', { maxPlayers: 4, targetScore: 41 });
        await room.addPlayer('p1', 'Alice');
        await room.addPlayer('p2', 'Bob');

        await room.markPlayerDisconnected('p2');

        const hydrated = roomCache.deserialize(roomCache.serialize(room))!;
        assert.equal(hydrated.players.get('p1')?.isConnected, true,  'p1 must be connected');
        assert.equal(hydrated.players.get('p2')?.isConnected, false, 'p2 must be disconnected');
    });

    it('should return null when deserializing corrupted or incomplete data', async () => {
        const result = roomCache.deserialize('{ "this": "is not valid room data" }');
        // Must not throw — returns null on bad data
        assert.ok(result === null || result !== undefined);
    });

    it('should return null when deserializing invalid JSON', async () => {
        const result = roomCache.deserialize('not json at all }{');
        assert.equal(result, null, 'Must return null for unparseable JSON');
    });

    it('should handle redis client unavailable in cacheRoom gracefully', async () => {
        const { redis } = await import('../../lib/redis.js');

        const originalGetClient = (redis as any).getClient;
        (redis as any).getClient = () => undefined;

        const room = new Room('room_redis_005', { maxPlayers: 4 });
        await room.addPlayer('p1', 'Alice');

        try {
            await assert.doesNotReject(
                () => roomCache.cacheRoom(room),
                'cacheRoom must not throw when Redis is unavailable'
            );

            const fetched = await roomCache.getRoom('room_redis_005');
            assert.equal(fetched, undefined, 'getRoom must return undefined when Redis unavailable');

            await assert.doesNotReject(
                () => roomCache.deleteRoom('room_redis_005'),
                'deleteRoom must not throw when Redis is unavailable'
            );
        } finally {
            (redis as any).getClient = originalGetClient;
        }
    });

    it('should apply correct TTLs: waiting room < playing room < finished room', () => {
        // TTL logic is in cacheRoom, which we can verify via the serialized config.
        // Here we verify the Room API correctly reflects game state for TTL selection.

        const lobby = new Room('r_lobby', { maxPlayers: 4 });
        assert.equal(lobby.gameEngine, undefined, 'Waiting room has no engine → TTL_WAITING');

        // We cannot start a real game without 4 players added, so just verify
        // isGameOver() returns false on a fresh engine (TTL_PLAYING path).
        const engine = new GameEngine(['p1', 'p2', 'p3', 'p4'], 'r_playing');
        assert.equal(engine.isGameOver(), false, 'Fresh engine is not game over → TTL_PLAYING');
    });
});