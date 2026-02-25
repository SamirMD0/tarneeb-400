// Frontend/hooks/useConnectionState.ts
// Tracks socket transport state only: connectivity, reconnection, and latency.
// Owns zero domain state. RoomState and GameStore must never be updated here.

'use client';

import { useEffect, useReducer, useCallback, useRef, useMemo } from 'react';
import { getSocket } from '@/lib/socketSingleton';
import {
  type ConnectionState,
  makeInitialConnectionState,
  resetConnectionState,
} from '@/lib/state';

// ─── Reducer ──────────────────────────────────────────────────────────────────

type ConnectionAction =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'RECONNECT_ATTEMPT'; attempt: number }
  | { type: 'CONNECT_ERROR'; message: string }
  | { type: 'LATENCY_MEASURED'; ms: number }
  | { type: 'RESET' };

function connectionReducer(
  state: ConnectionState,
  action: ConnectionAction,
): ConnectionState {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, isConnecting: true, lastError: null };

    case 'CONNECTED':
      return {
        isConnected: true,
        isConnecting: false,
        reconnectAttempt: 0,
        lastError: null,
        latencyMs: state.latencyMs,
      };

    case 'DISCONNECTED':
      return { ...state, isConnected: false, isConnecting: false };

    case 'RECONNECT_ATTEMPT':
      return { ...state, isConnecting: true, reconnectAttempt: action.attempt };

    case 'CONNECT_ERROR':
      return { ...state, isConnecting: false, isConnected: false, lastError: action.message };

    case 'LATENCY_MEASURED':
      return { ...state, latencyMs: action.ms };

    case 'RESET':
      return resetConnectionState();

    default:
      return state;
  }
}

// ─── Public return shape ───────────────────────────────────────────────────────

export interface UseConnectionStateReturn extends ConnectionState {
  connect: () => void;
  disconnect: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConnectionState(): UseConnectionStateReturn {
  // getSocket() returns null during SSR — all socket access below must be
  // guarded. The socket is a stable singleton so this value never changes
  // after the first browser render.
  const socket = getSocket();

  const [state, dispatch] = useReducer(
    connectionReducer,
    undefined,
    (): ConnectionState => ({
      ...makeInitialConnectionState(),
      // socket is null during SSR; default to false
      isConnected: socket?.connected ?? false,
    }),
  );

  const pingStartRef = useRef<number | null>(null);

  useEffect(() => {
    // No socket in SSR or if env URL is missing — nothing to subscribe to.
    if (!socket) return;

    function onConnect() {
      dispatch({ type: 'CONNECTED' });
    }
    function onDisconnect() {
      dispatch({ type: 'DISCONNECTED' });
    }
    function onConnectError(err: Error) {
      dispatch({ type: 'CONNECT_ERROR', message: err.message });
    }
    function onReconnectAttempt(attempt: number) {
      dispatch({ type: 'RECONNECT_ATTEMPT', attempt });
    }
    function onPing() {
      pingStartRef.current = Date.now();
    }
    function onPong(latency?: number) {
      const ms =
        typeof latency === 'number'
          ? latency
          : pingStartRef.current !== null
            ? Date.now() - pingStartRef.current
            : null;
      if (ms !== null) dispatch({ type: 'LATENCY_MEASURED', ms });
      pingStartRef.current = null;
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.engine?.on('ping', onPing);
    socket.io.engine?.on('pong', onPong);

    // Sync in case socket connected before this effect ran
    if (socket.connected && !state.isConnected) {
      dispatch({ type: 'CONNECTED' });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.engine?.off('ping', onPing);
      socket.io.engine?.off('pong', onPong);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const connect = useCallback(() => {
    if (socket && !socket.connected) {
      dispatch({ type: 'CONNECTING' });
      socket.connect();
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket?.connected) {
      socket.disconnect();
    }
  }, [socket]);

  return useMemo(
    () => ({ ...state, connect, disconnect }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, connect, disconnect],
  );
}