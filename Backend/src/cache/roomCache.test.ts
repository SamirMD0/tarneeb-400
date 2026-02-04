// Backend/src/cache/roomCache.test.ts - Phase 16: Redis Caching Tests

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { roomCache } from './roomCache.js';
import { Room } from '../rooms/room.js';
import { redis } from '../lib/redis.js';

// Mock redis.getClient to return a mock client
mock.module('../lib/redis.js', {
    namedExports: {
        redis: { getClient: mock.fn() },
    },
});

describe('RoomCache', () => {
    let mockClient: any;
    const mockRoomId = 'room_test_123';
    const mockConfig = { maxPlayers: 4, isPrivate: false };

    beforeEach(() => {
        // Setup mock Redis client
        mockClient = {
            set: mock.fn(),
            get: mock.fn(),
            del: mock.fn(),
            scan: mock.fn(),
            mGet: mock.fn(),
        };

        (redis.getClient as any).mockImplementation(() => mockClient);
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('should cache a room with correct TTL', async () => {
        const room = new Room(mockRoomId, mockConfig);
        room.addPlayer('p1', 'Player 1');

        await roomCache.cacheRoom(room);

        assert.strictEqual(mockClient.set.mock.callCount(), 1);
        const [key, value, options] = mockClient.set.mock.calls[0].arguments;

        assert.strictEqual(key, `room:${mockRoomId}`);
        assert.ok(typeof value === 'string');
        const parsed = JSON.parse(value);
        assert.strictEqual(parsed.id, mockRoomId);
        assert.strictEqual(parsed.players.length, 1);
        assert.strictEqual(options.EX, 3600); // TTL_WAITING
    });

    it('should retrieve and deserialize a room', async () => {
        const cachedData = JSON.stringify({
            id: mockRoomId,
            config: mockConfig,
            players: [['p1', { id: 'p1', name: 'Player 1', isConnected: true }]],
            hasGame: false,
            updatedAt: Date.now(),
        });

        mockClient.get.mockResolvedValue(cachedData);

        const room = await roomCache.getRoom(mockRoomId);

        assert.ok(room instanceof Room);
        assert.strictEqual(room?.id, mockRoomId);
        assert.strictEqual(room?.players.size, 1);
        assert.strictEqual(room?.players.get('p1')?.name, 'Player 1');
    });

    it('should return undefined if room not found in cache', async () => {
        mockClient.get.mockResolvedValue(null);

        const room = await roomCache.getRoom(mockRoomId);
        assert.strictEqual(room, undefined);
    });

    it('should handle GameEngine state deserialization', async () => {
        // We'll mock the JSON structure of a game state
        const cachedData = JSON.stringify({
            id: mockRoomId,
            config: mockConfig,
            players: [
                ['p1', { id: 'p1', name: 'P1', isConnected: true }],
                ['p2', { id: 'p2', name: 'P2', isConnected: true }],
                ['p3', { id: 'p3', name: 'P3', isConnected: true }],
                ['p4', { id: 'p4', name: 'P4', isConnected: true }],
            ],
            hasGame: true,
            gameState: {
                players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
                teams: { 1: {}, 2: {} },
                phase: 'BIDDING',
            },
        });

        mockClient.get.mockResolvedValue(cachedData);

        const room = await roomCache.getRoom(mockRoomId);

        assert.ok(room?.gameEngine);
        // Checking if state was injected (via our known hack/implementation in RoomCache)
        const state = room!.gameEngine!.getState();
        assert.strictEqual(state.phase, 'BIDDING');
    });

    it('should delete room from cache', async () => {
        await roomCache.deleteRoom(mockRoomId);
        assert.strictEqual(mockClient.del.mock.callCount(), 1);
        assert.strictEqual(mockClient.del.mock.calls[0].arguments[0], `room:${mockRoomId}`);
    });

    it('should degrade gracefully if Redis is unavailable', async () => {
        (redis.getClient as any).mockImplementation(() => undefined);

        // Should not throw
        await roomCache.cacheRoom(new Room(mockRoomId, mockConfig));
        const room = await roomCache.getRoom(mockRoomId);

        assert.strictEqual(room, undefined);
    });
});
