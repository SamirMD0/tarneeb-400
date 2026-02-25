// Frontend/hooks/useRoomEvents.ts
// Pure side-effect hook. Registers all Server → Client room event listeners.
// Feeds updates into the RoomState reducer via the dispatch from useRoom.
// Must be called once at the top of the room-scoped component tree.

'use client';

import { useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socketSingleton';
import type { RoomAction } from '@/types/room.types';

interface UseRoomEventsParams {
  dispatch: React.Dispatch<RoomAction>;
  roomId: string | null;
  myPlayerId: string | null;
}

export function useRoomEvents({
  dispatch,
  roomId,
  myPlayerId,
}: UseRoomEventsParams): void {
  const socket = getSocket();
  const stableDispatch = useCallback(dispatch, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // SSR / socket not yet available
    if (!socket) return;

    function onRoomCreated(data: Parameters<import('@/types/socket.types').ServerToClientEvents['room_created']>[0]) {
      stableDispatch({
        type: 'ROOM_JOINED',
        roomId: data.roomId,
        room: data.room,
        myPlayerId: data.myPlayerId,
      });
    }

    function onRoomJoined(data: Parameters<import('@/types/socket.types').ServerToClientEvents['room_joined']>[0]) {
      stableDispatch({
        type: 'ROOM_JOINED',
        roomId: data.roomId,
        room: data.room,
        myPlayerId: data.myPlayerId,
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

    function onRoomListUpdated(data: Parameters<import('@/types/socket.types').ServerToClientEvents['room_list_updated']>[0]) {
      stableDispatch({ type: 'ROOM_LIST_UPDATED', rooms: data.rooms });
    }

    function onError(data: Parameters<import('@/types/socket.types').ServerToClientEvents['error']>[0]) {
      stableDispatch({ type: 'ERROR', error: data });
    }

    function onReconnect() {
      if (roomId && socket) {
        socket.emit('join_room', {
          roomId,
          playerName: undefined,
          playerId: myPlayerId ?? undefined,
        });
      }
    }

    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_left', onRoomLeft);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('player_disconnected', onPlayerDisconnected);
    socket.on('player_reconnected', onPlayerReconnected);
    socket.on('room_list_updated', onRoomListUpdated);
    socket.on('error', onError);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_left', onRoomLeft);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('player_disconnected', onPlayerDisconnected);
      socket.off('player_reconnected', onPlayerReconnected);
      socket.off('room_list_updated', onRoomListUpdated);
      socket.off('error', onError);
      socket.off('connect', onReconnect);
    };
  }, [socket, stableDispatch, roomId, myPlayerId]);
}