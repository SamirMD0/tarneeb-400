// game/reducer.ts

import { createInitialGameState, GameState } from "./state.js";
import { GameAction } from "./actions.js";
import {
  canPlayCard,
  resolveTrick,
  isBidValid,
  getBidPoints,
  getPlayerIndex,
  getMinTotalBids,
  getNextPlayerIndex
} from "./rules.js";
import { createDeck, shuffleDeck } from "./deck.js";
// Phase 19: Zod validation
import { GameActionSchema } from "../middlewares/validator.js";

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
      // Right of dealer plays first
      return { 
        ...state, 
        phase: "BIDDING" as const, 
        currentPlayerIndex: getNextPlayerIndex(state.dealerIndex) 
      };
    }

    case "BID":
    case "PASS": {
      if (state.phase !== "BIDDING") return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id !== action.playerId) return state;

      let bidValue = 0;
      if (action.type === "BID") {
         if (!isBidValid(action.value, currentPlayer.score)) return state;
         bidValue = action.value;
      }

      const nextPlayerBids = { ...state.playerBids, [action.playerId]: bidValue };
      const bidsCount = Object.keys(nextPlayerBids).length;

      if (bidsCount === 4) {
          const totalBids = Object.values(nextPlayerBids).reduce((a, b) => a + b, 0);
          const highestPlayerScore = Math.max(...state.players.map(p => p.score));

          if (totalBids < getMinTotalBids(highestPlayerScore)) {
              // REDEAL
              const newDeck = shuffleDeck(createDeck(), Math.random);
              const newPlayers = state.players.map((p, i) => ({
                  ...p,
                  hand: newDeck.slice(i * 13, (i + 1) * 13)
              }));
              return {
                  ...state,
                  players: newPlayers,
                  deck: newDeck,
                  currentPlayerIndex: getNextPlayerIndex(state.dealerIndex),
                  playerBids: {},
                  trick: [],
                  trickStartPlayerIndex: undefined,
              };
          } else {
              // START PLAYING
              return {
                  ...state,
                  playerBids: nextPlayerBids,
                  phase: "PLAYING" as const,
                  currentPlayerIndex: getNextPlayerIndex(state.dealerIndex),
              };
          }
      }

      return {
        ...state,
        playerBids: nextPlayerBids,
        currentPlayerIndex: getNextPlayerIndex(state.currentPlayerIndex),
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

      // Enforce turn order
      if (playerIdx !== state.currentPlayerIndex) return state;

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
        currentPlayerIndex: getNextPlayerIndex(state.currentPlayerIndex),
      };
    }

    case 'END_TRICK': {
      if (state.phase !== 'PLAYING') return state;
      if (state.trick.length !== 4) return state;

      const resolution = resolveTrick(state);
      if (!resolution) return state;

      return {
        ...state,
        trick: [],
        trickStartPlayerIndex: undefined,
        currentPlayerIndex: getPlayerIndex(state, resolution.winnerId),
        teams: {
          ...state.teams,
          [resolution.winnerTeamId]: {
            ...state.teams[resolution.winnerTeamId],
            tricksWon: state.teams[resolution.winnerTeamId].tricksWon + 1
          }
        }
      };
    }

    // -------------------------------
    // ROUND END
    // -------------------------------
    case "END_ROUND": {
      if (state.phase !== 'PLAYING') return state;

      let isGameOver = false;

      const newPlayers = state.players.map(player => {
        const bid = state.playerBids[player.id] ?? 0;
        const tricksWon = state.teams[player.teamId].tricksWon;

        if (bid === 0) return player; // Pass -> no score change

        const madeBid = tricksWon >= bid;
        const points = getBidPoints(bid, player.score);
        const delta = madeBid ? points : -points;

        return {
          ...player,
          score: player.score + delta
        };
      });

      // Win condition
      for (const teamId of [1, 2] as const) {
        const teamPlayers = newPlayers.filter(p => p.teamId === teamId);
        const hasWinner = teamPlayers.some(p => p.score >= 41);
        const allPositive = teamPlayers.every(p => p.score > 0);
        if (hasWinner && allPositive) {
            isGameOver = true;
        }
      }

      return {
        ...state,
        players: newPlayers,
        phase: isGameOver ? 'GAME_OVER' as const : 'SCORING' as const,
      };
    }

    case 'START_NEXT_ROUND': {
      if (state.phase !== 'SCORING') return state;
      
      const newDealerIndex = getNextPlayerIndex(state.dealerIndex);
      const nextInitial = createInitialGameState(state.players.map(p => p.id), newDealerIndex);
      
      const preservedPlayers = nextInitial.players.map(p => {
        const oldPlayer = state.players.find(oldP => oldP.id === p.id);
        return {
          ...p,
          score: oldPlayer ? oldPlayer.score : 0
        };
      });
      return {
        ...nextInitial,
        players: preservedPlayers,
        teams: {
          1: { tricksWon: 0 },
          2: { tricksWon: 0 }
        }
      };
    }

    case 'RESET_GAME': {
      const playerIds = state.players.map(p => p.id);
      return createInitialGameState(playerIds);
    }

    default:
      return state;
  }
}
