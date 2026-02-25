// Frontend/types/game.types.ts
// Mirrors: Backend/src/types/game.types.ts + Backend/src/game/state.ts
// DO NOT add fields that don't exist in the backend — GameState is server-authoritative.

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

// Mirrors Backend/src/game/state.ts → PlayerState
export interface PlayerState {
  id: string;   // socket.id — use this to identify the local player
  hand: Card[];
  teamId: 1 | 2;
}

// Mirrors Backend/src/game/state.ts → TeamState
export interface TeamState {
  tricksWon: number;
  score: number;
}

// Mirrors Backend/src/game/state.ts → GameState (the full snapshot broadcast on every update)
export interface GameState {
  players: PlayerState[];
  teams: Record<1 | 2, TeamState>;
  trumpSuit?: Suit;
  currentPlayerIndex: number;      // Index into players[] — who acts next
  trickStartPlayerIndex?: number;
  phase: GamePhase;
  trick: Card[];                   // Cards played in current trick, 0–4 items
  highestBid?: number;
  bidderId?: string;               // stable playerId of the player who won the bid
}

// ─── Derived view (computed in useGameState, consumed by components) ──────────
// Components must NEVER derive these themselves — always read from the hook.

export interface DerivedGameView {
  myPlayer: PlayerState | null;
  myTeamId: 1 | 2 | null;
  activePlayerId: string | null;   // players[currentPlayerIndex].id
  isMyTurn: boolean;               // activePlayerId === myPlayerId
  isBidWinner: boolean;            // bidderId === myPlayerId
  mustSelectTrump: boolean;        // isBidWinner && phase === 'BIDDING' && !trumpSuit
  myHand: Card[];
  currentTrick: Card[];
  phase: GamePhase | null;
  gameOver: { winner: 1 | 2; finalScore: { team1: number; team2: number } } | null;
}