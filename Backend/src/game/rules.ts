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
  trumpSuit: Suit,
  leadSuit: Suit
): number {
  // Trump always beats non-trump
  if (cardA.suit === trumpSuit && cardB.suit !== trumpSuit) return 1;
  if (cardB.suit === trumpSuit && cardA.suit !== trumpSuit) return -1;

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
export function resolveTrick(state: GameState): string | undefined {
  if (state.trick.length !== 4 || !state.trumpSuit) return undefined;

  // ADD THIS CHECK
  if (state.trickStartPlayerIndex === undefined) return undefined;

  const leadSuit = state.trick[0]?.suit;
  if (!leadSuit) return undefined;

  let winningIndex = 0;

  for (let i = 1; i < state.trick.length; i++) {
    const cmp = compareCards(
      state.trick[i] as Card,
      state.trick[winningIndex] as Card,
      state.trumpSuit,
      leadSuit
    );
    if (cmp > 0) winningIndex = i;
  }

  // FIX: Use trickStartPlayerIndex instead of currentPlayerIndex
  const winner =
    state.players[(state.trickStartPlayerIndex + winningIndex) % 4];
  if (!winner) return undefined;

  // Update team tricks
  state.teams[winner.teamId].tricksWon += 1;

  return winner.id;
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

/* Minimum total bids required based on HIGHEST team score */
export function getMinTotalBids(
  team1Score: number,
  team2Score: number
): number {
  const highest = Math.max(team1Score, team2Score);

  if (highest >= 50) return 14;
  if (highest >= 40) return 13;
  if (highest >= 30) return 12;
  return 11;
}

/* Validate a single bid (called during bidding turn) */
export function isBidValid(
  bid: number,
  playerScore: number,
  highestBid?: number
): boolean {
  const minBid = getMinIndividualBid(playerScore);

  if (bid < minBid || bid > 13) return false;
  if (highestBid !== undefined && bid <= highestBid) return false;

  return true;
}

/* Validate entire bidding round (called AFTER all players bid)
   If false → reDeal cards */
export function isBiddingRoundValid(
  bids: number[],
  team1Score: number,
  team2Score: number
): boolean {
  const totalBids = bids.reduce((sum, b) => sum + b, 0);
  const minTotal = getMinTotalBids(team1Score, team2Score);

  return totalBids >= minTotal;
}

/* =========================================================
   ROUND SCORING
   ========================================================= */
export function calculateScoreDeltas(
  contractBid: number,
  bidderId: string,
  tricksWon: { 1: number; 2: number },
  players: { id: string; teamId: 1 | 2 }[]
): { team1: number; team2: number } | undefined {
  const bidder = players.find(p => p.id === bidderId);
  if (!bidder) return undefined;

  const bidderTeamId = bidder.teamId;
  const defenderTeamId = bidderTeamId === 1 ? 2 : 1;

  const bidderTricks = tricksWon[bidderTeamId];
  const defenderTricks = tricksWon[defenderTeamId];

  let bidderScoreDelta = 0;

  // Bidder team scoring
  if (bidderTricks >= contractBid) {
    bidderScoreDelta = bidderTricks * 10;
  } else {
    bidderScoreDelta = -(contractBid * 10);
  }

  // Defending team always scores their tricks
  const defenderScoreDelta = defenderTricks * 10;

  return {
    team1: bidderTeamId === 1 ? bidderScoreDelta : defenderScoreDelta,
    team2: bidderTeamId === 2 ? bidderScoreDelta : defenderScoreDelta
  };
}

export function calculateScore(
  state: GameState,
  contractBid: number,
  bidderId: string
): void {
  const tricksWon = {
    1: state.teams[1].tricksWon,
    2: state.teams[2].tricksWon
  };

  const deltas = calculateScoreDeltas(
    contractBid,
    bidderId,
    tricksWon,
    state.players as { id: string; teamId: 1 | 2 }[]
  );

  if (deltas) {
    state.teams[1].score += deltas.team1;
    state.teams[2].score += deltas.team2;
  }
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
