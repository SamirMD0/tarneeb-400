// Backend/src/socket/socketHandlers.ts - Phase 17: Core Socket Event Handlers

import { Server, Socket } from 'socket.io';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData
} from '../types/socket.types.js';
import { RoomManager } from '../rooms/roomManager.js';
import { registerAllSocketEventHandlers } from './events/index.js';
import { applyMiddleware, cleanupSocketData } from './socketMiddleware.js';
import type { GameAction } from '../game/actions.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../lib/metrics.js';
import { withTiming } from '../monitoring/performance.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

// Global room manager instance
const roomManager = new RoomManager();

/**
 * Register all socket event handlers
 */
export function registerHandlers(io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>): void {
    io.on('connection', (socket: SocketType) => {
        metrics.socketConnected();
        logger.info('Socket connected', { socketId: socket.id, ip: socket.handshake.address });

        registerAllSocketEventHandlers(socket, io, roomManager);

        // Apply middleware to handler
        const gameAction = applyMiddleware(socket, (socket, data) =>
            withTiming('game_action', () => handleGameAction(socket, data, io), {
                metricType: 'socket_event'
            }).then(r => r.result)
        );

        // Register event handlers
        socket.on('game_action', (data: any) => gameAction(socket, data));

        // Cleanup on disconnect
        socket.on('disconnect', () => {
            handleDisconnect(socket, io);
            metrics.socketDisconnected();
        });
    });

    logger.info('[Socket] Event handlers registered');
}

/**
 * Handle room creation
 */
async function handleCreateRoom(socket: SocketType, data: any): Promise<void> {
    const { config } = data;

    // Validate config
    if (!config || typeof config.maxPlayers !== 'number') {
        socket.emit('error', {
            code: 'INVALID_CONFIG',
            message: 'Invalid room configuration',
        });
        return;
    }

    try {
        // Create room
        const room = await roomManager.createRoom(config);

        // Add creator to room
        const playerName = data.playerName || `Player_${socket.id.substring(0, 6)}`;
        await room.addPlayer(socket.id, playerName);

        // Join socket.io room
        socket.join(room.id);
        socket.data.roomId = room.id;
        socket.data.playerId = socket.id;

        // Emit success response
        socket.emit('room_created', {
            roomId: room.id,
            room: serializeRoom(room),
        });

        console.log(`[Socket] Room ${room.id} created by ${socket.id}`);
        logger.info(`Room created`, { roomId: room.id, creatorId: socket.id });
        metrics.roomCreated();
    } catch (error) {
        throw new Error(`Failed to create room: ${error}`);
    }
}

/**
 * Handle player joining room
 */
async function handleJoinRoom(socket: SocketType, data: any): Promise<void> {
    const { roomId, playerName } = data;

    // Validate input
    if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', {
            code: 'INVALID_ROOM_ID',
            message: 'Room ID is required',
        });
        return;
    }

    try {
        // Get room
        const room = await roomManager.getRoom(roomId);

        if (!room) {
            socket.emit('error', {
                code: 'ROOM_NOT_FOUND',
                message: 'Room does not exist',
            });
            return;
        }

        // Check if room is full
        if (room.isFull()) {
            socket.emit('error', {
                code: 'ROOM_FULL',
                message: 'Room is full',
            });
            return;
        }

        // Add player to room
        const name = playerName || `Player_${socket.id.substring(0, 6)}`;
        const added = await room.addPlayer(socket.id, name);

        if (!added) {
            socket.emit('error', {
                code: 'JOIN_FAILED',
                message: 'Failed to join room',
            });
            return;
        }

        // Join socket.io room
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.playerId = socket.id;

        // Notify player
        socket.emit('room_joined', {
            roomId: room.id,
            room: serializeRoom(room),
        });

        // Notify all players in room
        socket.to(roomId).emit('player_joined', {
            playerId: socket.id,
            playerName: name,
            room: serializeRoom(room),
        });

        logger.info(`Player joined room`, { roomId, playerId: socket.id });
    } catch (error) {
        throw new Error(`Failed to join room: ${error}`);
    }
}

