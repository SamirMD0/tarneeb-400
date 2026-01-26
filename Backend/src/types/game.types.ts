
export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export type Rank =
  | 'A' | 'K' | 'Q' | 'J'
  | '10' | '9' | '8' | '7'
  | '6' | '5' | '4' | '3' | '2';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type GamePhase =
  | 'DEALING'
  | 'BIDDING'
  | 'PLAYING'
  | 'SCORING'
  | 'GAME_OVER';

export interface PlayCardAction {
  type: 'PLAY_CARD';
  card: Card;
}
