// Backend/src/sockets/events/playing.handler.ts - Phase 20: Performance Monitoring

import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, SanitizedGameState } from '../../types/socket.types.js';
import type { GameAction } from '../../game/actions.js';
import type { GameState } from '../../game/state.js';
import type { RoomManager } from '../../rooms/roomManager.js';
import { errorBoundary } from '../socketMiddleware.js';
import { metrics } from '../../lib/metrics.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/**
 * Strip `deck` from GameState before broadcasting.
 */
function sanitizeGameState(state: Readonly<GameState>): SanitizedGameState {
    const { deck, ...safe } = state;
    return safe;
}

export function registerPlayingHandlers(
    socket: SocketType,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
) {
    // ✅ Phase 20: Wrap handler with performance timing
    // errorBoundary wrapper only; rate limit excluded for play_card
    const safePlay = errorBoundary((sock, data) => handlePlayCard(sock, data, io, roomManager));
    const playCard = wrapWithTiming('play_card', (data: any) => safePlay(socket, data));

    socket.on('play_card', (data: any) => playCard(data));
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

async function handlePlayCard(
    socket: SocketType,
    data: any,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
): Promise<void> {
    const roomId = socket.data.roomId;

    if (!roomId) {
        socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must be in a room to play cards',
        });
        return;
    }

    const card = data?.card;
    if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
        socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid play_card payload',
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

    if (!room.gameEngine) {
        socket.emit('error', {
            code: 'GAME_NOT_STARTED',
            message: 'Game has not started yet',
        });
        return;
    }

    // Use stable playerId from socket.data, not socket.id
    const playerId = socket.data.playerId || socket.id;

    const action: GameAction = {
        type: 'PLAY_CARD',
        playerId,
        card,
    } as any;

    const played = room.gameEngine.dispatch(action);
    if (!played) {
        socket.emit('error', {
            code: 'INVALID_ACTION',
            message: 'Play card was rejected by game engine',
        });
        return;
    }

    // Auto-trigger END_TRICK when 4 cards are played
    let state = room.gameEngine.getState();
    if (state.trick.length === 4) {
        room.gameEngine.dispatch({ type: 'END_TRICK' });
        state = room.gameEngine.getState();

        // Auto-trigger END_ROUND when 13 tricks are completed
        const totalTricks = state.teams[1].tricksWon + state.teams[2].tricksWon;
        if (totalTricks === 13) {
            room.gameEngine.dispatch({ type: 'END_ROUND' });
            state = room.gameEngine.getState();
        }
    }

    // Broadcast updated state (deck stripped)
    io.to(roomId).emit('game_state_updated', {
        roomId,
        gameState: sanitizeGameState(state),
    });

    // ── Fix 4: Emit game_over when the game ends ──────────────────────────
    if (room.gameEngine.isGameOver()) {
        const winner = room.gameEngine.getWinner();
        if (winner) {
            io.to(roomId).emit('game_over', {
                roomId,
                winner,
                finalScore: {
                    team1: state.teams[1].score,
                    team2: state.teams[2].score,
                },
            });
        }
    }
}
