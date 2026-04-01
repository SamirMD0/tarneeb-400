import { GameState } from "./state.js";
import { Card, Suit, Rank } from "../types/game.types.js";

/* =========================================================
   CARD RANK ORDER (Tarneeb)
   Higher index = weaker card
   ========================================================= */
const rankOrder: Rank[] = [
  "A", "K", "Q", "J",
  "10", "9", "8", "7",
  "6", "5", "4", "3", "2"
];

/* =========================================================
   CARD COMPARISON
   Determines which card wins inside a trick
   Return value:
     > 0 → cardA wins
     < 0 → cardB wins
     = 0 → equal / irrelevant
   ========================================================= */
export function compareCards(
  cardA: Card,
  cardB: Card,
  leadSuit: Suit
): number {
  const TRUMP = 'HEARTS';
  // Trump always beats non-trump
  if (cardA.suit === TRUMP && cardB.suit !== TRUMP) return 1;
  if (cardB.suit === TRUMP && cardA.suit !== TRUMP) return -1;

  // If no trump involved, lead suit wins
  if (cardA.suit === leadSuit && cardB.suit !== leadSuit) return 1;
  if (cardB.suit === leadSuit && cardA.suit !== leadSuit) return -1;

  // Same suit → compare rank (FIXED: higher rank must win)
  if (cardA.suit === cardB.suit) {
    return Math.sign(
      rankOrder.indexOf(cardB.rank) -
      rankOrder.indexOf(cardA.rank)
    );
  }

  // Neither trump nor lead → neither can win
  return 0;
}

/* =========================================================
   CARD PLAY VALIDATION
   Enforces ownership + follow-suit rule
   ========================================================= */
export function canPlayCard(
  state: GameState,
  playerId: string,
  card: Card
): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;

  // Player must own the card
  const ownsCard = player.hand.some(
    c => c.suit === card.suit && c.rank === card.rank
  );
  if (!ownsCard) return false;

  // If trick already started → must follow suit if possible
  if (state.trick.length > 0) {
    const leadSuit = state.trick[0]?.suit;
    if (!leadSuit) return false;
    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
    if (hasLeadSuit && card.suit !== leadSuit) return false;
  }

  return true;
}

/* =========================================================
   TRICK RESOLUTION
   Determines winner + updates team tricks
   ASSUMPTION:
     - trick[0] was played by currentPlayerIndex
   ========================================================= */
export function resolveTrick(state: GameState): { winnerId: string; winnerTeamId: 1 | 2 } | undefined {
  if (state.trick.length !== 4) return undefined;

  // ADD THIS CHECK
  if (state.trickStartPlayerIndex === undefined) return undefined;

  const leadSuit = state.trick[0]?.suit;
  if (!leadSuit) return undefined;

  let winningIndex = 0;

  for (let i = 1; i < state.trick.length; i++) {
    const cmp = compareCards(
      state.trick[i] as Card,
      state.trick[winningIndex] as Card,
      leadSuit
    );
    if (cmp > 0) winningIndex = i;
  }

  // FIX: Use trickStartPlayerIndex instead of currentPlayerIndex
  const winner =
    state.players[(state.trickStartPlayerIndex + winningIndex) % 4];
  if (!winner) return undefined;

  return { winnerId: winner.id, winnerTeamId: winner.teamId };
}

/* =========================================================
   BIDDING RULES
   ========================================================= */

/* Minimum bid allowed per player based on THEIR score */
export function getMinIndividualBid(playerScore: number): number {
  if (playerScore >= 50) return 5;
  if (playerScore >= 40) return 4;
  if (playerScore >= 30) return 3;
  return 2;
}

/* Minimum total bids required based on HIGHEST individual player score */
export function getMinTotalBids(
  highestPlayerScore: number
): number {
  if (highestPlayerScore >= 50) return 14;
  if (highestPlayerScore >= 40) return 13;
  if (highestPlayerScore >= 30) return 12;
  return 11;
}

/* Validate a single bid (called during bidding turn) */
export function isBidValid(
  bid: number,
  playerScore: number
): boolean {
  const minBid = getMinIndividualBid(playerScore);

  if (bid < minBid || bid > 13) return false;

  return true;
}

/* Validate entire bidding round (called AFTER all players bid)
   If false → reDeal cards */
export function isBiddingRoundValid(
  bids: number[],
  highestPlayerScore: number
): boolean {
  const totalBids = bids.reduce((sum, b) => sum + b, 0);
  const minTotal = getMinTotalBids(highestPlayerScore);

  return totalBids >= minTotal;
}

/* =========================================================
   ROUND SCORING
   ========================================================= */
export function getBidPoints(bid: number, score: number): number {
  if (bid < 2 || bid > 13) return 0;

  const below30: Record<number, number> = {
    2:2, 3:3, 4:4, 5:10, 6:12, 7:14, 8:16, 9:27,
    10:40, 11:40, 12:40, 13:40
  };

  const above30: Record<number, number> = {
    2:2, 3:3, 4:4, 5:5, 6:6, 7:14, 8:16, 9:27,
    10:40, 11:40, 12:40, 13:40
  };

  return (score >= 30 ? above30 : below30)[bid] || 0;
}

/* =========================================================
   UTILITIES
   ========================================================= */
export function getPlayerIndex(
  state: GameState,
  playerId: string
): number {
  return state.players.findIndex(p => p.id === playerId);
}

export function getNextPlayerIndex(index: number): number {
  // players[] is ordered counterclockwise
  // so +1 advances turn correctly
  return (index + 1) % 4;
}
