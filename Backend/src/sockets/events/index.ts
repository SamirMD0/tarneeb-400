// Backend/src/sockets/events/index.ts - Phase 18: Event Handler Aggregator

import { registerBiddingHandlers } from './bidding.handler.js';
import { registerPlayingHandlers } from './playing.handler.js';
import { registerRoomHandlers } from './room.handler.js';
import type { RoomManager } from '../../rooms/roomManager.js';

export function registerAllSocketEventHandlers(socket: any, io: any, roomManager: RoomManager) {
    registerBiddingHandlers(socket, io, roomManager);
    registerPlayingHandlers(socket, io, roomManager);
    registerRoomHandlers(socket, io, roomManager);
}
