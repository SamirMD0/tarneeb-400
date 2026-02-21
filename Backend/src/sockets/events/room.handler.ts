// Backend/src/sockets/events/room.handler.ts - Phase 20: Performance Monitoring

import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/socket.types.js';
import type { RoomManager } from '../../rooms/roomManager.js';
import { applyMiddleware } from '../socketMiddleware.js';
import { metrics } from '../../lib/metrics.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function registerRoomHandlers(
    socket: SocketType,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
) {
    // ✅ Phase 20: Wrap handlers with performance timing
    // applyMiddleware already captures socket in closure — do NOT pass socket again
    const createRoom = wrapWithTiming('create_room',
        applyMiddleware(socket, (socket, data) => handleCreateRoom(socket, data, roomManager))
    );
    const joinRoom = wrapWithTiming('join_room',
        applyMiddleware(socket, (socket, data) => handleJoinRoom(socket, data, roomManager))
    );
    const startGame = wrapWithTiming('start_game',
        applyMiddleware(socket, (socket, data) => handleStartGame(socket, data, io, roomManager))
    );
    const leaveRoom = wrapWithTiming('leave_room',
        applyMiddleware(socket, (socket, data) => handleLeaveRoom(socket, data, roomManager))
    );

    socket.on('create_room', (data: any) => createRoom(data));
    socket.on('join_room', (data: any) => joinRoom(data));
    socket.on('start_game', (data: any) => startGame(data));
    socket.on('leave_room', (data: any) => leaveRoom(data));
}

/**
 * Phase 20: Performance timing wrapper for socket events
 * Measures actual handler execution time
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

async function handleCreateRoom(socket: SocketType, data: any, roomManager: RoomManager): Promise<void> {
    const { config } = data ?? {};

    if (!config || typeof config.maxPlayers !== 'number') {
        socket.emit('error', {
            code: 'INVALID_CONFIG',
            message: 'Invalid room configuration',
        });
        return;
    }

    const room = await roomManager.createRoom(config);

    const playerName = data?.playerName || `Player_${socket.id.substring(0, 6)}`;
    await room.addPlayer(socket.id, playerName);

    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.playerId = socket.id;

    socket.emit('room_created', {
        roomId: room.id,
        room: serializeRoom(room),
    });
}

async function handleJoinRoom(socket: SocketType, data: any, roomManager: RoomManager): Promise<void> {
    const { roomId, playerName } = data ?? {};

    if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', {
            code: 'INVALID_ROOM_ID',
            message: 'Room ID is required',
        });
        return;
    }

    const room = await roomManager.getRoom(roomId);
    if (!room) {
        socket.emit('error', {
            code: 'ROOM_NOT_FOUND',
            message: 'Room does not exist',
        });
        return;
    }

    if (room.isFull()) {
        socket.emit('error', {
            code: 'ROOM_FULL',
            message: 'Room is full',
        });
        return;
    }

    const name = playerName || `Player_${socket.id.substring(0, 6)}`;
    const added = await room.addPlayer(socket.id, name);

    if (!added) {
        socket.emit('error', {
            code: 'JOIN_FAILED',
            message: 'Failed to join room',
        });
        return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerId = socket.id;

    socket.emit('room_joined', {
        roomId: room.id,
        room: serializeRoom(room),
    });

    socket.to(roomId).emit('player_joined', {
        playerId: socket.id,
        playerName: name,
        room: serializeRoom(room),
    });
}

async function handleStartGame(
    socket: SocketType,
    _data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
): Promise<void> {
    const roomId = socket.data.roomId;

    if (!roomId) {
        socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You are not in a room',
        });
        return;
    }

    const room = await roomManager.getRoom(roomId);
    if (!room) {
        socket.emit('error', {
            code: 'ROOM_NOT_FOUND',
            message: 'Room does not exist',
        });
        return;
    }

    const started = await room.startGame();
    if (!started || !room.gameEngine) {
        socket.emit('error', {
            code: 'START_GAME_FAILED',
            message: 'Failed to start game',
        });
        return;
    }

    room.gameEngine.dispatch({ type: 'START_BIDDING' });

    io.to(roomId).emit('game_started', {
        roomId,
        gameState: room.gameEngine.getState(),
    });
}

async function handleLeaveRoom(socket: SocketType, _data: any, roomManager: RoomManager): Promise<void> {
    const roomId = socket.data.roomId;

    if (!roomId) {
        socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You are not in a room',
        });
        return;
    }

    const room = await roomManager.getRoom(roomId);
    if (room) {
        await room.removePlayer(socket.id);
        socket.leave(roomId);

        socket.to(roomId).emit('player_left', {
            playerId: socket.id,
            room: serializeRoom(room),
        });

        if (room.isEmpty()) {
            await roomManager.deleteRoom(roomId);
        }
    }

    socket.data.roomId = undefined;
    socket.data.playerId = undefined;

    socket.emit('room_left', { roomId });
}

function serializeRoom(room: any): any {
    return {
        id: room.id,
        players: Array.from(room.players.values()),
        config: room.config,
        hasGame: !!room.gameEngine,
        gameState: room.gameEngine ? room.gameEngine.getState() : undefined,
    };
}