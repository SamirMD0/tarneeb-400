import { Card, Suit, Rank } from "../types/game.types.js";
import { createDeck, shuffleDeck } from "./deck.js";

// Each player has an id, hand, and team assignment
export interface PlayerState {
  id: string;
  hand: Card[];
  teamId: 1 | 2;
  score: number;
}

// Tricks won by each team
export interface TeamState {
  tricksWon: number;
}

// Phase of the game
export type GamePhase =
  | 'DEALING'
  | 'BIDDING'
  | 'PLAYING'
  | 'SCORING'
  | 'GAME_OVER';

export interface GameState {
  players: PlayerState[];
  teams: Record<1 | 2, TeamState>;
  deck: Card[];
  trumpSuit: 'HEARTS';
  dealerIndex: number;
  currentPlayerIndex: number;
  trickStartPlayerIndex?: number; // ADD THIS LINE
  phase: GamePhase;
  trick: Card[];
  playerBids: Record<string, number>;
  highestBid: number;
  highestBidderId: string | null;
}

export function createInitialGameState(playerIds: string[], initialDealerIndex = 0): GameState {
  if (playerIds.length !== 4) {
    throw new Error("Tarneeb requires exactly 4 players");
  }

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck(), Math.random);

  // Deal 13 cards per player
  const hands: Card[][] = [];
  for (let i = 0; i < 4; i++) {
    hands.push(deck.slice(i * 13, (i + 1) * 13));
  }

  // Assign players to teams: 1 vs 2
  // players[] is ordered counterclockwise
  const players: PlayerState[] = playerIds.map((id, idx) => ({
    id,
    hand: hands[idx]!,
    teamId: idx % 2 === 0 ? 1 : 2,
    score: 0
  }));

  return {
    players,
    teams: {
      1: { tricksWon: 0 },
      2: { tricksWon: 0 }
    },
    deck,                 // remaining deck if needed
    trumpSuit: 'HEARTS',
    dealerIndex: initialDealerIndex,
    currentPlayerIndex: (initialDealerIndex + 1) % 4, // right of dealer plays first
    phase: 'DEALING',
    trick: [],
    playerBids: {},
    highestBid: 0,
    highestBidderId: null
  };
}





