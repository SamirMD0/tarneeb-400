import { io, type Socket } from 'socket.io-client';
import { ENV } from './env';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket.types';

export const createSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> =>
  io(ENV.SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false,
  });

  export { getSocket } from './socketSingleton';
export type { AppSocket } from './socketSingleton';