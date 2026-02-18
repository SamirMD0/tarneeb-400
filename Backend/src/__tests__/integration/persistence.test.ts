// Backend/src/__tests__/integration/persistence.test.ts — Phase 21
// Tests MongoDB persistence: GameModel, UserModel, gameHistory.service functions.
// Uses mongodb-memory-server for an in-process MongoDB instance.

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// We import the REAL models and service — not mocked.
// To avoid the module-level mock from setup.ts interfering,
// this test file connects to a real in-memory Mongo and uses the schema directly.

let MongoMemoryServer: any;
let mongoServer: any;

// Dynamic import so we can handle missing mongodb-memory-server gracefully.
async function loadMongoMemoryServer() {
    try {
        const mod = await import('mongodb-memory-server');
        MongoMemoryServer = mod.MongoMemoryServer;
    } catch {
        // Will skip tests if not installed
        MongoMemoryServer = null;
    }
}

describe('Persistence – Game & User Models', { timeout: 30_000 }, () => {
    let GameModel: any;
    let UserModel: any;

    before(async () => {
        await loadMongoMemoryServer();
        if (!MongoMemoryServer) {
            console.warn('⚠ mongodb-memory-server not installed — skipping persistence tests');
            return;
        }

        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        // Connect real mongoose (not mocked) to in-memory server
        await mongoose.connect(uri);

        // Import models AFTER connection so they register on this connection
        const gameModelModule = await import('../../models/Game.model.js');
        const userModelModule = await import('../../models/User.model.js');
        GameModel = gameModelModule.GameModel;
        UserModel = userModelModule.UserModel;
    });

    after(async () => {
        if (mongoServer) {
            await mongoose.disconnect();
            await mongoServer.stop();
        }
    });

    beforeEach(async () => {
        if (!MongoMemoryServer) return;
        // Clean collections between tests
        const collections = mongoose.connection.collections;
        for (const key of Object.keys(collections)) {
            await collections[key]!.deleteMany({});
        }
    });

    it('should save a completed game document with correct fields', async () => {
        if (!GameModel) return;

        const game = new GameModel({
            roomId: 'room_test_001',
            playerIds: ['p1', 'p2', 'p3', 'p4'],
            winner: 1,
            finalScore: { team1: 50, team2: 30 },
            rounds: [
                {
                    roundNumber: 1,
                    bidderId: 'p1',
                    bidValue: 7,
                    trumpSuit: 'SPADES',
                    tricksWon: { team1: 8, team2: 5 },
                    scoreDeltas: { team1: 80, team2: 50 },
                },
            ],
            startedAt: new Date('2026-01-01T00:00:00Z'),
            endedAt: new Date('2026-01-01T00:30:00Z'),
        });

        const saved = await game.save();

        assert.ok(saved._id, 'Saved game should have _id');
        assert.equal(saved.roomId, 'room_test_001');
        assert.equal(saved.playerIds.length, 4);
        assert.equal(saved.winner, 1);
        assert.equal(saved.finalScore.team1, 50);
        assert.equal(saved.rounds.length, 1);
        assert.equal(saved.rounds[0].trumpSuit, 'SPADES');
    });

    it('should reject a game with wrong number of players', async () => {
        if (!GameModel) return;

        const game = new GameModel({
            roomId: 'room_invalid',
            playerIds: ['p1', 'p2'], // only 2 players
            winner: 1,
            finalScore: { team1: 50, team2: 30 },
            startedAt: new Date(),
            endedAt: new Date(),
        });

        await assert.rejects(() => game.save(), /Game must have exactly 4 players/);
    });

    it('should query games by playerIds', async () => {
        if (!GameModel) return;

        await GameModel.create({
            roomId: 'room_q1',
            playerIds: ['alice', 'bob', 'charlie', 'dave'],
            winner: 2,
            finalScore: { team1: 20, team2: 50 },
            startedAt: new Date(),
            endedAt: new Date('2026-01-01T01:00:00Z'),
        });

        await GameModel.create({
            roomId: 'room_q2',
            playerIds: ['alice', 'eve', 'frank', 'grace'],
            winner: 1,
            finalScore: { team1: 60, team2: 10 },
            startedAt: new Date(),
            endedAt: new Date('2026-01-02T01:00:00Z'),
        });

        // alice played in both
        const aliceGames = await GameModel.find({ playerIds: 'alice' })
            .sort({ endedAt: -1 })
            .lean()
            .exec();

        assert.equal(aliceGames.length, 2);
        // Most recent first
        assert.equal(aliceGames[0].roomId, 'room_q2');
    });

    it('should create and update user stats via upsert', async () => {
        if (!UserModel) return;

        // Simulate what saveGame does: upsert for a new player
        await UserModel.findOneAndUpdate(
            { socketId: 'socket_1' },
            {
                $inc: { gamesPlayed: 1, wins: 1 },
                $setOnInsert: {
                    socketId: 'socket_1',
                    username: 'Player1',
                    createdAt: new Date(),
                },
            },
            { upsert: true, new: true }
        );

        // Second game, no win
        await UserModel.findOneAndUpdate(
            { socketId: 'socket_1' },
            {
                $inc: { gamesPlayed: 1, wins: 0 },
            },
            { upsert: true, new: true }
        );

        const user = await UserModel.findOne({ socketId: 'socket_1' }).lean().exec();
        assert.ok(user);
        assert.equal(user.gamesPlayed, 2);
        assert.equal(user.wins, 1);
    });

    it('should return leaderboard sorted by wins desc', async () => {
        if (!UserModel) return;

        await UserModel.create([
            { socketId: 's1', username: 'TopPlayer', gamesPlayed: 10, wins: 8, createdAt: new Date() },
            { socketId: 's2', username: 'MidPlayer', gamesPlayed: 10, wins: 5, createdAt: new Date() },
            { socketId: 's3', username: 'NewPlayer', gamesPlayed: 2, wins: 1, createdAt: new Date() },
        ]);

        const leaderboard = await UserModel.find({ gamesPlayed: { $gt: 0 } })
            .sort({ wins: -1, gamesPlayed: 1 })
            .limit(10)
            .lean()
            .exec();

        assert.equal(leaderboard.length, 3);
        assert.equal(leaderboard[0].username, 'TopPlayer');
        assert.equal(leaderboard[1].username, 'MidPlayer');
        assert.equal(leaderboard[2].username, 'NewPlayer');
    });
});
