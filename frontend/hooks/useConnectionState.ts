// Frontend/hooks/useConnectionState.ts
// Tracks socket transport state only: connectivity, reconnection, and latency.
// Owns zero domain state. RoomState and GameStore must never be updated here.
//
// Design decisions:
//   - useReducer over multiple useState calls: connection fields update together
//     on a single socket event (e.g. reconnect sets isConnecting=false,
//     isConnected=true, reconnectAttempt=0 atomically). Separate useState calls
//     would cause three renders for one event.
//   - Latency: measured via socket's built-in ping event. Socket.IO emits 'ping'
//     internally; we record Date.now() on each ping and listen for the
//     corresponding 'pong' to calculate RTT. This requires no custom server code.
//   - All handlers are named function declarations inside useEffect so socket.off()
//     can remove the exact reference. Anonymous arrows cannot be removed.
//   - Stable return: the returned object is memoized so consumers don't re-render
//     when unrelated state changes in the tree.

'use client';

import { useEffect, useReducer, useCallback, useRef, useMemo } from 'react';
import { getSocket } from '@/lib/socketSingleton';
import {
  type ConnectionState,
  makeInitialConnectionState,
  resetConnectionState,
} from '@/lib/state';

// ─── Reducer ──────────────────────────────────────────────────────────────────
// useReducer is justified here: all five fields update as a unit on socket events.
// Individual useState calls would produce 3–5 intermediate renders per event.

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
  action: ConnectionAction
): ConnectionState {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, isConnecting: true, lastError: null };

    case 'CONNECTED':
      // All reconnection tracking clears atomically on successful connect.
      return {
        isConnected: true,
        isConnecting: false,
        reconnectAttempt: 0,
        lastError: null,
        latencyMs: state.latencyMs, // preserve last known latency
      };

    case 'DISCONNECTED':
      return {
        ...state,
        isConnected: false,
        isConnecting: false,
        // reconnectAttempt preserved — Socket.IO will fire RECONNECT_ATTEMPT next
      };

    case 'RECONNECT_ATTEMPT':
      return {
        ...state,
        isConnecting: true,
        reconnectAttempt: action.attempt,
      };

    case 'CONNECT_ERROR':
      return {
        ...state,
        isConnecting: false,
        isConnected: false,
        lastError: action.message,
      };

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
  /** Manually initiate connection. Safe to call if already connected. */
  connect: () => void;
  /** Manually disconnect. Safe to call if already disconnected. */
  disconnect: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConnectionState(): UseConnectionStateReturn {
  const socket = getSocket();

  const [state, dispatch] = useReducer(
    connectionReducer,
    // Hydrate from live socket state so first render is accurate even if the
    // socket singleton connected before this hook mounted.
    undefined,
    (): ConnectionState => ({
      ...makeInitialConnectionState(),
      isConnected: socket.connected,
    })
  );

  // pingStartRef: records the timestamp when the internal Socket.IO ping was
  // sent so we can compute RTT when the pong arrives.
  const pingStartRef = useRef<number | null>(null);

  useEffect(() => {
    // ── Named handlers (required for socket.off by reference) ─────────────────

    function onConnect() {
      dispatch({ type: 'CONNECTED' });
    }

    function onDisconnect() {
      dispatch({ type: 'DISCONNECTED' });
    }

    function onConnectError(err: Error) {
      dispatch({ type: 'CONNECT_ERROR', message: err.message });
    }

    // Socket.IO fires 'reconnect_attempt' (number) on each retry.
    function onReconnectAttempt(attempt: number) {
      dispatch({ type: 'RECONNECT_ATTEMPT', attempt });
    }

    // Socket.IO internal ping — fires before the server pong.
    // 'ping' is emitted by the Socket.IO client engine when it sends a heartbeat.
    function onPing() {
      pingStartRef.current = Date.now();
    }

    // 'pong' fires when the server heartbeat response arrives.
    // latency parameter is the RTT in ms provided by Socket.IO engine >= v3.
    function onPong(latency?: number) {
      // Prefer the engine-provided latency; fall back to manual measurement.
      const ms = typeof latency === 'number' ? latency : pingStartRef.current !== null
        ? Date.now() - pingStartRef.current
        : null;

      if (ms !== null) {
        dispatch({ type: 'LATENCY_MEASURED', ms });
      }
      pingStartRef.current = null;
    }

    // Register all listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.engine?.on('ping', onPing);
    socket.io.engine?.on('pong', onPong);

    // Sync in case socket connected before this effect ran (singleton may already be live)
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
  }, [socket]); // socket is the stable singleton — this effect runs once

  const connect = useCallback(() => {
    if (!socket.connected) {
      dispatch({ type: 'CONNECTING' });
      socket.connect();
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  }, [socket]);

  // Stable return shape — memoized so downstream consumers don't re-render
  // when siblings in the component tree update unrelated context slices.
  return useMemo(
    () => ({ ...state, connect, disconnect }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, connect, disconnect]
  );
}