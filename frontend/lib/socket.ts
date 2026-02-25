/**
 * lib/socket.ts
 *
 * Single source of truth re-export for the socket singleton.
 * createSocket() has been removed — it produced a second disconnected instance
 * whenever called accidentally, breaking room join, game events, and reconnect.
 *
 * Always import socket access via getSocket() from lib/socketSingleton.ts,
 * or via hooks (useRoom, useGameEvents, useConnectionState, etc.).
 */
export { getSocket } from './socketSingleton';
export type { AppSocket } from './socketSingleton';