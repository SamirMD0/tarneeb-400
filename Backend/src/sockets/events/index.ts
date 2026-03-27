// Backend/src/sockets/events/index.ts - Phase 18: Event Handler Aggregator

import { Server, Socket } from 'socket.io';
import { registerBiddingHandlers } from './bidding.handler.js';
import { registerPlayingHandlers } from './playing.handler.js';
import { registerRoomHandlers } from './room.handler.js';
import type { RoomManager } from '../../rooms/roomManager.js';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/socket.types.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function registerAllSocketEventHandlers(
    socket: SocketType,
    io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    roomManager: RoomManager
) {
    registerBiddingHandlers(socket, io, roomManager);
    registerPlayingHandlers(socket, io, roomManager);
    registerRoomHandlers(socket, io, roomManager);
}
