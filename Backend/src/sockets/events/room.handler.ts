// Backend/src/sockets/events/room.handler.ts - Phase 20: Performance Monitoring

import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, SerializedRoom, SanitizedGameState } from '../../types/socket.types.js';
import type { RoomManager } from '../../rooms/roomManager.js';
import type { Room } from '../../rooms/room.js';
import type { GameState } from '../../game/state.js';
import { applyMiddleware } from '../socketMiddleware.js';
import { metrics } from '../../lib/metrics.js';
import { CreateRoomSchema, JoinRoomSchema, validateSocketPayload } from '../../middlewares/validator.js';
import type { z } from 'zod';
import { botManager } from '../../bot/BotManager.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function registerRoomHandlers(
    socket: SocketType,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
) {
    // Bind handlers with middleware (auth, rate limit, error boundary)
    const createRoomHandler = applyMiddleware(socket, (s, data) => handleCreateRoom(s, data, io, roomManager));
    const joinRoomHandler   = applyMiddleware(socket, (s, data) => handleJoinRoom(s, data, io, roomManager));
    const startGameHandler  = applyMiddleware(socket, (s, data) => handleStartGame(s, data, io, roomManager));
    const leaveRoomHandler  = applyMiddleware(socket, (s, data) => handleLeaveRoom(s, data, io, roomManager));
    const listRoomsHandler  = applyMiddleware(socket, (s, data) => handleRefreshRoomList(s, data, roomManager));
    const addBotHandler     = applyMiddleware(socket, (s, data) => handleAddBot(s, data, io, roomManager));

    // Timing helper that preserves argument binding
    function time(eventName: string, fn: () => Promise<void> | void): void {
        const end = metrics.timeSocketEvent(eventName);
        Promise.resolve()
            .then(() => fn())
            .finally(() => end());
    }

    socket.on('create_room', (data: any) => time('create_room', () => createRoomHandler( data)));
    socket.on('join_room',   (data: any) => time('join_room',   () => joinRoomHandler( data)));
    socket.on('start_game',  (data: any) => time('start_game',  () => startGameHandler( data)));
    socket.on('leave_room',  (data: any) => time('leave_room',  () => leaveRoomHandler( data)));
    socket.on('refresh_room_list', (data: any) => time('refresh_room_list', () => listRoomsHandler( data)));
    socket.on('add_bot',     (data: any) => time('add_bot',     () => addBotHandler( data)));
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
function serializeRoom(room: Room): SerializedRoom {
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
    // Validate payload via Zod
    let validated: z.infer<typeof CreateRoomSchema>;
    try {
        validated = validateSocketPayload(CreateRoomSchema, data);
    } catch {
        socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid create_room payload' });
        return;
    }
    const { config, playerName } = validated;

    const room = await roomManager.createRoom(config);

    const playerId = resolvePlayerId(socket);
    if (!playerId) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
    }
    const name = playerName || `Player_${playerId.substring(0, 6)}`;
    await room.addPlayer(playerId, name);

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
    // Validate payload via Zod
    let validated: z.infer<typeof JoinRoomSchema>;
    try {
        validated = validateSocketPayload(JoinRoomSchema, data);
    } catch {
        socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid join_room payload' });
        return;
    }
    const { roomId, playerName } = validated;

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
    const reconnectId = resolvePlayerId(socket);
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
    if (!playerId) {
        socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
        return;
    }
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

    // Fill empty slots with bots if allowed
    if (room.config.allowBots && room.players.size < 4) {
        await botManager.fillRoom(room);
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

    // Check if the first player is a bot
    botManager.handleGameStateUpdate(room, io);
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

async function handleAddBot(
    socket: SocketType,
    _data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
): Promise<void> {
    const roomId = socket.data.roomId;
    if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You are not in a room' });
        return;
    }

    const room = await roomManager.getRoom(roomId);
    if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' });
        return;
    }

    if (room.gameEngine) {
        socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Cannot add bots during a game' });
        return;
    }

    if (room.isFull()) {
        socket.emit('error', { code: 'ROOM_FULL', message: 'Room is full' });
        return;
    }

    const botId = await botManager.addBot(room);
    if (!botId) {
        socket.emit('error', { code: 'ADD_BOT_FAILED', message: 'Failed to add bot' });
        return;
    }

    // Broadcast updated room to all players in the room
    io.to(roomId).emit('player_joined', {
        playerId: botId,
        playerName: room.players.get(botId)?.name ?? 'Bot',
        room: serializeRoom(room),
    });

    // Update lobby list
    await broadcastRoomList(io, roomManager);
}

async function broadcastRoomList(io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, roomManager: RoomManager): Promise<void> {
    const rooms = await roomManager.getWaitingRooms();
    io.emit('room_list_updated', {
        rooms: rooms.map(serializeRoom)
    });
}

