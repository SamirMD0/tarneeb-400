// Backend/src/sockets/events/bidding.handler.ts - Phase 18: Bidding Event Handlers

import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/socket.types.js';
import type { GameAction } from '../../game/actions.js';
import type { RoomManager } from '../../rooms/roomManager.js';
import { applyMiddleware } from '../socketMiddleware.js';

// Handler for 'place_bid' event
type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function registerBiddingHandlers(
    socket: SocketType,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
) {
    const placeBid = applyMiddleware(socket, (socket, data) => handlePlaceBid(socket, data, io, roomManager));
    const passBid = applyMiddleware(socket, (socket, data) => handlePassBid(socket, data, io, roomManager));
    const setTrump = applyMiddleware(socket, (socket, data) => handleSetTrump(socket, data, io, roomManager));

    socket.on('place_bid', (data: any) => placeBid(socket, data));
    socket.on('pass_bid', (data: any) => passBid(socket, data));
    socket.on('set_trump', (data: any) => setTrump(socket, data));
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

    const value = data?.value;
    if (typeof value !== 'number') {
        socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid bid payload' });
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

    const action: GameAction = { type: 'BID', playerId: socket.id, value };
    const success = room.gameEngine.dispatch(action);

    if (!success) {
        socket.emit('error', { code: 'INVALID_ACTION', message: 'Bid was rejected by game engine' });
        return;
    }

    io.to(roomId).emit('game_state_updated', { roomId, gameState: room.gameEngine.getState() });
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

    const action: GameAction = { type: 'PASS', playerId: socket.id };
    const success = room.gameEngine.dispatch(action);

    if (!success) {
        socket.emit('error', { code: 'INVALID_ACTION', message: 'Pass was rejected by game engine' });
        return;
    }

    io.to(roomId).emit('game_state_updated', { roomId, gameState: room.gameEngine.getState() });
}

async function handleSetTrump(
    socket: SocketType,
    data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
): Promise<void> {
    const roomId = socket.data.roomId;
    if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You must be in a room to set trump' });
        return;
    }

    const suit = data?.suit;
    if (typeof suit !== 'string') {
        socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid trump payload' });
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

    const action: GameAction = { type: 'SET_TRUMP', suit: suit as any };
    const success = room.gameEngine.dispatch(action);

    if (!success) {
        socket.emit('error', { code: 'INVALID_ACTION', message: 'Set trump was rejected by game engine' });
        return;
    }

    io.to(roomId).emit('game_state_updated', { roomId, gameState: room.gameEngine.getState() });
}
