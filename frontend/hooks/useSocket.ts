// Frontend/hooks/useSocket.ts
// Manages the socket connection lifecycle only.
// Does NOT handle room events, game events, or state — those live in domain hooks.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socketSingleton';

export interface UseSocketReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket(): UseSocketReturn {
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);

  useEffect(() => {
    // Named handlers — required for socket.off() to remove the correct listener.
    // Anonymous functions passed to socket.on() cannot be removed by socket.off().
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onConnectError() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Sync with actual socket state in case it connected before this effect ran
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [socket]);

  const connect = useCallback(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  }, [socket]);

  return { isConnected, connect, disconnect };
}