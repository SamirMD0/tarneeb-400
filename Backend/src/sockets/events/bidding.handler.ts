// Backend/src/sockets/events/bidding.handler.ts - Phase 20: Performance Monitoring

import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, SanitizedGameState } from '../../types/socket.types.js';
import type { GameAction } from '../../game/actions.js';
import type { GameState } from '../../game/state.js';
import type { RoomManager } from '../../rooms/roomManager.js';
import { applyMiddleware } from '../socketMiddleware.js';
import { metrics } from '../../lib/metrics.js';
import { PlaceBidSchema, validateSocketPayload } from '../../middlewares/validator.js';
import { botManager } from '../../bot/BotManager.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/**
 * Strip `deck` from GameState before broadcasting.
 */
function sanitizeGameState(state: Readonly<GameState>): SanitizedGameState {
    const { deck, ...safe } = state;
    return safe;
}

export function registerBiddingHandlers(
    socket: SocketType,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
) {
    // ✅ Phase 20: Wrap handlers with performance timing
    // applyMiddleware already captures socket in closure — do NOT pass socket again
    const placeBid = wrapWithTiming('place_bid',
        applyMiddleware(socket, (socket, data) => handlePlaceBid(socket, data, io, roomManager))
    );
    const passBid = wrapWithTiming('pass_bid',
        applyMiddleware(socket, (socket, data) => handlePassBid(socket, data, io, roomManager))
    );
    socket.on('place_bid', (data: any) => placeBid(data));
    socket.on('pass_bid', (data: any) => passBid(data));
}

/**
 * Phase 20: Performance timing wrapper for socket events
 */
function wrapWithTiming(eventName: string, handler: any): any {
    return async (...args: any[]) => {
        const end = metrics.timeSocketEvent(eventName);
        try {
            await handler(...args);
        } finally {
            end();
        }
    };
}

async function handlePlaceBid(
    socket: SocketType,
    data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
): Promise<void> {
    const roomId = socket.data.roomId;
    if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You must be in a room to bid' });
        return;
    }

    let validated;
    try {
        validated = validateSocketPayload(PlaceBidSchema, data);
    } catch {
        socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid bid payload' });
        return;
    }
    const { value } = validated;

    const room = await roomManager.getRoom(roomId);
    if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' });
        return;
    }

    if (!room.gameEngine) {
        socket.emit('error', { code: 'GAME_NOT_STARTED', message: 'Game has not started yet' });
        return;
    }

    // Use stable playerId derived from verified JWT (set in auth middleware)
    const playerId = socket.data.playerId || socket.data.userId;
    if (!playerId) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Player ID not found' });
        return;
    }

    const action: GameAction = { type: 'BID', playerId, value };
    const success = room.gameEngine.dispatch(action);

    if (!success) {
        socket.emit('error', { code: 'INVALID_ACTION', message: 'Bid was rejected by game engine' });
        return;
    }

    io.to(roomId).emit('game_state_updated', { roomId, gameState: sanitizeGameState(room.gameEngine.getState()) });

    // Check if next player is a bot
    botManager.handleGameStateUpdate(room, io);
}

async function handlePassBid(
    socket: SocketType,
    _data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
): Promise<void> {
    const roomId = socket.data.roomId;
    if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You must be in a room to bid' });
        return;
    }

    const room = await roomManager.getRoom(roomId);
    if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' });
        return;
    }

    if (!room.gameEngine) {
        socket.emit('error', { code: 'GAME_NOT_STARTED', message: 'Game has not started yet' });
        return;
    }

    // Use stable playerId derived from verified JWT
    const playerId = socket.data.playerId || socket.data.userId;
    if (!playerId) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Player ID not found' });
        return;
    }

    const action: GameAction = { type: 'PASS', playerId };
    const success = room.gameEngine.dispatch(action);

    if (!success) {
        socket.emit('error', { code: 'INVALID_ACTION', message: 'Pass was rejected by game engine' });
        return;
    }

    io.to(roomId).emit('game_state_updated', { roomId, gameState: sanitizeGameState(room.gameEngine.getState()) });

    // Check if next player is a bot
    botManager.handleGameStateUpdate(room, io);
}