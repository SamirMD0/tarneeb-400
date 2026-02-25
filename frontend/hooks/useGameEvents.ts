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
  roomId: string | null;
}

export function useGameEvents({ dispatch }: UseGameEventsParams): void {
  const socket = getSocket();
  const stableDispatch = useCallback(dispatch, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // SSR / socket not yet available
    if (!socket) return;

    function onGameStarted(
      data: Parameters<import('@/types/socket.types').ServerToClientEvents['game_started']>[0]
    ) {
      stableDispatch({ type: 'GAME_STARTED', gameState: data.gameState });
    }

    function onGameStateUpdated(
      data: Parameters<import('@/types/socket.types').ServerToClientEvents['game_state_updated']>[0]
    ) {
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
      stableDispatch({ type: 'SET_ERROR', error: data });
    }

    socket.on('game_started', onGameStarted);
    socket.on('game_state_updated', onGameStateUpdated);
    socket.on('game_over', onGameOver);
    socket.on('error', onError);

    return () => {
      socket.off('game_started', onGameStarted);
      socket.off('game_state_updated', onGameStateUpdated);
      socket.off('game_over', onGameOver);
      socket.off('error', onError);
    };
  }, [socket, stableDispatch]);
}