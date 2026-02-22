// Frontend/lib/socketSingleton.ts
// Single Socket.IO instance shared across the entire app.
// Never import socket directly in components — always go through hooks.

import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket.types';
import { ENV } from './env';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Returns the module-level socket singleton.
 * Creates it on first call; subsequent calls return the same instance.
 * autoConnect: false — connection is driven explicitly by useSocket.
 */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(ENV.SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}