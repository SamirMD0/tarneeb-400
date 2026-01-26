// game/reducer.ts

import { GameState } from "./state.js";
import { GameAction } from "./actions.js";
import {
  canPlayCard,
  resolveTrick,
  isBidValid,
  calculateScore,
  getPlayerIndex
} from "./rules.js";

export function applyAction(state: GameState, action: GameAction): GameState {
  // Clone shallow state (engine-level immutability)
  const next: GameState = structuredClone(state);

  switch (action.type) {

    // -------------------------------
    // BIDDING
    // -------------------------------
    case 'START_BIDDING': {
      if (next.phase !== 'DEALING') return state;
      next.phase = 'BIDDING';
      next.currentPlayerIndex = 0;
      return next;
    }

    case 'BID': {
      if (next.phase !== 'BIDDING') return state;
      if (!isBidValid(action.value, next.highestBid)) return state;

      next.highestBid = action.value;
      next.bidderId = action.playerId;
      next.currentPlayerIndex = (next.currentPlayerIndex + 1) % 4;
      return next;
    }

    case 'PASS': {
      if (next.phase !== 'BIDDING') return state;
      next.currentPlayerIndex = (next.currentPlayerIndex + 1) % 4;
      return next;
    }

    case 'SET_TRUMP': {
      if (next.phase !== 'BIDDING') return state;
      if (!next.bidderId) return state;

      next.trumpSuit = action.suit;
      next.phase = 'PLAYING';
      next.currentPlayerIndex = getPlayerIndex(next, next.bidderId);
      return next;
    }

    // -------------------------------
    // PLAYING
    // -------------------------------
    case 'PLAY_CARD': {
      if (next.phase !== 'PLAYING') return state;

      const player = next.players.find(p => p.id === action.playerId);
      if (!player) return state;

      if (!canPlayCard(next, action.playerId, action.card)) return state;

      // Remove card from hand
      player.hand = player.hand.filter(
        c => !(c.suit === action.card.suit && c.rank === action.card.rank)
      );

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
      next.currentPlayerIndex = getPlayerIndex(next, winnerId);

      return next;
    }

    // -------------------------------
    // ROUND END
    // -------------------------------
    case 'END_ROUND': {
      if (!next.bidderId || !next.highestBid) return state;

      calculateScore(next, next.highestBid, next.bidderId);

      next.phase = 'SCORING';
      return next;
    }

    default:
      return state;
  }
}
