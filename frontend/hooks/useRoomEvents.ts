// Frontend/hooks/useRoomEvents.ts
// Pure side-effect hook. Registers all Server → Client room event listeners.
// Feeds updates into the RoomState reducer via the dispatch from useRoom.
// Must be called once at the top of the room-scoped component tree.
// Handles reconnect re-sync automatically.

'use client';

import { useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socketSingleton';
import type { RoomAction } from '@/types/room.types';

interface UseRoomEventsParams {
  dispatch: React.Dispatch<RoomAction>;
  // Passed in so reconnect logic can re-join the correct room
  roomId: string | null;
  myPlayerId: string | null;
}

export function useRoomEvents({
  dispatch,
  roomId,
  myPlayerId,
}: UseRoomEventsParams): void {
  const socket = getSocket();

  // Stable dispatch reference — avoids re-registering listeners on every render
  const stableDispatch = useCallback(dispatch, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // ── Server → Client handlers (named functions for clean socket.off) ────────

    function onRoomCreated(data: Parameters<import('@/types/socket.types').ServerToClientEvents['room_created']>[0]) {
      stableDispatch({
        type: 'ROOM_JOINED',
        roomId: data.roomId,
        room: data.room,
        myPlayerId: socket.id ?? '',
      });
    }

    function onRoomJoined(data: Parameters<import('@/types/socket.types').ServerToClientEvents['room_joined']>[0]) {
      stableDispatch({
        type: 'ROOM_JOINED',
        roomId: data.roomId,
        room: data.room,
        myPlayerId: socket.id ?? '',
      });
    }

    function onRoomLeft(_data: Parameters<import('@/types/socket.types').ServerToClientEvents['room_left']>[0]) {
      stableDispatch({ type: 'ROOM_LEFT' });
    }

    function onPlayerJoined(data: Parameters<import('@/types/socket.types').ServerToClientEvents['player_joined']>[0]) {
      stableDispatch({ type: 'ROOM_UPDATED', room: data.room });
    }

    function onPlayerLeft(data: Parameters<import('@/types/socket.types').ServerToClientEvents['player_left']>[0]) {
      stableDispatch({ type: 'ROOM_UPDATED', room: data.room });
    }

    function onPlayerDisconnected(data: Parameters<import('@/types/socket.types').ServerToClientEvents['player_disconnected']>[0]) {
      stableDispatch({ type: 'ROOM_UPDATED', room: data.room });
    }

    function onPlayerReconnected(data: Parameters<import('@/types/socket.types').ServerToClientEvents['player_reconnected']>[0]) {
      stableDispatch({ type: 'ROOM_UPDATED', room: data.room });
    }

    function onError(data: Parameters<import('@/types/socket.types').ServerToClientEvents['error']>[0]) {
      stableDispatch({ type: 'ERROR', error: data });
    }

    // ── Reconnect sync ──────────────────────────────────────────────────────────
    // When the socket reconnects, if we were in a room, re-emit join_room so the
    // server adds this socket back to the Socket.IO room channel and re-broadcasts
    // the current room + game state. This is the ONLY recovery mechanism — no
    // local state cache is used.
    function onReconnect() {
      if (roomId) {
        socket.emit('join_room', { roomId, playerName: undefined });
      }
    }

    // Register all listeners
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_left', onRoomLeft);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('player_disconnected', onPlayerDisconnected);
    socket.on('player_reconnected', onPlayerReconnected);
    socket.on('error', onError);
    socket.on('connect', onReconnect);

    // Cleanup — removes all listeners by reference to prevent ghost handlers
    return () => {
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_left', onRoomLeft);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('player_disconnected', onPlayerDisconnected);
      socket.off('player_reconnected', onPlayerReconnected);
      socket.off('error', onError);
      socket.off('connect', onReconnect);
    };
  }, [socket, stableDispatch, roomId]); // roomId in deps so reconnect always has current value
}