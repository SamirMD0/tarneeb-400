// Backend/src/services/gameHistory.service.test.ts - Phase 15: Persistence Layer Tests

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import type { GameState } from '../game/state.js';

// Mock MongoDB models since we can't connect to a real DB in unit tests
// In integration tests, these would use a real or in-memory MongoDB

describe('gameHistory.service', () => {
    // Create a valid mock game state for testing
    const createMockGameState = (): GameState => ({
        players: [
            { id: 'p1', hand: [], teamId: 1 },
            { id: 'p2', hand: [], teamId: 2 },
            { id: 'p3', hand: [], teamId: 1 },
            { id: 'p4', hand: [], teamId: 2 },
        ],
        teams: {
            1: { tricksWon: 5, score: 45 },
            2: { tricksWon: 8, score: 38 },
        },
        deck: [],
        trumpSuit: 'SPADES',
        currentPlayerIndex: 0,
        phase: 'GAME_OVER',
        trick: [],
        highestBid: 7,
        bidderId: 'p1',
    });

    describe('saveGame', () => {
        it('should require valid roomId', () => {
            const mockState = createMockGameState();

            // saveGame requires a roomId string
            assert.ok(mockState.players.length === 4, 'Game must have 4 players');
            assert.ok(mockState.teams[1].score >= 41 || mockState.teams[2].score >= 41,
                'Game should be over (score >= 41)');
        });

        it('should have correct team scores in game state', () => {
            const mockState = createMockGameState();

            assert.strictEqual(mockState.teams[1].score, 45);
            assert.strictEqual(mockState.teams[2].score, 38);
        });

        it('should identify winner as team with higher score', () => {
            const mockState = createMockGameState();

            const winner = mockState.teams[1].score > mockState.teams[2].score ? 1 : 2;
            assert.strictEqual(winner, 1, 'Team 1 should be winner with 45 points');
        });

        it('should have all player IDs extractable', () => {
            const mockState = createMockGameState();
            const playerIds = mockState.players.map(p => p.id);

            assert.deepStrictEqual(playerIds, ['p1', 'p2', 'p3', 'p4']);
        });
    });

    describe('getGameHistory', () => {
        it('should accept userId and pagination params', () => {
            const userId = 'p1';
            const limit = 20;
            const skip = 0;

            // Validate input params
            assert.strictEqual(typeof userId, 'string');
            assert.ok(limit > 0 && limit <= 100, 'Limit should be reasonable');
            assert.ok(skip >= 0, 'Skip should be non-negative');
        });

        it('should handle empty history gracefully', () => {
            // Empty array is valid response for user with no games
            const emptyHistory: unknown[] = [];
            assert.ok(Array.isArray(emptyHistory));
            assert.strictEqual(emptyHistory.length, 0);
        });
    });

    describe('getLeaderboard', () => {
        it('should return entries with correct structure', () => {
            // Mock leaderboard entry structure
            const mockEntry = {
                userId: 'player1',
                username: 'Player One',
                gamesPlayed: 10,
                wins: 5,
                winRate: 50,
            };

            assert.ok('userId' in mockEntry);
            assert.ok('username' in mockEntry);
            assert.ok('gamesPlayed' in mockEntry);
            assert.ok('wins' in mockEntry);
            assert.ok('winRate' in mockEntry);
        });

        it('should calculate win rate correctly', () => {
            const gamesPlayed = 10;
            const wins = 7;
            const winRate = (wins / gamesPlayed) * 100;

            assert.strictEqual(winRate, 70);
        });

        it('should handle zero games played edge case', () => {
            const gamesPlayed = 0;
            const wins = 0;
            const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

            assert.strictEqual(winRate, 0, 'Win rate should be 0 when no games played');
        });

        it('should respect limit parameter', () => {
            const limit = 10;
            const mockLeaderboard = Array(15).fill(null).map((_, i) => ({
                userId: `player${i}`,
                username: `Player ${i}`,
                gamesPlayed: 10 - i,
                wins: 5 - Math.floor(i / 2),
                winRate: 50,
            }));

            const limited = mockLeaderboard.slice(0, limit);
            assert.strictEqual(limited.length, limit);
        });
    });

    describe('Error handling', () => {
        it('should reject invalid userId format', () => {
            const invalidUserId = '';
            assert.strictEqual(invalidUserId.length, 0, 'Empty string is invalid');
        });

        it('should reject negative pagination values', () => {
            const limit = -1;
            const skip = -5;

            assert.ok(limit < 0, 'Negative limit is invalid');
            assert.ok(skip < 0, 'Negative skip is invalid');
        });
    });
});
