// Frontend/hooks/useGameActions.ts
// Provides typed emitter functions for all game actions.
// Guards prevent out-of-turn or wrong-phase emissions — they are safety nets only.
// UI disabled-state MUST be driven by DerivedGameView, not by these guards.
// No game rule enforcement here — backend owns all validation.

'use client';

import { useCallback } from 'react';
import { getSocket } from '@/lib/socketSingleton';
import type { DerivedGameView, Suit, Card } from '@/types/game.types';
import type { GameStateAction } from '@/hooks/useGameState';

interface UseGameActionsParams {
  derived: DerivedGameView;
  dispatch: React.Dispatch<GameStateAction>;
}

export interface UseGameActionsReturn {
  placeBid: (value: number) => void;
  passBid: () => void;
  selectTrump: (suit: Suit) => void;
  playCard: (card: Card) => void;
}

export function useGameActions({
  derived,
  dispatch,
}: UseGameActionsParams): UseGameActionsReturn {
  const socket = getSocket();

  const placeBid = useCallback(
    (value: number) => {
      if (!socket) return;
      if (!derived.isMyTurn || derived.phase !== 'BIDDING') return;
      dispatch({ type: 'CLEAR_ERROR' });
      socket.emit('place_bid', { value });
    },
    [socket, dispatch, derived.isMyTurn, derived.phase]
  );

  const passBid = useCallback(() => {
    if (!socket) return;
    if (!derived.isMyTurn || derived.phase !== 'BIDDING') return;
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('pass_bid', {});
  }, [socket, dispatch, derived.isMyTurn, derived.phase]);

  const selectTrump = useCallback(
    (suit: Suit) => {
      if (!socket) return;
      if (!derived.mustSelectTrump) return;
      dispatch({ type: 'CLEAR_ERROR' });
      socket.emit('set_trump', { suit });
    },
    [socket, dispatch, derived.mustSelectTrump]
  );

  const playCard = useCallback(
    (card: Card) => {
      if (!socket) return;
      if (!derived.isMyTurn || derived.phase !== 'PLAYING') return;
      dispatch({ type: 'CLEAR_ERROR' });
      socket.emit('play_card', { card: { suit: card.suit, rank: card.rank } });
    },
    [socket, dispatch, derived.isMyTurn, derived.phase]
  );

  return { placeBid, passBid, selectTrump, playCard };
}