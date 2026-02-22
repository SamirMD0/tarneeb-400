// Frontend/hooks/useGameEvents.ts
// Pure side-effect hook. Registers all Server → Client game event listeners.
// Feeds into useGameState reducer via dispatch.
// Must be called once at the game-scoped component tree level.

'use client';

import { useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socketSingleton';
import type { GameStateAction } from '@/hooks/useGameState';

interface UseGameEventsParams {
  dispatch: React.Dispatch<GameStateAction>;
  // Needed for reconnect re-sync
  roomId: string | null;
}

export function useGameEvents({ dispatch, roomId }: UseGameEventsParams): void {
  const socket = getSocket();

  // Stable dispatch reference — prevents re-registering listeners on every render
  const stableDispatch = useCallback(dispatch, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // ── Server → Client handlers (named for clean socket.off) ─────────────────

    function onGameStarted(
      data: Parameters<import('@/types/socket.types').ServerToClientEvents['game_started']>[0]
    ) {
      stableDispatch({ type: 'GAME_STARTED', gameState: data.gameState });
    }

    function onGameStateUpdated(
      data: Parameters<import('@/types/socket.types').ServerToClientEvents['game_state_updated']>[0]
    ) {
      // Backend always sends a full GameState snapshot.
      // play_card auto-triggers END_TRICK and END_ROUND server-side before broadcast,
      // so this single event covers trick resolution and round advancement too.
      stableDispatch({ type: 'STATE_UPDATED', gameState: data.gameState });
    }

    function onGameOver(
      data: Parameters<import('@/types/socket.types').ServerToClientEvents['game_over']>[0]
    ) {
      stableDispatch({
        type: 'GAME_OVER',
        winner: data.winner,
        finalScore: data.finalScore,
      });
    }

    function onError(
      data: Parameters<import('@/types/socket.types').ServerToClientEvents['error']>[0]
    ) {
      // Only game-action error codes are relevant here:
      // INVALID_ACTION, NOT_IN_ROOM, GAME_NOT_STARTED, INVALID_PAYLOAD
      // Room-lifecycle errors are handled by useRoomEvents.
      stableDispatch({ type: 'SET_ERROR', error: data });
    }

    // ── Reconnect sync ──────────────────────────────────────────────────────────
    // On reconnect, re-join the room so the server re-adds this socket to the
    // Socket.IO room channel and re-broadcasts the current game_state_updated.
    // Game state is recovered from the server snapshot — no local cache used.
    function onReconnect() {
      if (roomId) {
        socket.emit('join_room', { roomId });
      }
    }

    socket.on('game_started', onGameStarted);
    socket.on('game_state_updated', onGameStateUpdated);
    socket.on('game_over', onGameOver);
    socket.on('error', onError);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('game_started', onGameStarted);
      socket.off('game_state_updated', onGameStateUpdated);
      socket.off('game_over', onGameOver);
      socket.off('error', onError);
      socket.off('connect', onReconnect);
    };
  }, [socket, stableDispatch, roomId]);
}