// Frontend/hooks/useSocket.ts
//
// @deprecated — Use useConnectionState instead.
// Kept only for backward compatibility. Do not use in new code.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socketSingleton';

export interface UseSocketReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

/**
 * @deprecated Use `useConnectionState()` from `@/hooks/useConnectionState` instead.
 */
export function useSocket(): UseSocketReturn {
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState<boolean>(socket?.connected ?? false);

  useEffect(() => {
    if (!socket) return;

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }
    function onConnectError() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [socket]);

  const connect = useCallback(() => {
    if (socket && !socket.connected) socket.connect();
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket?.connected) socket.disconnect();
  }, [socket]);

  return { isConnected, connect, disconnect };
}