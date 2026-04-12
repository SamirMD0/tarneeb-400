// Backend/src/socket/socketServer.ts - Phase 17: WebSocket Foundation

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData
} from '../types/socket.types.js';
import { socketConnectionLimiter } from '../middlewares/rateLimiter.js';
import { authMiddleware } from './socketMiddleware.js';
import { getEnv } from '../lib/env.js';

export function initializeSocketServer(httpServer: HTTPServer): Server<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
> {
    const env = getEnv();
    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        {},
        SocketData
    >(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Connection settings
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
        perMessageDeflate: {
            threshold: 1024, // Optional: only compress messages larger than 1KB
        },
    });

    // Phase 19: Socket Connection Rate Limiting
    // Skip in test environment: all test clients share the same IP (::1), and
    // socketConnectionLimiter allows only 10 connections per 60 s. The load test
    // spins up 10 rooms × 4 clients = 40 sockets, which would start failing after
    // the 10th socket. NODE_ENV=test bypasses this limiter entirely.
    if (process.env.NODE_ENV !== 'test') {
        io.use(async (socket, next) => {
            try {
                await socketConnectionLimiter.consume(socket.handshake.address);
                next();
            } catch (e) {
                next(new Error('Too many connection attempts, please try again later'));
            }
        });
    }

    // Enforce JWT auth for all socket connections
    io.use(authMiddleware as any);

    // Removed duplicate connection block here; socketHandlers.ts owns the connection event.

    console.log('[Socket] Socket.IO server initialized');
    return io;
}

/**
 * Get active connection count
 */
export function getConnectionCount(io: Server): number {
    return io.sockets.sockets.size;
}

/**
 * Get active room count (excluding private socket rooms)
 */
export function getRoomCount(io: Server): number {
    const rooms = io.sockets.adapter.rooms;
    let count = 0;

    rooms.forEach((_, roomId) => {
        // Exclude private socket rooms (named by socket ID)
        if (!io.sockets.sockets.has(roomId)) {
            count++;
        }
    });

    return count;
}

/**
 * Broadcast to specific room
 */
export function broadcastToRoom(
    io: Server,
    roomId: string,
    event: string,
    data: unknown
): void {
    io.to(roomId).emit(event as any, data);
}

/**
 * Get socket by ID
 */
export function getSocket(io: Server, socketId: string): Socket | undefined {
    return io.sockets.sockets.get(socketId);
}