/**
 * Handle player leaving room
 */
async function handleLeaveRoom(socket: SocketType, data: any): Promise<void> {
    const roomId = socket.data.roomId;

    if (!roomId) {
        socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You are not in a room',
        });
        return;
    }

    try {
        const room = await roomManager.getRoom(roomId);

        if (room) {
            // Remove player from room
            await room.removePlayer(socket.id);

            // Leave socket.io room
            socket.leave(roomId);

            // Notify others
            socket.to(roomId).emit('player_left', {
                playerId: socket.id,
                room: serializeRoom(room),
            });

            // Clean up empty rooms
            if (room.isEmpty()) {
                await roomManager.deleteRoom(roomId);
                logger.info(`Empty room deleted`, { roomId });
                metrics.roomDestroyed();
            }
        }

        // Clear socket data
        socket.data.roomId = undefined;
        socket.data.playerId = undefined;

        socket.emit('room_left', { roomId });

        logger.info(`Player left room`, { roomId, playerId: socket.id });
    } catch (error) {
        throw new Error(`Failed to leave room: ${error}`);
    }
}

/**
 * Handle game action dispatch
 */
async function handleGameAction(socket: SocketType, data: any, io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>): Promise<void> {
    const roomId = socket.data.roomId;

    if (!roomId) {
        socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must be in a room to perform actions',
        });
        return;
    }

    const { action } = data;

    if (!action || !action.type) {
        socket.emit('error', {
            code: 'INVALID_ACTION',
            message: 'Invalid game action',
        });
        return;
    }

    try {
        const room = await roomManager.getRoom(roomId);

        if (!room) {
            socket.emit('error', {
                code: 'ROOM_NOT_FOUND',
                message: 'Room does not exist',
            });
            return;
        }

        if (!room.gameEngine) {
            socket.emit('error', {
                code: 'GAME_NOT_STARTED',
                message: 'Game has not started yet',
            });
            return;
        }

        // Dispatch action to game engine
        const success = room.gameEngine.dispatch(action as GameAction);

        if (!success) {
            socket.emit('error', {
                code: 'INVALID_ACTION',
                message: 'Action was rejected by game engine',
            });
            return;
        }

        // Broadcast updated game state to all players in room
        io.to(roomId).emit('game_state_updated', {
            roomId,
            gameState: room.gameEngine.getState(),
        });

        // Helper to log action without verbose data
        logger.debug(`Action dispatched`, { type: action.type, roomId });
    } catch (error) {
        throw new Error(`Failed to process game action: ${error}`);
    }
}

/**
 * Handle socket disconnection
 */
async function handleDisconnect(socket: SocketType, io: Server): Promise<void> {
    const roomId = socket.data.roomId;

    if (roomId) {
        try {
            const room = await roomManager.getRoom(roomId);

            if (room) {
                // Mark player as disconnected (for reconnection support)
                await room.markPlayerDisconnected(socket.id);

                // Notify others
                io.to(roomId).emit('player_disconnected', {
                    playerId: socket.id,
                    room: serializeRoom(room),
                });

                logger.info(`Player disconnected`, { roomId, playerId: socket.id });
            }
        } catch (error) {
            logger.error(`Error handling disconnect`, { socketId: socket.id, error });
        }
    }

    // Clean up rate limit data
    cleanupSocketData(socket.id);
}

/**
 * Serialize room for client transmission
 */
function serializeRoom(room: any): any {
    return {
        id: room.id,
        players: Array.from(room.players.values()),
        config: room.config,
        hasGame: !!room.gameEngine,
        gameState: room.gameEngine ? room.gameEngine.getState() : undefined,
    };
}

/**
 * Export room manager for testing
 */
export { roomManager };