// Backend/src/socket/socketServer.ts - Phase 17: WebSocket Foundation

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { 
    ClientToServerEvents, 
    ServerToClientEvents, 
    SocketData 
} from '../types/socket.types.js';

export function initializeSocketServer(httpServer: HTTPServer): Server<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
> {
    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        {},
        SocketData
    >(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Connection settings
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
    });

    // Connection event
    io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        // Track connection timestamp
        socket.data.connectedAt = Date.now();

        // Disconnection event
        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
            
            // Cleanup: Leave all rooms
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                    console.log(`[Socket] ${socket.id} left room ${room} on disconnect`);
                }
            });
        });

        // Error handling
        socket.on('error', (error) => {
            console.error(`[Socket] Error from ${socket.id}:`, error);
        });
    });

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