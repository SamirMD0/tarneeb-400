// game/reducer.ts

import { createInitialGameState, GameState } from "./state.js";
import { GameAction } from "./actions.js";
import {
  canPlayCard,
  resolveTrick,
  isBidValid,
  calculateScore,
  getPlayerIndex,
} from "./rules.js";
import type { Suit } from "../types/game.types.js";
// Phase 19: Zod validation
import { GameActionSchema } from "../middlewares/validator.js";

// Phase 13: Valid suit validation helper
const VALID_SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
function isValidSuit(suit: unknown): suit is Suit {
  return typeof suit === 'string' && VALID_SUITS.includes(suit as Suit);
}

export function applyAction(state: GameState, action: GameAction): GameState {
  // Phase 19: Validate action with Zod before processing
  const validation = GameActionSchema.safeParse(action);
  if (!validation.success) {
    console.error('[Reducer] Invalid action rejected:', validation.error.issues);
    return state; // Reject invalid action, return unchanged state
  }

  switch (action.type) {
    // -------------------------------
    // BIDDING
    // -------------------------------
    case "START_BIDDING": {
      if (state.phase !== "DEALING") return state;
      // Only primitives change — shallow spread is sufficient
      return { ...state, phase: "BIDDING" as const, currentPlayerIndex: 0 };
    }

    case "BID": {
      if (state.phase !== "BIDDING") return state;

      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return state;
      const teamScore = state.teams[player.teamId].score;

      if (!isBidValid(action.value, teamScore, state.highestBid)) return state;

      // Only primitives change — no array/object mutations needed
      return {
        ...state,
        highestBid: action.value,
        bidderId: action.playerId,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % 4,
      };
    }

    case "PASS": {
      if (state.phase !== "BIDDING") return state;
      return { ...state, currentPlayerIndex: (state.currentPlayerIndex + 1) % 4 };
    }

    case "SET_TRUMP": {
      if (state.phase !== "BIDDING") return state;
      if (!state.bidderId) return state;

      // Phase 13: Validate suit is valid
      if (!isValidSuit(action.suit)) return state;

      return {
        ...state,
        trumpSuit: action.suit,
        phase: "PLAYING" as const,
        currentPlayerIndex: getPlayerIndex(state, state.bidderId),
      };
    }

    // -------------------------------
    // PLAYING
    // -------------------------------
    case "PLAY_CARD": {
      if (state.phase !== "PLAYING") return state;

      // Phase 13: Reject if trick already complete
      if (state.trick.length >= 4) return state;

      const playerIdx = state.players.findIndex((p) => p.id === action.playerId);
      if (playerIdx === -1) return state;

      if (!canPlayCard(state, action.playerId, action.card)) return state;

      // Clone only the players array, and only the affected player's hand
      const newPlayers = state.players.map((p, i) => {
        if (i !== playerIdx) return p; // share reference for untouched players
        return {
          ...p,
          hand: p.hand.filter(
            (c) => !(c.suit === action.card.suit && c.rank === action.card.rank),
          ),
        };
      });

      // Clone trick array and append
      const newTrick = [...state.trick, action.card];

      return {
        ...state,
        players: newPlayers,
        trick: newTrick,
        // Track who started the trick
        trickStartPlayerIndex:
          state.trick.length === 0
            ? state.currentPlayerIndex
            : state.trickStartPlayerIndex,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % 4,
      };
    }

    case 'END_TRICK': {
      if (state.phase !== 'PLAYING') return state;
      if (state.trick.length !== 4) return state;

      const winnerId = resolveTrick(state);
      if (!winnerId) return state;

      return {
        ...state,
        trick: [],
        trickStartPlayerIndex: undefined,
        currentPlayerIndex: getPlayerIndex(state, winnerId),
      };
    }

    // -------------------------------
    // ROUND END
    // -------------------------------
    case "END_ROUND": {
      if (!state.bidderId || !state.highestBid) return state;

      // calculateScore mutates the state it receives, so clone the
      // teams objects and players array before passing them in.
      const next: GameState = {
        ...state,
        teams: {
          1: { ...state.teams[1] },
          2: { ...state.teams[2] },
        },
        players: state.players.map((p) => ({ ...p })),
      };

      calculateScore(next, next.highestBid!, next.bidderId!);

      next.phase = "SCORING";
      return next;
    }

    case 'RESET_GAME': {
      const playerIds = state.players.map(p => p.id);
      return createInitialGameState(playerIds);
    }

    default:
      return state;
  }
}
