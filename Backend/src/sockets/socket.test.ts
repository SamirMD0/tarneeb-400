// Backend/src/socket/socket.test.ts - Phase 17: WebSocket Foundation Tests

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';
import ioClient from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { initializeSocketServer, getConnectionCount, getRoomCount } from './socketServer.js';
import { registerHandlers } from './socketHandlers.js';
import { getEnv, validateEnv } from '../lib/env.js';

type ClientSocket = ReturnType<typeof ioClient>;

describe('Socket.IO Server - Phase 17', () => {
    let httpServer: ReturnType<typeof createServer>;
    let io: Server;

    let serverPort: number;
    let clientSockets: ClientSocket[] = [];

    before(() => {
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = 'test-secret-minimum-32-chars-required!!';
        process.env.MONGO_URI = 'mongodb://localhost:27017/test';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.CORS_ORIGIN = 'http://localhost:3000';

        validateEnv();
    });

    beforeEach(async () => {
        // Create HTTP server
        httpServer = createServer();
        
        // Initialize Socket.IO
        io = initializeSocketServer(httpServer);
        registerHandlers(io);
        
        // Start server on random port
        await new Promise<void>((resolve) => {
            httpServer.listen(0, () => {
                serverPort = (httpServer.address() as any).port;
                resolve();
            });
        });
    });

    afterEach(async () => {
        // Disconnect all clients
        for (const socket of clientSockets) {
            socket.disconnect();
        }
        clientSockets = [];
        
        // Close server
        io.close();
        await new Promise<void>((resolve) => {
            httpServer.close(() => resolve());
        });
    });

    /**
     * Helper: Create a client socket
     */
    function createClient(userId?: string): ClientSocket {
        const env = getEnv();
        const token = jwt.sign(
            {
                userId: userId ?? `test-user-${randomUUID()}`,
                email: 'test@test.com',
            },
            env.JWT_SECRET
        );

        const socket = ioClient(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
            forceNew: true,
            auth: { token },
        });
        clientSockets.push(socket);
        return socket;
    }

    /**
     * Helper: Wait for socket event
     */
    function waitForEvent<T>(socket: ClientSocket, event: string): Promise<T> {
        return new Promise((resolve) => {
            socket.once(event, resolve);
        });
    }

    describe('Server Initialization', () => {
        it('should initialize Socket.IO server successfully', () => {
            assert.ok(io, 'Socket.IO server should be initialized');
            assert.strictEqual(typeof io.on, 'function');
        });

        it('should have CORS enabled', () => {
            // @ts-ignore - accessing private property for testing
            const corsOptions = io.opts.cors;
            assert.ok(corsOptions, 'CORS should be configured');
        });
    });

    describe('Connection Handling', () => {
        it('should accept client connections', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            assert.ok(client.connected, 'Client should be connected');
            assert.strictEqual(getConnectionCount(io), 1);
        });

        it('should handle multiple concurrent connections', async () => {
            const client1 = createClient();
            const client2 = createClient();
            const client3 = createClient();
            
            await Promise.all([
                new Promise<void>(resolve => client1.on('connect', () => resolve())),
                new Promise<void>(resolve => client2.on('connect', () => resolve())),
                new Promise<void>(resolve => client3.on('connect', () => resolve())),
            ]);
            
            assert.strictEqual(getConnectionCount(io), 3);
        });

        it('should handle client disconnection', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            assert.strictEqual(getConnectionCount(io), 1);
            
            client.disconnect();
            
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
            
            assert.strictEqual(getConnectionCount(io), 0);
        });

        it('should clean up rooms on disconnection', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });

            // FIX: register listener before emitting
            const createdPromise = waitForEvent<any>(client, 'room_created');
            client.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Test Player',
            });
            await createdPromise;
            
            assert.strictEqual(getRoomCount(io), 1);
            
            client.disconnect();
            
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
            
            // Room should be cleaned up
            assert.strictEqual(getRoomCount(io), 0);
        });
    });

    describe('Event Handler Registration', () => {
        it('should register create_room handler', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });

            // FIX: register listener before emitting
            const responsePromise = waitForEvent<any>(client, 'room_created');
            client.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Test Player',
            });
            const response = await responsePromise;
            
            assert.ok(response, 'Should receive room_created event');
            assert.ok(response.roomId, 'Response should include roomId');
        });

        it('should register join_room handler', async () => {
            const creator = createClient();
            const joiner = createClient();
            
            await Promise.all([
                new Promise<void>(resolve => creator.on('connect', () => resolve())),
                new Promise<void>(resolve => joiner.on('connect', () => resolve())),
            ]);

            // FIX: register listener before emitting
            const createResponsePromise = waitForEvent<any>(creator, 'room_created');
            creator.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Creator',
            });
            const createResponse = await createResponsePromise;
            const roomId = createResponse.roomId;

            // FIX: register listener before emitting
            const joinResponsePromise = waitForEvent<any>(joiner, 'room_joined');
            joiner.emit('join_room', {
                roomId,
                playerName: 'Joiner',
            });
            const joinResponse = await joinResponsePromise;
            
            assert.ok(joinResponse, 'Should receive room_joined event');
            assert.strictEqual(joinResponse.roomId, roomId);
        });

        it('should register leave_room handler', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });

            // FIX: register listener before emitting
            const createdPromise = waitForEvent<any>(client, 'room_created');
            client.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Test Player',
            });
            await createdPromise;

            // FIX: register listener before emitting
            const leaveResponsePromise = waitForEvent<any>(client, 'room_left');
            client.emit('leave_room', {});
            const leaveResponse = await leaveResponsePromise;
            
            assert.ok(leaveResponse, 'Should receive room_left event');
        });

        it('should register game_action handler', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            // Emit invalid action (game not started)
            const errorPromise = waitForEvent<any>(client, 'error');
            client.emit('game_action', {
                action: { type: 'START_BIDDING' },
            });
            const errorResponse = await errorPromise;
            
            assert.ok(errorResponse, 'Should receive error event');
            assert.strictEqual(errorResponse.code, 'NOT_IN_ROOM');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid room creation payload', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });

            const errorPromise = waitForEvent<any>(client, 'error');
            client.emit('create_room', {
                config: {}, // Missing maxPlayers
            });
            const errorResponse = await errorPromise;
            
            assert.ok(errorResponse, 'Should receive error event');
            assert.strictEqual(errorResponse.code, 'INVALID_CONFIG');
        });

        it('should handle joining non-existent room', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });

            const errorPromise = waitForEvent<any>(client, 'error');
            client.emit('join_room', {
                roomId: 'non_existent_room',
                playerName: 'Test Player',
            });
            const errorResponse = await errorPromise;
            
            assert.ok(errorResponse, 'Should receive error event');
            assert.strictEqual(errorResponse.code, 'ROOM_NOT_FOUND');
        });

        it('should handle leaving room when not in one', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });

            const errorPromise = waitForEvent<any>(client, 'error');
            client.emit('leave_room', {});
            const errorResponse = await errorPromise;
            
            assert.ok(errorResponse, 'Should receive error event');
            assert.strictEqual(errorResponse.code, 'NOT_IN_ROOM');
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limiting on rapid requests', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            // Emit 15 rapid requests (limit is 10/second)
            const promises: Promise<any>[] = [];
            for (let i = 0; i < 15; i++) {
                client.emit('create_room', {
                    config: { maxPlayers: 4 },
                    playerName: `Player${i}`,
                });
                
                // Collect error responses
                promises.push(
                    new Promise(resolve => {
                        const timeout = setTimeout(() => resolve(null), 200);
                        client.once('error', (data:any) => {
                            clearTimeout(timeout);
                            resolve(data);
                        });
                    })
                );
            }
            
            const responses = await Promise.all(promises);
            const rateLimitErrors = responses.filter(
                (r: any) => r && r.code === 'RATE_LIMIT_EXCEEDED'
            );
            
            assert.ok(rateLimitErrors.length > 0, 'Should receive rate limit errors');
        });
    });

    describe('Room Broadcasting', () => {
        it('should broadcast player_joined to existing room members', async () => {
            const creator = createClient();
            const joiner = createClient();
            
            await Promise.all([
                new Promise<void>(resolve => creator.on('connect', () => resolve())),
                new Promise<void>(resolve => joiner.on('connect', () => resolve())),
            ]);

            // FIX: register listener before emitting
            const createResponsePromise = waitForEvent<any>(creator, 'room_created');
            creator.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Creator',
            });
            const createResponse = await createResponsePromise;
            const roomId = createResponse.roomId;
            
            // Set up listener for player_joined BEFORE joiner emits
            const playerJoinedPromise = waitForEvent<any>(creator, 'player_joined');
            
            joiner.emit('join_room', {
                roomId,
                playerName: 'Joiner',
            });
            
            const playerJoinedEvent = await playerJoinedPromise;
            
            assert.ok(playerJoinedEvent, 'Creator should receive player_joined event');
            assert.strictEqual(playerJoinedEvent.playerName, 'Joiner');
        });

        it('should broadcast player_left to remaining room members', async () => {
            const player1 = createClient();
            const player2 = createClient();
            
            await Promise.all([
                new Promise<void>(resolve => player1.on('connect', () => resolve())),
                new Promise<void>(resolve => player2.on('connect', () => resolve())),
            ]);

            // FIX: listener before emit
            const createResponsePromise = waitForEvent<any>(player1, 'room_created');
            player1.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Player1',
            });
            const createResponse = await createResponsePromise;
            const roomId = createResponse.roomId;

            // FIX: listener before emit
            const joinedPromise = waitForEvent<any>(player2, 'room_joined');
            player2.emit('join_room', {
                roomId,
                playerName: 'Player2',
            });
            await joinedPromise;
            
            // Set up listener for player_left BEFORE player2 emits leave
            const playerLeftPromise = waitForEvent<any>(player1, 'player_left');
            
            player2.emit('leave_room', {});
            
            const playerLeftEvent = await playerLeftPromise;
            
            assert.ok(playerLeftEvent, 'Player1 should receive player_left event');
        });
    });

    describe('Phase 18: Socket Event Handlers', () => {
        type FourSockets = [ClientSocket, ClientSocket, ClientSocket, ClientSocket];

        async function createFullRoom(): Promise<{ roomId: string; sockets: FourSockets }> {
            const u1 = `test-user-${randomUUID()}`;
            const u2 = `test-user-${randomUUID()}`;
            const u3 = `test-user-${randomUUID()}`;
            const u4 = `test-user-${randomUUID()}`;

            const s1 = createClient(u1);
            const s2 = createClient(u2);
            const s3 = createClient(u3);
            const s4 = createClient(u4);

            (s1 as any).testUserId = u1;
            (s2 as any).testUserId = u2;
            (s3 as any).testUserId = u3;
            (s4 as any).testUserId = u4;

            await Promise.all([
                new Promise<void>(resolve => s1.on('connect', () => resolve())),
                new Promise<void>(resolve => s2.on('connect', () => resolve())),
                new Promise<void>(resolve => s3.on('connect', () => resolve())),
                new Promise<void>(resolve => s4.on('connect', () => resolve())),
            ]);

            // FIX: listener before emit to close the race window
            const createdPromise = waitForEvent<any>(s1, 'room_created');
            s1.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'P1',
            });
            const created = await createdPromise;
            const roomId = created.roomId as string;

            // FIX: all listeners registered before any emit
            const joinPromises = Promise.all([
                waitForEvent<any>(s2, 'room_joined'),
                waitForEvent<any>(s3, 'room_joined'),
                waitForEvent<any>(s4, 'room_joined'),
            ]);
            s2.emit('join_room', { roomId, playerName: 'P2' });
            s3.emit('join_room', { roomId, playerName: 'P3' });
            s4.emit('join_room', { roomId, playerName: 'P4' });
            await joinPromises;

            return { roomId, sockets: [s1, s2, s3, s4] };
        }

        async function startGameForRoom(sockets: FourSockets): Promise<void> {
            const [s1, s2, s3, s4] = sockets;

            const started = Promise.all([
                waitForEvent<any>(s1, 'game_started'),
                waitForEvent<any>(s2, 'game_started'),
                waitForEvent<any>(s3, 'game_started'),
                waitForEvent<any>(s4, 'game_started'),
            ]);

            s1.emit('start_game', {});
            await started;
        }

        it('should start game and broadcast game_started to all room members', async () => {
            const { roomId, sockets } = await createFullRoom();
            const [s1, s2, s3, s4] = sockets;

            const started = Promise.all([
                waitForEvent<any>(s1, 'game_started'),
                waitForEvent<any>(s2, 'game_started'),
                waitForEvent<any>(s3, 'game_started'),
                waitForEvent<any>(s4, 'game_started'),
            ]);

            s1.emit('start_game', {});
            const [e1, e2, e3, e4] = await started;

            assert.equal(e1.roomId, roomId);
            assert.equal(e2.roomId, roomId);
            assert.equal(e3.roomId, roomId);
            assert.equal(e4.roomId, roomId);
            assert.ok(e1.gameState);
        });

        it('should broadcast game_state_updated to all room members on place_bid', async () => {
            const { roomId, sockets } = await createFullRoom();
            const [s1, s2, s3, s4] = sockets;

            await startGameForRoom(sockets);

            const updates = Promise.all([
                waitForEvent<any>(s1, 'game_state_updated'),
                waitForEvent<any>(s2, 'game_state_updated'),
                waitForEvent<any>(s3, 'game_state_updated'),
                waitForEvent<any>(s4, 'game_state_updated'),
            ]);

            // Emit from all sockets — only the current player's bid (value 7) will be accepted.
            // The rest will get error events (silently ignored here).
            s1.emit('place_bid', { value: 7 });
            s2.emit('place_bid', { value: 7 });
            s3.emit('place_bid', { value: 7 });
            s4.emit('place_bid', { value: 7 });
            const [u1, u2, u3, u4] = await updates;

            assert.equal(u1.roomId, roomId);
            assert.equal(u2.roomId, roomId);
            assert.equal(u3.roomId, roomId);
            assert.equal(u4.roomId, roomId);
            assert.equal(u1.gameState.phase, 'BIDDING');
            assert.equal(u1.gameState.highestBid, 7);
        });

        /**
         * Helper: Complete a full 4-player bidding round so the game transitions to PLAYING.
         * Each player bids in turn order with escalating values (3, 4, 5, 6) totalling 18 >= 11 (minTotalBids).
         * Returns the last game_state_updated event received (should have phase === 'PLAYING').
         */
        async function completeBidding(sockets: FourSockets): Promise<any> {
            const [s1, s2, s3, s4] = sockets;
            const socketByUserId = new Map<string, ClientSocket>([
                [(s1 as any).testUserId as string, s1],
                [(s2 as any).testUserId as string, s2],
                [(s3 as any).testUserId as string, s3],
                [(s4 as any).testUserId as string, s4],
            ]);

            // Get current state to find turn order
            // After startGameForRoom, s1 should have received game_started which has gameState
            // We need the initial state — request it by placing a bid from whoever is current
            const bidValues = [3, 4, 5, 6]; // Each strictly > previous, total = 18 >= 11
            let lastUpdate: any = null;

            for (let i = 0; i < 4; i++) {
                // For the first bid, we need to know who goes first.
                // After START_BIDDING, currentPlayerIndex = (dealerIndex + 1) % 4.
                // We'll get the state from the game_state_updated after each bid.
                if (i === 0) {
                    // First bidder: we don't have a game_state_updated yet, so we
                    // need to figure out who bids first. After START_BIDDING with dealerIndex=0,
                    // currentPlayerIndex=1. But we don't know which socket that maps to.
                    // Instead, just try s1 first; if it's not s1's turn, the error will tell us.
                    // Actually — let's use the game_started state. We'll request a fresh state.
                    // Simpler: emit place_bid from all sockets with increasing values.
                    // Only the correct one will succeed (others get error silently).
                    // But that's not clean. Let's use game_action to query state.

                    // Alternative approach: just have each socket try to bid with its value.
                    // The reducer enforces turn order, so only the right socket's bid will be accepted.
                    // We listen for game_state_updated on s1 to track progress.
                    const updatePromise = waitForEvent<any>(s1, 'game_state_updated');

                    // Try all sockets — only the one whose turn it is will trigger an update
                    for (const [userId, sock] of socketByUserId) {
                        sock.emit('place_bid', { value: bidValues[i] });
                    }

                    lastUpdate = await updatePromise;
                } else {
                    const state = lastUpdate.gameState;
                    const currentIdx = state.currentPlayerIndex as number;
                    const currentPlayerId = state.players[currentIdx].id as string;
                    const currentSocket = socketByUserId.get(currentPlayerId);
                    assert.ok(currentSocket, `Bidding: socket for player index ${currentIdx} should exist`);

                    const updatePromise = waitForEvent<any>(s1, 'game_state_updated');
                    currentSocket.emit('place_bid', { value: bidValues[i]! });
                    lastUpdate = await updatePromise;
                }
            }

            assert.equal(lastUpdate.gameState.phase, 'PLAYING', 'Game should transition to PLAYING after valid bidding round');
            return lastUpdate;
        }

        it('should reject invalid play_card action (card not in hand)', async () => {
            const { sockets } = await createFullRoom();
            const [s1] = sockets;

            await startGameForRoom(sockets);

            // Complete a full bidding round to transition to PLAYING
            await completeBidding(sockets);

            const errPromise = waitForEvent<any>(s1, 'error');
            s1.emit('play_card', { card: { suit: 'SPADES', rank: 'X' } });
            const err = await errPromise;
            assert.equal(err.code, 'INVALID_ACTION');
        });

        it('should auto-trigger END_TRICK after 4 played cards', async () => {
            const { roomId, sockets } = await createFullRoom();
            const [s1, s2, s3, s4] = sockets;

            await startGameForRoom(sockets);

            // Complete a full bidding round to transition to PLAYING
            let lastUpdate = await completeBidding(sockets);

            assert.ok(s1.id, 'Socket id should be set');
            assert.ok(s2.id, 'Socket id should be set');
            assert.ok(s3.id, 'Socket id should be set');
            assert.ok(s4.id, 'Socket id should be set');

            const socketById = new Map<string, ClientSocket>([
                [(s1 as any).testUserId as string, s1],
                [(s2 as any).testUserId as string, s2],
                [(s3 as any).testUserId as string, s3],
                [(s4 as any).testUserId as string, s4],
            ]);

            function pickCard(socketId: string, gameState: any): any {
                const player = (gameState.players as any[]).find(p => p.id === socketId);
                const hand = player?.hand as any[] | undefined;
                if (!hand || hand.length === 0) return undefined;

                if ((gameState.trick as any[]).length === 0) return hand[0];

                const leadSuit = gameState.trick[0]?.suit;
                const follow = hand.find(c => c.suit === leadSuit);
                return follow || hand[0];
            }

            for (let i = 0; i < 4; i++) {
                const state = lastUpdate.gameState;
                const currentIdx = state.currentPlayerIndex as number;
                const currentPlayerId = state.players[currentIdx].id as string;
                const currentSocket = socketById.get(currentPlayerId);
                assert.ok(currentSocket, 'Current player socket should exist');

                assert.ok(currentSocket.id, 'Socket id should be set');
                const card = pickCard(currentPlayerId, state);
                assert.ok(card, 'Should pick a playable card');

                const nextUpdatePromise = waitForEvent<any>(s1, 'game_state_updated');
                currentSocket.emit('play_card', { card });
                lastUpdate = await nextUpdatePromise;
            }

            assert.equal(lastUpdate.roomId, roomId);
            assert.equal(lastUpdate.gameState.trick.length, 0);

            const totalTricks = lastUpdate.gameState.teams[1].tricksWon + lastUpdate.gameState.teams[2].tricksWon;
            assert.equal(totalTricks, 1);
        });
    });
});