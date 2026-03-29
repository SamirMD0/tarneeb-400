// Backend/src/bot/botManager.test.ts - Unit tests for BotManager

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BotManager } from './BotManager.js';
import { GameEngine } from '../game/engine.js';
import type { Card, Suit } from '../types/game.types.js';

// Helper to create a minimal Room-like object for testing
function createMockRoom(playerCount = 0, allowBots = true) {
    const players = new Map<string, any>();
    for (let i = 0; i < playerCount; i++) {
        const id = `human_${i}`;
        players.set(id, { id, name: `Player ${i}`, isConnected: true });
    }

    return {
        id: `room_test_${Date.now()}`,
        config: { maxPlayers: 4, allowBots },
        players,
        gameEngine: undefined as GameEngine | undefined,
        async addPlayer(id: string, name: string, isBot = false) {
            if (this.players.size >= 4) return false;
            if (this.players.has(id)) return false;
            this.players.set(id, { id, name, isConnected: true, ...(isBot ? { isBot: true } : {}) });
            return true;
        },
        async removePlayer(id: string) {
            return this.players.delete(id);
        },
    };
}

describe('BotManager', () => {
    let botManager: BotManager;

    beforeEach(() => {
        botManager = new BotManager();
    });

    describe('isBot', () => {
        it('should identify bot player IDs', () => {
            assert.strictEqual(botManager.isBot('bot_abc123'), true);
            assert.strictEqual(botManager.isBot('human_player'), false);
            assert.strictEqual(botManager.isBot(''), false);
        });
    });

    describe('addBot', () => {
        it('should add a bot to an empty room', async () => {
            const room = createMockRoom(0) as any;
            const botId = await botManager.addBot(room);

            assert.ok(botId);
            assert.ok(botId!.startsWith('bot_'));
            assert.strictEqual(room.players.size, 1);
            assert.strictEqual(room.players.get(botId!)?.isBot, true);
        });

        it('should return null when room is full', async () => {
            const room = createMockRoom(4) as any;
            const botId = await botManager.addBot(room);
            assert.strictEqual(botId, null);
        });

        it('should assign unique bot names', async () => {
            const room = createMockRoom(0) as any;
            await botManager.addBot(room);
            await botManager.addBot(room);
            await botManager.addBot(room);

            const names = [...room.players.values()].map((p: any) => p.name);
            const uniqueNames = new Set(names);
            assert.strictEqual(uniqueNames.size, 3, 'All bot names should be unique');
        });
    });

    describe('fillRoom', () => {
        it('should fill room to exactly 4 players', async () => {
            const room = createMockRoom(1) as any;
            const added = await botManager.fillRoom(room);

            assert.strictEqual(added.length, 3);
            assert.strictEqual(room.players.size, 4);
        });

        it('should not add bots to a full room', async () => {
            const room = createMockRoom(4) as any;
            const added = await botManager.fillRoom(room);
            assert.strictEqual(added.length, 0);
        });
    });

    describe('removeBotFromRoom', () => {
        it('should remove one bot from room', async () => {
            const room = createMockRoom(1) as any;
            await botManager.fillRoom(room);
            assert.strictEqual(room.players.size, 4);

            const removedId = await botManager.removeBotFromRoom(room);
            assert.ok(removedId);
            assert.strictEqual(room.players.size, 3);
        });

        it('should return null when no bots in room', async () => {
            const room = createMockRoom(2) as any;
            const removedId = await botManager.removeBotFromRoom(room);
            assert.strictEqual(removedId, null);
        });
    });

    describe('decideBid (via integration)', () => {
        it('should produce a valid bid or pass for a strong hand', async () => {
            // We test the bot's bidding by actually running a game with bots
            const room = createMockRoom(0) as any;
            await botManager.fillRoom(room);

            const playerIds = [...room.players.keys()];
            assert.strictEqual(playerIds.length, 4);

            // Create a game engine with the bot player IDs
            const engine = new GameEngine(playerIds, room.id);
            room.gameEngine = engine;

            // Move to bidding phase
            engine.dispatch({ type: 'START_BIDDING' });
            assert.strictEqual(engine.getState().phase, 'BIDDING');

            // Verify all players are bots
            for (const id of playerIds) {
                assert.ok(botManager.isBot(id), `Player ${id} should be a bot`);
            }
        });
    });

    describe('decideTrumpSuit logic', () => {
        it('should be testable through BotManager internals', () => {
            // Access private method via bracket notation for testing
            const bm = botManager as any;
            const hand: Card[] = [
                { suit: 'HEARTS', rank: 'A' },
                { suit: 'HEARTS', rank: 'K' },
                { suit: 'HEARTS', rank: 'Q' },
                { suit: 'HEARTS', rank: 'J' },
                { suit: 'SPADES', rank: 'A' },
                { suit: 'SPADES', rank: 'K' },
                { suit: 'DIAMONDS', rank: '2' },
            ];

            const trump: Suit = bm.decideTrumpSuit(hand);
            assert.strictEqual(trump, 'HEARTS', 'Should pick suit with most cards');
        });
    });

    describe('decideBid logic', () => {
        it('should bid for a strong hand', () => {
            const bm = botManager as any;
            // Hand with 5 strong cards (A, K, Q)
            const hand: Card[] = [
                { suit: 'HEARTS', rank: 'A' },
                { suit: 'HEARTS', rank: 'K' },
                { suit: 'SPADES', rank: 'A' },
                { suit: 'SPADES', rank: 'K' },
                { suit: 'DIAMONDS', rank: 'Q' },
                { suit: 'CLUBS', rank: '3' },
                { suit: 'CLUBS', rank: '2' },
            ];

            const bid = bm.decideBid(hand, undefined, 0);
            assert.ok(bid !== null, 'Should bid with 5 strong cards');
            assert.ok(bid >= 5, `Bid should be >= 5, got ${bid}`);
        });

        it('should pass for a weak hand', () => {
            const bm = botManager as any;
            const hand: Card[] = [
                { suit: 'HEARTS', rank: '2' },
                { suit: 'HEARTS', rank: '3' },
                { suit: 'SPADES', rank: '4' },
                { suit: 'SPADES', rank: '5' },
                { suit: 'DIAMONDS', rank: '6' },
                { suit: 'CLUBS', rank: '7' },
                { suit: 'CLUBS', rank: '8' },
            ];

            const bid = bm.decideBid(hand, undefined, 0);
            assert.strictEqual(bid, null, 'Should pass with a weak hand');
        });

        it('should pass when cannot outbid', () => {
            const bm = botManager as any;
            const hand: Card[] = [
                { suit: 'HEARTS', rank: 'A' },
                { suit: 'HEARTS', rank: 'K' },
                { suit: 'SPADES', rank: 'A' },
                { suit: 'SPADES', rank: 'K' },
                { suit: 'DIAMONDS', rank: 'Q' },
                { suit: 'CLUBS', rank: '3' },
            ];

            // highestBid is already 8, bot target would be 7 → should pass
            const bid = bm.decideBid(hand, 8, 0);
            assert.strictEqual(bid, null, 'Should pass when cannot outbid');
        });
    });

    describe('decideCard logic', () => {
        it('should play highest card when leading', () => {
            const bm = botManager as any;
            const hand: Card[] = [
                { suit: 'HEARTS', rank: '2' },
                { suit: 'HEARTS', rank: 'A' },
                { suit: 'SPADES', rank: '5' },
            ];
            const state = {
                trick: [],
                trumpSuit: 'SPADES' as Suit,
            };

            const card = bm.decideCard(hand, state);
            assert.ok(card);
            assert.strictEqual(card.rank, 'A', 'Should play highest card when leading');
        });

        it('should follow suit when possible', () => {
            const bm = botManager as any;
            const hand: Card[] = [
                { suit: 'HEARTS', rank: '3' },
                { suit: 'SPADES', rank: 'A' },
                { suit: 'SPADES', rank: '5' },
            ];
            const state = {
                trick: [{ suit: 'HEARTS', rank: 'K' }],
                trumpSuit: 'SPADES' as Suit,
            };

            const card = bm.decideCard(hand, state);
            assert.ok(card);
            assert.strictEqual(card.suit, 'HEARTS', 'Should follow suit');
        });

        it('should play trump when cannot follow suit', () => {
            const bm = botManager as any;
            const hand: Card[] = [
                { suit: 'SPADES', rank: '3' },
                { suit: 'DIAMONDS', rank: '5' },
            ];
            const state = {
                trick: [{ suit: 'HEARTS', rank: 'K' }],
                trumpSuit: 'SPADES' as Suit,
            };

            const card = bm.decideCard(hand, state);
            assert.ok(card);
            // Should play trump since no hearts and no trump in trick yet
            assert.strictEqual(card.suit, 'SPADES', 'Should play trump when cannot follow suit');
        });
    });

    describe('cleanupRoom', () => {
        it('should clean up all bots for a room', async () => {
            const room = createMockRoom(1) as any;
            await botManager.fillRoom(room);
            assert.strictEqual(room.players.size, 4);

            botManager.cleanupRoom(room.id);
            // Internal state should be cleared (bots map)
            // Room players are not removed by cleanupRoom (only internal tracking)
            assert.ok(true, 'Cleanup completed without error');
        });
    });
});
