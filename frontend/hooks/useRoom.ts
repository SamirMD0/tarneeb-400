// Frontend/hooks/useRoom.ts
// Owns the RoomState via useReducer.
// Exposes action emitters (Client → Server) and current room state.
// State is ONLY updated by server events via useRoomEvents — no optimistic mutations.

'use client';

import { useReducer, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socketSingleton';
import {
  roomReducer,
  initialRoomState,
  type RoomState,
  type RoomAction,
  type SerializedRoom,
} from '../types/room.types';
import type { RoomConfig } from '../types/room.types';

export interface UseRoomReturn {
  roomId: string | null;
  room: RoomState['room'];
  myPlayerId: string | null;
  isLoading: boolean;
  availableRooms: SerializedRoom[];
  error: RoomState['error'];
  roomIdRef: React.RefObject<string | null>;
  createRoom: (config: RoomConfig, playerName?: string) => void;
  joinRoom: (roomId: string, playerName?: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  refreshRoomList: () => void;
  dispatch: React.Dispatch<RoomAction>;
}

export function useRoom(): UseRoomReturn {
  const socket = getSocket();
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);

  const myPlayerIdRef = useRef<string | null>(null);
  myPlayerIdRef.current = state.myPlayerId;

  const roomIdRef = useRef<string | null>(null);
  roomIdRef.current = state.roomId;

  const createRoom = useCallback(
    (config: RoomConfig, playerName?: string) => {
      if (!socket) return;
      dispatch({ type: 'LOADING' });
      socket.emit('create_room', { config, playerName });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (roomId: string, playerName?: string) => {
      if (!socket) return;
      dispatch({ type: 'LOADING' });
      socket.emit('join_room', { roomId, playerName });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    socket.emit('leave_room', {});
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('start_game', {});
  }, [socket]);

  const refreshRoomList = useCallback(() => {
    if (!socket) return;
    socket.emit('refresh_room_list', {});
  }, [socket]);

  return {
    roomId: state.roomId,
    room: state.room,
    myPlayerId: state.myPlayerId,
    isLoading: state.isLoading,
    availableRooms: state.availableRooms,
    error: state.error,
    roomIdRef,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    refreshRoomList,
    dispatch,
  };
}