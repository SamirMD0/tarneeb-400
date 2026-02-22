// Frontend/hooks/useDerivedGameView.ts
// Pure derivation hook. Accepts raw GameState and returns a stable DerivedGameView.
//
// Why a separate hook instead of inlining in useGameState?
//   1. Reuse: any component tree with access to raw GameState (e.g. a spectator view
//      or a testing harness) can derive the view without mounting useGameState's reducer.
//   2. Testability: pure input/output — no socket, no reducer, no side effects.
//      Unit tests pass GameState fixtures and assert on DerivedGameView fields directly.
//   3. Single responsibility: useGameState owns the store; useDerivedGameView owns
//      the derivation. If the derivation logic changes (e.g. trump selection rule),
//      only this file changes.
//
// Rules:
//   - No mutation of input arguments.
//   - All outputs memoized. Referential equality is preserved when inputs don't change.
//   - Safe fallback shape returned when gameState is null — no optional chaining in consumers.
//   - No socket access. No reducer. No useEffect.

'use client';

import { useMemo } from 'react';
import type {
  GameState,
  DerivedGameView,
  PlayerState,
  Card,
  GamePhase,
} from '@/types/game.types';

// ─── Trick summary ─────────────────────────────────────────────────────────────
// Aggregated per-player trick data for the current round.
// Components should display trickSummary, not inspect GameState.teams directly.

export interface TrickSummary {
  team1TricksWon: number;
  team2TricksWon: number;
  totalTricksPlayed: number;   // team1 + team2 (0–13 per round)
  tricksRemaining: number;     // 13 - totalTricksPlayed
  bidValue: number | null;     // winning bid (null before bid is settled)
  bidderTeamId: 1 | 2 | null;  // team of the bid winner (null before bid is settled)
}

// ─── Room readiness flags ──────────────────────────────────────────────────────
// Derived from SerializedRoom in conjunction with GameState phase.
// Components use these to gate "Start Game" button visibility and player slot rendering.
// roomReadiness is computed separately in useAppState where both room and game are in scope.
// This hook only computes the game-phase portion.

export interface GameReadinessFlags {
  gameIsActive: boolean;       // phase is BIDDING or PLAYING
  gameIsOver: boolean;         // phase is GAME_OVER
  biddingIsComplete: boolean;  // trumpSuit has been set (bidding fully resolved)
  roundIsComplete: boolean;    // phase is SCORING
}

// ─── Full derived view ─────────────────────────────────────────────────────────

export interface FullDerivedGameView extends DerivedGameView {
  trickSummary: TrickSummary;
  readiness: GameReadinessFlags;
}

// ─── Null-safe fallback ────────────────────────────────────────────────────────
// Returned when gameState is null. Stable reference — defined once at module level
// so useMemo's equality check returns true across renders when gameState stays null.

const NULL_TRICK_SUMMARY: TrickSummary = {
  team1TricksWon: 0,
  team2TricksWon: 0,
  totalTricksPlayed: 0,
  tricksRemaining: 13,
  bidValue: null,
  bidderTeamId: null,
};

const NULL_READINESS: GameReadinessFlags = {
  gameIsActive: false,
  gameIsOver: false,
  biddingIsComplete: false,
  roundIsComplete: false,
};

const NULL_GAME_OVER: DerivedGameView['gameOver'] = null;

function makeNullDerivedView(
  gameOver: DerivedGameView['gameOver']
): FullDerivedGameView {
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
    gameOver,
    trickSummary: NULL_TRICK_SUMMARY,
    readiness: NULL_READINESS,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDerivedGameViewParams {
  gameState: GameState | null;
  gameOver: DerivedGameView['gameOver'];
  myPlayerId: string | null;
}

export function useDerivedGameView({
  gameState,
  gameOver,
  myPlayerId,
}: UseDerivedGameViewParams): FullDerivedGameView {
  return useMemo<FullDerivedGameView>(() => {
    if (!gameState) {
      return makeNullDerivedView(gameOver);
    }

    const gs = gameState;

    // ── Player derivation ─────────────────────────────────────────────────────
    const activePlayer: PlayerState | null = gs.players[gs.currentPlayerIndex] ?? null;
    const activePlayerId: string | null = activePlayer?.id ?? null;
    const myPlayer: PlayerState | null =
      myPlayerId !== null
        ? (gs.players.find((p) => p.id === myPlayerId) ?? null)
        : null;

    // ── Turn and bid derivation ────────────────────────────────────────────────
    const isMyTurn: boolean = !!myPlayerId && activePlayerId === myPlayerId;
    const isBidWinner: boolean = !!myPlayerId && gs.bidderId === myPlayerId;

    // mustSelectTrump: bid is won (bidderId is set), we are the winner, we're still
    // in BIDDING phase, and trump has not yet been set. Backend requires set_trump
    // to advance to PLAYING — this flag gates the trump selector UI.
    const mustSelectTrump: boolean =
      isBidWinner && gs.phase === 'BIDDING' && !gs.trumpSuit;

    const myHand: Card[] = myPlayer?.hand ?? [];
    const currentTrick: Card[] = gs.trick;

    // ── Trick summary ─────────────────────────────────────────────────────────
    const team1TricksWon = gs.teams[1].tricksWon;
    const team2TricksWon = gs.teams[2].tricksWon;
    const totalTricksPlayed = team1TricksWon + team2TricksWon;

    // Determine bid winner's team by finding the bidder in players[]
    const bidderPlayer = gs.bidderId
      ? (gs.players.find((p) => p.id === gs.bidderId) ?? null)
      : null;

    const trickSummary: TrickSummary = {
      team1TricksWon,
      team2TricksWon,
      totalTricksPlayed,
      tricksRemaining: 13 - totalTricksPlayed,
      bidValue: gs.highestBid ?? null,
      bidderTeamId: bidderPlayer?.teamId ?? null,
    };

    // ── Readiness flags ────────────────────────────────────────────────────────
    const phase: GamePhase = gs.phase;

    const readiness: GameReadinessFlags = {
      gameIsActive: phase === 'BIDDING' || phase === 'PLAYING',
      gameIsOver: phase === 'GAME_OVER',
      biddingIsComplete: !!gs.trumpSuit,   // set_trump accepted → trump present
      roundIsComplete: phase === 'SCORING',
    };

    return {
      myPlayer,
      myTeamId: myPlayer?.teamId ?? null,
      activePlayerId,
      isMyTurn,
      isBidWinner,
      mustSelectTrump,
      myHand,
      currentTrick,
      phase,
      gameOver,
      trickSummary,
      readiness,
    };
  }, [gameState, gameOver, myPlayerId]);
}