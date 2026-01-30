import { Card, Suit, Rank } from "../types/game.types.js";
import { createDeck, shuffleDeck } from "./deck.js";

// Each player has an id, hand, and team assignment
export interface PlayerState {
  id: string;
  hand: Card[];
  teamId: 1 | 2;
}

// Tricks won by each team
export interface TeamState {
  tricksWon: number;
  score: number;
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
  trumpSuit?: Suit;
  currentPlayerIndex: number;
  trickStartPlayerIndex?: number; // ADD THIS LINE
  phase: GamePhase;
  trick: Card[];
  highestBid?: number;
  bidderId?: string;
}

export function createInitialGameState(playerIds: string[]): GameState {
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
  const players: PlayerState[] = playerIds.map((id, idx) => ({
    id,
    hand: hands[idx]!,
    teamId: idx % 2 === 0 ? 1 : 2
  }));

  return {
    players,
    teams: {
      1: { tricksWon: 0, score: 0 },
      2: { tricksWon: 0, score: 0 }
    },
    deck,                 // remaining deck if needed
    trumpSuit: undefined,
    currentPlayerIndex: 0, // will be set to bidder later
    phase: 'DEALING',
    trick: [],
    highestBid: undefined,
    bidderId: undefined
  };
}





