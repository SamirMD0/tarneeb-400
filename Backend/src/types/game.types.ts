 // game.types.ts - Phase 2: Type System Foundation

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export type Rank =
  | 'A' | 'K' | 'Q' | 'J'
  | '10' | '9' | '8' | '7'
  | '6' | '5' | '4' | '3' | '2';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Use string literal union, not enum (better for JSON serialization)
export type GamePhase =
  | 'DEALING'
  | 'BIDDING'
  | 'PLAYING'
  | 'SCORING'
  | 'GAME_OVER';

// Action types - used by reducer in Phase 10-11
export type BidAction = {
  type: 'BID';
  playerId: string;
  value: number;
};

export type PassAction = {
  type: 'PASS';
  playerId: string;
};

export type TrumpAction = {
  type: 'SET_TRUMP';
  suit: Suit;
};

export type PlayCardAction = {
  type: 'PLAY_CARD';
  playerId: string;
  card: Card;
};
