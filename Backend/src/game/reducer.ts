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

  // Clone shallow state (engine-level immutability)
  const next: GameState = structuredClone(state);

  switch (action.type) {
    // -------------------------------
    // BIDDING
    // -------------------------------
    case "START_BIDDING": {
      if (next.phase !== "DEALING") return state;
      next.phase = "BIDDING";
      next.currentPlayerIndex = 0;
      return next;
    }

    case "BID": {
      if (next.phase !== "BIDDING") return state;

      const player = next.players.find((p) => p.id === action.playerId);
      if (!player) return state;
      const teamScore = next.teams[player.teamId].score;

      if (!isBidValid(action.value, teamScore, next.highestBid)) return state;

      next.highestBid = action.value;
      next.bidderId = action.playerId;
      next.currentPlayerIndex = (next.currentPlayerIndex + 1) % 4;
      return next;
    }

    case "PASS": {
      if (next.phase !== "BIDDING") return state;
      next.currentPlayerIndex = (next.currentPlayerIndex + 1) % 4;
      return next;
    }

    case "SET_TRUMP": {
      if (next.phase !== "BIDDING") return state;
      if (!next.bidderId) return state;

      // Phase 13: Validate suit is valid
      if (!isValidSuit(action.suit)) return state;

      next.trumpSuit = action.suit;
      next.phase = "PLAYING";
      next.currentPlayerIndex = getPlayerIndex(next, next.bidderId);
      return next;
    }

    // -------------------------------
    // PLAYING
    // -------------------------------
    case "PLAY_CARD": {
      if (next.phase !== "PLAYING") return state;

      // Phase 13: Reject if trick already complete
      if (next.trick.length >= 4) return state;

      const player = next.players.find((p) => p.id === action.playerId);
      if (!player) return state;

      if (!canPlayCard(next, action.playerId, action.card)) return state;

      // Remove card from hand
      player.hand = player.hand.filter(
        (c) => !(c.suit === action.card.suit && c.rank === action.card.rank),
      );

      // ADD THESE LINES: Track who started the trick
      if (next.trick.length === 0) {
        next.trickStartPlayerIndex = next.currentPlayerIndex;
      }

      // Add to trick
      next.trick.push(action.card);

      // Advance turn
      next.currentPlayerIndex = (next.currentPlayerIndex + 1) % 4;

      return next;
    }

    case 'END_TRICK': {
      if (next.phase !== 'PLAYING') return state;
      if (next.trick.length !== 4) return state;

      const winnerId = resolveTrick(next);
      if (!winnerId) return state;

      next.trick = [];
      next.trickStartPlayerIndex = undefined; // ADD THIS LINE
      next.currentPlayerIndex = getPlayerIndex(next, winnerId);

      return next;
    }

    // -------------------------------
    // ROUND END
    // -------------------------------
    case "END_ROUND": {
      if (!next.bidderId || !next.highestBid) return state;

      calculateScore(next, next.highestBid, next.bidderId);

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
