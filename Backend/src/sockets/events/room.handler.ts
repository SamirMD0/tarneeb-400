// Backend/src/sockets/events/room.handler.ts - Phase 20: Performance Monitoring

import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, SerializedRoom, SanitizedGameState } from '../../types/socket.types.js';
import type { RoomManager } from '../../rooms/roomManager.js';
import type { GameState } from '../../game/state.js';
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
        applyMiddleware(socket, (socket, data) => handleCreateRoom(socket, data, io, roomManager))
    );
    const joinRoom = wrapWithTiming('join_room',
        applyMiddleware(socket, (socket, data) => handleJoinRoom(socket, data, io, roomManager))
    );
    const startGame = wrapWithTiming('start_game',
        applyMiddleware(socket, (socket, data) => handleStartGame(socket, data, io, roomManager))
    );
    const leaveRoom = wrapWithTiming('leave_room',
        applyMiddleware(socket, (socket, data) => handleLeaveRoom(socket, data, io, roomManager))
    );
    const refreshRoomList = wrapWithTiming('refresh_room_list',
        applyMiddleware(socket, (socket, data) => handleRefreshRoomList(socket, data, roomManager))
    );

    socket.on('create_room', (data: any) => createRoom(data));
    socket.on('join_room', (data: any) => joinRoom(data));
    socket.on('start_game', (data: any) => startGame(data));
    socket.on('leave_room', (data: any) => leaveRoom(data));
    socket.on('refresh_room_list', (data: any) => refreshRoomList(data));
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip `deck` from GameState before broadcasting to clients.
 * Clients must never see undealt cards — this is a cheating vector.
 */
function sanitizeGameState(state: Readonly<GameState>): SanitizedGameState {
    const { deck, ...safe } = state;
    return safe;
}

/**
 * Serialize room for client transmission.
 * Uses proper typed return instead of `any`.
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
 * Resolve a stable playerId for this socket.
 * Uses userId from auth middleware (set during handshake) as the stable identity.
 * Falls back to socket.id if no auth is configured.
 */
function resolvePlayerId(socket: SocketType): string {
    return socket.data.userId || socket.id;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCreateRoom(socket: SocketType, data: any, io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, roomManager: RoomManager): Promise<void> {
    const { config } = data ?? {};

    if (!config || typeof config.maxPlayers !== 'number') {
        socket.emit('error', {
            code: 'INVALID_CONFIG',
            message: 'Invalid room configuration',
        });
        return;
    }

    const room = await roomManager.createRoom(config);

    const playerId = resolvePlayerId(socket);
    const playerName = data?.playerName || `Player_${playerId.substring(0, 6)}`;
    await room.addPlayer(playerId, playerName);

    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.playerId = playerId;

    socket.emit('room_created', {
        roomId: room.id,
        room: serializeRoom(room),
        myPlayerId: playerId,
    });

    // Broadcast updated room list to all (lobby updates)
    await broadcastRoomList(io, roomManager);
}

async function handleJoinRoom(
    socket: SocketType,
    data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
): Promise<void> {
    const { roomId, playerName, playerId: requestedPlayerId } = data ?? {};

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

    // ── Reconnect path: player already exists in room ──────────────────────
    // Client sends playerId on reconnect. Check if that player is in the room.
    const reconnectId = requestedPlayerId || resolvePlayerId(socket);
    const existingPlayer = room.players.get(reconnectId);

    if (existingPlayer) {
        // This is a reconnect — mark player as connected, re-bind socket
        await room.markPlayerReconnected(reconnectId);

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.playerId = reconnectId;

        // Send full state back to the reconnecting client
        socket.emit('room_joined', {
            roomId: room.id,
            room: serializeRoom(room),
            myPlayerId: reconnectId,
        });

        // Notify other players
        socket.to(roomId).emit('player_reconnected', {
            playerId: reconnectId,
            room: serializeRoom(room),
        });

        // If a game is active, also send the current game state
        if (room.gameEngine) {
            socket.emit('game_state_updated', {
                roomId,
                gameState: sanitizeGameState(room.gameEngine.getState()),
            });
        }

        return;
    }

    // ── New player path ────────────────────────────────────────────────────
    if (room.isFull()) {
        socket.emit('error', {
            code: 'ROOM_FULL',
            message: 'Room is full',
        });
        return;
    }

    const playerId = resolvePlayerId(socket);
    const name = playerName || `Player_${playerId.substring(0, 6)}`;
    const added = await room.addPlayer(playerId, name);

    if (!added) {
        socket.emit('error', {
            code: 'JOIN_FAILED',
            message: 'Failed to join room',
        });
        return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;

    socket.emit('room_joined', {
        roomId: room.id,
        room: serializeRoom(room),
        myPlayerId: playerId,
    });

    socket.to(roomId).emit('player_joined', {
        playerId,
        playerName: name,
        room: serializeRoom(room),
    });

    // Broadcast updated room list to all
    await broadcastRoomList(io, roomManager);
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
        gameState: sanitizeGameState(room.gameEngine.getState()),
    });

    // Broadcast updated room list (room now in-game)
    await broadcastRoomList(io, roomManager);
}

async function handleLeaveRoom(socket: SocketType, _data: any, io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, roomManager: RoomManager): Promise<void> {
    const roomId = socket.data.roomId;

    if (!roomId) {
        socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You are not in a room',
        });
        return;
    }

    const playerId = socket.data.playerId || resolvePlayerId(socket);

    const room = await roomManager.getRoom(roomId);
    if (room) {
        await room.removePlayer(playerId);
        socket.leave(roomId);

        socket.to(roomId).emit('player_left', {
            playerId,
            room: serializeRoom(room),
        });

        if (room.isEmpty()) {
            await roomManager.deleteRoom(roomId);
        }

        // Broadcast updated room list
        await broadcastRoomList(io, roomManager);
    }

    socket.data.roomId = undefined;
    socket.data.playerId = undefined;

    socket.emit('room_left', { roomId });
}
async function handleRefreshRoomList(socket: SocketType, _data: any, roomManager: RoomManager): Promise<void> {
    const rooms = await roomManager.getWaitingRooms();
    socket.emit('room_list_updated', {
        rooms: rooms.map(serializeRoom)
    });
}

async function broadcastRoomList(io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, roomManager: RoomManager): Promise<void> {
    const rooms = await roomManager.getWaitingRooms();
    io.emit('room_list_updated', {
        rooms: rooms.map(serializeRoom)
    });
}
