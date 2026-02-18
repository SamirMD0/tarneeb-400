// Backend/src/__tests__/setup.ts — Phase 21: Shared test infrastructure
// Provides environment, mock wiring, and reusable helpers for all integration tests.

import { mock } from 'node:test';
import { createServer, type Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import ioClient from 'socket.io-client';
import { initializeSocketServer } from '../sockets/socketServer.js';
import { registerHandlers } from '../sockets/socketHandlers.js';

// ──────────────────────────────────────────
// 1. Environment
// ──────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.MONGO_URI = 'mongodb://localhost:27017/tarneeb_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.CORS_ORIGIN = '*';
process.env.LOG_ERRORS = 'false';
process.env.EXPOSE_STACK_TRACES = 'true';

// ──────────────────────────────────────────
// 2. Module-level mocks (mongoose & redis)
// ──────────────────────────────────────────
const mockMongoose = {
    connect: async () => mockMongoose,
    connection: {
        readyState: 1,
        host: 'localhost',
        db: {
            admin: () => ({
                ping: async () => ({ ok: 1 }),
                serverInfo: async () => ({ version: '7.0.0' }),
                serverStatus: async () => ({ connections: { current: 5 } }),
            }),
        },
    },
    disconnect: async () => { },
    Schema: class { },
    model: () => ({
        find: async () => [],
        findOne: async () => null,
        create: async () => ({}),
    }),
};

const mockRedis = {
    createClient: () => ({
        on: () => { },
        connect: async () => { },
        isOpen: true,
        ping: async () => 'PONG',
        get: async () => null,
        set: async () => 'OK',
        del: async () => 1,
        quit: async () => { },
        duplicate: () => mockRedis.createClient(),
    }),
};

// @ts-ignore – mock.module is experimental in Node 22+
if (typeof mock.module === 'function') {
    // @ts-ignore
    mock.module('mongoose', {
        defaultExport: mockMongoose,
        namedExports: mockMongoose,
    });
    // @ts-ignore
    mock.module('redis', {
        namedExports: mockRedis,
    });
}

// ──────────────────────────────────────────
// 3. Constants
// ──────────────────────────────────────────
export const DEFAULT_TIMEOUT = 15_000;
export const LOAD_TEST_TIMEOUT = 60_000;

// ──────────────────────────────────────────
// 4. Reusable socket-client type
// ──────────────────────────────────────────
export type ClientSocket = ReturnType<typeof ioClient>;

// ──────────────────────────────────────────
// 5. Test server lifecycle helpers
// ──────────────────────────────────────────

export interface TestContext {
    httpServer: HTTPServer;
    io: Server;
    port: number;
    clients: ClientSocket[];
}

/**
 * Spin up an ephemeral Socket.IO server on a random port.
 * Call `teardownTestServer` when done.
 */
export async function createTestServer(): Promise<TestContext> {
    const httpServer = createServer();
    const io = initializeSocketServer(httpServer);
    registerHandlers(io);

    const port = await new Promise<number>((resolve) => {
        httpServer.listen(0, () => {
            resolve((httpServer.address() as any).port as number);
        });
    });

    return { httpServer, io, port, clients: [] };
}

/** Clean up all clients + server. */
export async function teardownTestServer(ctx: TestContext): Promise<void> {
    for (const c of ctx.clients) c.disconnect();
    ctx.clients.length = 0;
    ctx.io.close();
    await new Promise<void>((resolve) => ctx.httpServer.close(() => resolve()));
}

// ──────────────────────────────────────────
// 6. Socket helpers
// ──────────────────────────────────────────

/** Create a client socket and track it for automatic cleanup. */
export function createTestClient(ctx: TestContext): ClientSocket {
    const socket = ioClient(`http://localhost:${ctx.port}`, {
        transports: ['websocket'],
        forceNew: true,
    });
    ctx.clients.push(socket);
    return socket;
}

/** Wait for an event on a socket (one-shot). */
export function waitForEvent<T = any>(socket: ClientSocket, event: string, timeout = 5000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeout);
        socket.once(event, (data: T) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

/** Connect a socket and wait for the 'connect' event. */
export async function connectClient(socket: ClientSocket): Promise<void> {
    if (socket.connected) return;
    await waitForEvent(socket, 'connect');
}

/** Create a room with 4 connected sockets, return roomId + ordered sockets. */
export async function createFullRoom(ctx: TestContext): Promise<{ roomId: string; sockets: [ClientSocket, ClientSocket, ClientSocket, ClientSocket] }> {
    const s1 = createTestClient(ctx);
    const s2 = createTestClient(ctx);
    const s3 = createTestClient(ctx);
    const s4 = createTestClient(ctx);

    await Promise.all([connectClient(s1), connectClient(s2), connectClient(s3), connectClient(s4)]);

    // Player 1 creates the room
    s1.emit('create_room', { config: { maxPlayers: 4 }, playerName: 'P1' });
    const created = await waitForEvent<any>(s1, 'room_created');
    const roomId = created.roomId as string;

    // Players 2-4 join
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

/** Start the game and transition to BIDDING. Returns the initial game_started payload. */
export async function startGame(sockets: [ClientSocket, ClientSocket, ClientSocket, ClientSocket]): Promise<any> {
    const [s1, s2, s3, s4] = sockets;
    const startedAll = Promise.all([
        waitForEvent<any>(s1, 'game_started'),
        waitForEvent<any>(s2, 'game_started'),
        waitForEvent<any>(s3, 'game_started'),
        waitForEvent<any>(s4, 'game_started'),
    ]);
    s1.emit('start_game', {});
    const results = await startedAll;
    return results[0]; // All have same gameState
}

/**
 * Pick a legal card for the given socketId from the gameState.
 * - If first card in trick → play any card.
 * - Otherwise → follow lead suit if possible.
 */
export function pickCard(socketId: string, gameState: any): { suit: string; rank: string } | undefined {
    const player = (gameState.players as any[]).find((p) => p.id === socketId);
    const hand = player?.hand as any[] | undefined;
    if (!hand || hand.length === 0) return undefined;

    if ((gameState.trick as any[]).length === 0) return hand[0];

    const leadSuit = gameState.trick[0]?.suit;
    const follow = hand.find((c: any) => c.suit === leadSuit);
    return follow || hand[0];
}

/**
 * Build a socket-id-to-socket map for dispatching cards to the right client.
 */
export function buildSocketMap(sockets: ClientSocket[]): Map<string, ClientSocket> {
    return new Map(sockets.map((s) => [s.id!, s]));
}