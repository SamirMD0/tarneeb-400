// Backend/src/socket/socket.test.ts - Phase 17: WebSocket Foundation Tests

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import { Server } from 'socket.io';
import ioClient from 'socket.io-client';
import { initializeSocketServer, getConnectionCount, getRoomCount } from './socketServer.js';
import { registerHandlers } from './socketHandlers.js';

type ClientSocket = ReturnType<typeof ioClient>;

describe('Socket.IO Server - Phase 17', () => {
    let httpServer: ReturnType<typeof createServer>;
    let io: Server;

    let serverPort: number;
    let clientSockets: ClientSocket[] = [];

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
    function createClient(): ClientSocket {
        const socket = ioClient(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
            forceNew: true,
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
            
            // Create and join a room
            client.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Test Player',
            });
            
            await waitForEvent(client, 'room_created');
            
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
            
            client.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Test Player',
            });
            
            const response = await waitForEvent(client, 'room_created');
            
            assert.ok(response, 'Should receive room_created event');
            assert.ok((response as any).roomId, 'Response should include roomId');
        });

        it('should register join_room handler', async () => {
            const creator = createClient();
            const joiner = createClient();
            
            await Promise.all([
                new Promise<void>(resolve => creator.on('connect', () => resolve())),
                new Promise<void>(resolve => joiner.on('connect', () => resolve())),
            ]);
            
            // Create room
            creator.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Creator',
            });
            
            const createResponse = await waitForEvent<any>(creator, 'room_created');
            const roomId = createResponse.roomId;
            
            // Join room
            joiner.emit('join_room', {
                roomId,
                playerName: 'Joiner',
            });
            
            const joinResponse = await waitForEvent(joiner, 'room_joined');
            
            assert.ok(joinResponse, 'Should receive room_joined event');
            assert.strictEqual((joinResponse as any).roomId, roomId);
        });

        it('should register leave_room handler', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            // Create and join room
            client.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Test Player',
            });
            
            await waitForEvent(client, 'room_created');
            
            // Leave room
            client.emit('leave_room', {});
            
            const leaveResponse = await waitForEvent(client, 'room_left');
            
            assert.ok(leaveResponse, 'Should receive room_left event');
        });

        it('should register game_action handler', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            // Emit invalid action (game not started)
            client.emit('game_action', {
                action: { type: 'START_BIDDING' },
            });
            
            const errorResponse = await waitForEvent<any>(client, 'error');
            
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
            
            client.emit('create_room', {
                config: {}, // Missing maxPlayers
            });
            
            const errorResponse = await waitForEvent<any>(client, 'error');
            
            assert.ok(errorResponse, 'Should receive error event');
            assert.strictEqual(errorResponse.code, 'INVALID_CONFIG');
        });

        it('should handle joining non-existent room', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            client.emit('join_room', {
                roomId: 'non_existent_room',
                playerName: 'Test Player',
            });
            
            const errorResponse = await waitForEvent<any>(client, 'error');
            
            assert.ok(errorResponse, 'Should receive error event');
            assert.strictEqual(errorResponse.code, 'ROOM_NOT_FOUND');
        });

        it('should handle leaving room when not in one', async () => {
            const client = createClient();
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
            
            client.emit('leave_room', {});
            
            const errorResponse = await waitForEvent<any>(client, 'error');
            
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
            
            // Create room
            creator.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Creator',
            });
            
            const createResponse = await waitForEvent<any>(creator, 'room_created');
            const roomId = createResponse.roomId;
            
            // Set up listener for player_joined
            const playerJoinedPromise = waitForEvent<any>(creator, 'player_joined');
            
            // Join room
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
            
            // Create room
            player1.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'Player1',
            });
            
            const createResponse = await waitForEvent<any>(player1, 'room_created');
            const roomId = createResponse.roomId;
            
            // Player 2 joins
            player2.emit('join_room', {
                roomId,
                playerName: 'Player2',
            });
            
            await waitForEvent(player2, 'room_joined');
            
            // Set up listener for player_left
            const playerLeftPromise = waitForEvent<any>(player1, 'player_left');
            
            // Player 2 leaves
            player2.emit('leave_room', {});
            
            const playerLeftEvent = await playerLeftPromise;
            
            assert.ok(playerLeftEvent, 'Player1 should receive player_left event');
        });
    });

    describe('Phase 18: Socket Event Handlers', () => {
        type FourSockets = [ClientSocket, ClientSocket, ClientSocket, ClientSocket];

        async function createFullRoom(): Promise<{ roomId: string; sockets: FourSockets }> {
            const s1 = createClient();
            const s2 = createClient();
            const s3 = createClient();
            const s4 = createClient();

            await Promise.all([
                new Promise<void>(resolve => s1.on('connect', () => resolve())),
                new Promise<void>(resolve => s2.on('connect', () => resolve())),
                new Promise<void>(resolve => s3.on('connect', () => resolve())),
                new Promise<void>(resolve => s4.on('connect', () => resolve())),
            ]);

            s1.emit('create_room', {
                config: { maxPlayers: 4 },
                playerName: 'P1',
            });

            const created = await waitForEvent<any>(s1, 'room_created');
            const roomId = created.roomId as string;

            s2.emit('join_room', { roomId, playerName: 'P2' });
            s3.emit('join_room', { roomId, playerName: 'P3' });
            s4.emit('join_room', { roomId, playerName: 'P4' });

            await Promise.all([
                waitForEvent(s2, 'room_joined'),
                waitForEvent(s3, 'room_joined'),
                waitForEvent(s4, 'room_joined'),
            ]);

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

            s1.emit('place_bid', { value: 2 });
            const [u1, u2, u3, u4] = await updates;

            assert.equal(u1.roomId, roomId);
            assert.equal(u2.roomId, roomId);
            assert.equal(u3.roomId, roomId);
            assert.equal(u4.roomId, roomId);
            assert.equal(u1.gameState.phase, 'BIDDING');
            assert.equal(u1.gameState.highestBid, 2);
        });

        it('should reject invalid play_card action (card not in hand)', async () => {
            const { sockets } = await createFullRoom();
            const [s1] = sockets;

            await startGameForRoom(sockets);

            s1.emit('place_bid', { value: 2 });
            await waitForEvent<any>(s1, 'game_state_updated');
            s1.emit('set_trump', { suit: 'SPADES' });
            await waitForEvent<any>(s1, 'game_state_updated');

            s1.emit('play_card', { card: { suit: 'SPADES', rank: 'X' } });
            const err = await waitForEvent<any>(s1, 'error');
            assert.equal(err.code, 'INVALID_ACTION');
        });

        it('should auto-trigger END_TRICK after 4 played cards', async () => {
            const { roomId, sockets } = await createFullRoom();
            const [s1, s2, s3, s4] = sockets;

            await startGameForRoom(sockets);

            s1.emit('place_bid', { value: 2 });
            await waitForEvent<any>(s1, 'game_state_updated');
            s1.emit('set_trump', { suit: 'SPADES' });
            let lastUpdate = await waitForEvent<any>(s1, 'game_state_updated');

            assert.ok(s1.id, 'Socket id should be set');
            assert.ok(s2.id, 'Socket id should be set');
            assert.ok(s3.id, 'Socket id should be set');
            assert.ok(s4.id, 'Socket id should be set');

            const socketById = new Map<string, ClientSocket>([
                [s1.id, s1],
                [s2.id, s2],
                [s3.id, s3],
                [s4.id, s4],
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
                const card = pickCard(currentSocket.id, state);
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