// Frontend/hooks/useGameState.ts
// Owns the GameState store via useReducer.
// State is always replaced wholesale from server snapshots — never patched.
// Computes DerivedGameView via useMemo so components never inspect raw GameState.

'use client';

import { useReducer, useMemo } from 'react';
import type { GameState, DerivedGameView } from '@/types/game.types';

// ─── Reducer ──────────────────────────────────────────────────────────────────

interface GameStateStore {
  gameState: GameState | null;
  gameOver: { winner: 1 | 2; finalScore: unknown } | null;
  lastError: { code: string; message: string } | null;
}

export type GameStateAction =
  | { type: 'GAME_STARTED'; gameState: GameState }
  | { type: 'STATE_UPDATED'; gameState: GameState }
  | { type: 'GAME_OVER'; winner: 1 | 2; finalScore: unknown }
  | { type: 'SET_ERROR'; error: { code: string; message: string } }
  | { type: 'CLEAR_ERROR' };

const initialGameStore: GameStateStore = {
  gameState: null,
  gameOver: null,
  lastError: null,
};

function gameStateReducer(state: GameStateStore, action: GameStateAction): GameStateStore {
  switch (action.type) {
    case 'GAME_STARTED':
      // Full snapshot — replace entirely, clear any stale error
      return { ...state, gameState: action.gameState, lastError: null };

    case 'STATE_UPDATED':
      // Full snapshot from backend after every accepted action — always replace
      return { ...state, gameState: action.gameState, lastError: null };

    case 'GAME_OVER':
      return {
        ...state,
        gameOver: { winner: action.winner, finalScore: action.finalScore },
        lastError: null,
      };

    case 'SET_ERROR':
      return { ...state, lastError: action.error };

    case 'CLEAR_ERROR':
      return { ...state, lastError: null };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseGameStateReturn {
  gameState: GameState | null;
  gameOver: GameStateStore['gameOver'];
  lastError: GameStateStore['lastError'];
  derived: DerivedGameView;
  dispatch: React.Dispatch<GameStateAction>;
}

export function useGameState(myPlayerId: string | null): UseGameStateReturn {
  const [store, dispatch] = useReducer(gameStateReducer, initialGameStore);

  // Derived view — recomputes only when gameState or myPlayerId changes.
  // Components must always read from `derived`, never from raw gameState.
  const derived = useMemo<DerivedGameView>(() => {
    const gs = store.gameState;

    if (!gs) {
      return {
        myPlayer: null,
        myTeamId: null,
        activePlayerId: null,
        isMyTurn: false,
        isBidWinner: false,
        mustSelectTrump: false,
        myHand: [],
        currentTrick: [],
        phase: null,
        gameOver: store.gameOver,
      };
    }

    const activePlayer = gs.players[gs.currentPlayerIndex] ?? null;
    const activePlayerId = activePlayer?.id ?? null;
    const myPlayer = gs.players.find((p) => p.id === myPlayerId) ?? null;
    const isMyTurn = !!myPlayerId && activePlayerId === myPlayerId;
    const isBidWinner = !!myPlayerId && gs.bidderId === myPlayerId;
    const mustSelectTrump =
      isBidWinner && gs.phase === 'BIDDING' && !gs.trumpSuit;

    return {
      myPlayer,
      myTeamId: myPlayer?.teamId ?? null,
      activePlayerId,
      isMyTurn,
      isBidWinner,
      mustSelectTrump,
      myHand: myPlayer?.hand ?? [],
      currentTrick: gs.trick,
      phase: gs.phase,
      gameOver: store.gameOver,
    };
  }, [store.gameState, store.gameOver, myPlayerId]);

  return {
    gameState: store.gameState,
    gameOver: store.gameOver,
    lastError: store.lastError,
    derived,
    dispatch,
  };
}