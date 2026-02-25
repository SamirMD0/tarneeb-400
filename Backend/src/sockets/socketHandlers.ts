// Backend/src/sockets/socketHandlers.ts - Phase 18: Core Socket Event Handlers

import { Server, Socket } from 'socket.io';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
    SerializedRoom,
    SanitizedGameState
} from '../types/socket.types.js';
import { RoomManager } from '../rooms/roomManager.js';
import { registerAllSocketEventHandlers } from './events/index.js';
import { cleanupSocketData } from './socketMiddleware.js';
import type { GameAction } from '../game/actions.js';
import type { GameState } from '../game/state.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../lib/metrics.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

// Global room manager instance
const roomManager = new RoomManager();

/**
 * Helper: Safely emit error to socket
 */
function emitError(socket: SocketType, code: string, message: string): void {
    socket.emit('error', { code, message });
}

/**
 * Strip `deck` from GameState before broadcasting.
 */
function sanitizeGameState(state: Readonly<GameState>): SanitizedGameState {
    const { deck, ...safe } = state;
    return safe;
}

/**
 * Serialize room for client transmission.
 */
function serializeRoom(room: any): SerializedRoom {
    return {
        id: room.id,
        players: Array.from(room.players.values()),
        config: room.config,
        hasGame: !!room.gameEngine,
        gameState: room.gameEngine ? sanitizeGameState(room.gameEngine.getState()) : undefined,
    };
}

/**
 * Helper: Validate game action payload structure
 * Returns validated action or null if invalid
 */
function validateGameActionPayload(data: unknown): GameAction | null {
    try {
        if (data == null || typeof data !== 'object' || Array.isArray(data)) return null;

        const payload = data as Record<string, unknown>;
        if (!('action' in payload)) return null;

        const action = payload.action;
        if (action == null || typeof action !== 'object' || Array.isArray(action)) return null;

        const actionObj = action as Record<string, unknown>;
        if (!('type' in actionObj) || typeof actionObj.type !== 'string') return null;

        return actionObj as GameAction;
    } catch (err) {
        return null;
    }
}

/**
 * Register all socket event handlers
 */
export function registerHandlers(io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>): void {
    io.on('connection', (socket: SocketType) => {
        metrics.socketConnected();
        logger.info('Socket connected', { socketId: socket.id, ip: socket.handshake.address });

        // Modular room, bidding, playing handlers
        registerAllSocketEventHandlers(socket, io, roomManager);

        // Register game_action handler with proper error priority
        // NOTE: We handle game_action here to maintain strict control over error ordering (Room check -> Validation check)
        socket.on('game_action', (data: any) => {
            handleGameAction(socket, data, io).catch((error) => {
                logger.error('[Socket Error] game_action handler failed', {
                    socketId: socket.id,
                    error: error instanceof Error ? error.message : String(error)
                });
                emitError(socket, 'INTERNAL_ERROR', 'Failed to process game action');
            });
        });

        // Cleanup on disconnect
        socket.on('disconnect', () => {
            handleDisconnect(socket, io);
            metrics.socketDisconnected();
        });
    });

    logger.info('[Socket] Event handlers registered');
}

/**
 * Handle game action dispatch
 * 
 * ERROR PRIORITY (MANDATORY ORDER):
 * 1. Room membership check FIRST -> NOT_IN_ROOM
 * 2. Payload validation SECOND -> VALIDATION_ERROR
 * 3. Game logic LAST
 */
async function handleGameAction(
    socket: SocketType,
    data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
): Promise<void> {
    // 1. Check room membership
    const roomId = socket.data.roomId;
    if (!roomId) {
        emitError(socket, 'NOT_IN_ROOM', 'You must be in a room to perform actions');
        return;
    }

    // 2. Validate payload structure
    const action = validateGameActionPayload(data);
    if (!action) {
        emitError(socket, 'VALIDATION_ERROR', 'Invalid game action payload');
        return;
    }

    // 3. Game engine logic
    try {
        const room = await roomManager.getRoom(roomId);

        if (!room) {
            emitError(socket, 'ROOM_NOT_FOUND', 'Room does not exist');
            return;
        }

        if (!room.gameEngine) {
            emitError(socket, 'GAME_NOT_STARTED', 'Game has not started yet');
            return;
        }

        // Dispatch action to game engine
        const success = room.gameEngine.dispatch(action);

        if (!success) {
            emitError(socket, 'INVALID_ACTION', 'Action was rejected by game engine');
            return;
        }

        // Broadcast updated game state (deck stripped)
        io.to(roomId).emit('game_state_updated', {
            roomId,
            gameState: sanitizeGameState(room.gameEngine.getState()),
        });

        logger.debug('Action dispatched', { type: action.type, roomId });
    } catch (error) {
        logger.error('Game action processing failed', {
            socketId: socket.id,
            roomId,
            error: error instanceof Error ? error.message : String(error)
        });
        emitError(socket, 'INTERNAL_ERROR', 'Failed to process game action');
    }
}

/**
 * Handle socket disconnection
 * Uses stable playerId (not socket.id) to mark the correct player as disconnected.
 */
async function handleDisconnect(socket: SocketType, io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>): Promise<void> {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;

    if (roomId && playerId) {
        try {
            const room = await roomManager.getRoom(roomId);
            if (room) {
                await room.markPlayerDisconnected(playerId);
                io.to(roomId).emit('player_disconnected', {
                    playerId,
                    room: serializeRoom(room),
                });
                logger.debug('Player marked disconnected', { roomId, playerId });
            }
        } catch (error) {
            logger.error('Error handling disconnect', {
                socketId: socket.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    cleanupSocketData(socket.id);
}

export { roomManager };