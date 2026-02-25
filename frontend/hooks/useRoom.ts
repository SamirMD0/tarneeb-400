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
  // State
  roomId: string | null;
  room: RoomState['room'];
  myPlayerId: string | null;
  isLoading: boolean;
  availableRooms: SerializedRoom[];
  error: RoomState['error'];

  // Refs — stable references for use in unmount effects to avoid stale closures
  roomIdRef: React.RefObject<string | null>;

  // Emitters
  createRoom: (config: RoomConfig, playerName?: string) => void;
  joinRoom: (roomId: string, playerName?: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  refreshRoomList: () => void;

  // Internal — consumed by useRoomEvents only
  dispatch: React.Dispatch<RoomAction>;
}

export function useRoom(): UseRoomReturn {
  const socket = getSocket();
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);

  // Keep refs to myPlayerId and roomId so reconnect/unmount logic can read
  // current values without creating stale closures.
  const myPlayerIdRef = useRef<string | null>(null);
  myPlayerIdRef.current = state.myPlayerId;

  const roomIdRef = useRef<string | null>(null);
  roomIdRef.current = state.roomId;

  const createRoom = useCallback(
    (config: RoomConfig, playerName?: string) => {
      dispatch({ type: 'LOADING' });
      socket.emit('create_room', { config, playerName });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (roomId: string, playerName?: string) => {
      dispatch({ type: 'LOADING' });
      socket.emit('join_room', { roomId, playerName });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    socket.emit('leave_room', {});
    // State is cleared only after room_left is received from the server.
  }, [socket]);

  const startGame = useCallback(() => {
    socket.emit('start_game', {});
  }, [socket]);

  const refreshRoomList = useCallback(() => {
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