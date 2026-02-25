// lib/socketSingleton.ts
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket.types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

function getSocketUrl(): string {
  // NEXT_PUBLIC_* vars are injected by Next.js at build/dev time into the
  // browser bundle. If the var is missing (e.g. during SSR or a cold Turbopack
  // build before the env is loaded), fall back to localhost so the app doesn't
  // crash. The real backend URL must be set in frontend/.env.local.
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    (typeof window !== 'undefined' ? 'http://localhost:3001' : '')
  );
}

/**
 * Returns the singleton Socket.IO client, or null during SSR.
 * All hooks must handle a null return (call only inside useEffect or after
 * a typeof window !== 'undefined' guard).
 */
export function getSocket(): AppSocket | null {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const url = getSocketUrl();
    if (!url) return null;

    socket = io(url, {
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