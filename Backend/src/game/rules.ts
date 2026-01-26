import {  GameState, GamePhase, PlayerState } from "./state.js";
import { Card } from "../types/game.types.js";
import { Suit, Rank } from "../types/game.types.js";

// -------------------------------
// Card rank order for Tarneeb
// -------------------------------
const rankOrder: Rank[] = [
  'A', 'K', 'Q', 'J',
  '10', '9', '8', '7',
  '6', '5', '4', '3', '2'
];

// Compare two cards given trump suit and lead suit
export function compareCards(
  cardA: Card,
  cardB: Card,
  trumpSuit: Suit,
  leadSuit: Suit
): number {
  // Trump beats non-trump
  if (cardA.suit === trumpSuit && cardB.suit !== trumpSuit) return 1;
  if (cardB.suit === trumpSuit && cardA.suit !== trumpSuit) return -1;

  // Follow lead suit
  if (cardA.suit === leadSuit && cardB.suit !== leadSuit) return 1;
  if (cardB.suit === leadSuit && cardA.suit !== leadSuit) return -1;

  // Same suit, compare rank
  if (cardA.suit === cardB.suit) {
    return rankOrder.indexOf(cardA.rank) - rankOrder.indexOf(cardB.rank);
  }

  // Neither lead nor trump -> tie (treated as lower)
  return 0;
}

// -------------------------------
// Validate if player can play a card
// -------------------------------
export function canPlayCard(state: GameState, playerId: string, card: Card): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;

  // Must own the card
  if (!player.hand.some(c => c.suit === card.suit && c.rank === card.rank)) return false;

  // Must follow suit if possible
  if (state.trick.length > 0) {
    const leadCard = state.trick[0];
    if (!leadCard) return false;
    const leadSuit = leadCard.suit;
    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
    if (hasLeadSuit && card.suit !== leadSuit) return false;
  }

  return true;
}

// -------------------------------
// Resolve who wins a trick
// -------------------------------
export function resolveTrick(state: GameState): string | undefined {
  if (state.trick.length !== 4 || !state.trumpSuit) return undefined;

  const leadCard = state.trick[0];
  if (!leadCard) return undefined;
  const leadSuit = leadCard.suit;
  let winningIndex = 0;

  for (let i = 1; i < state.trick.length; i++) {
    const currentCard = state.trick[i];
    const winningCard = state.trick[winningIndex];
    if (!currentCard || !winningCard) continue;
    const cmp = compareCards(currentCard, winningCard, state.trumpSuit, leadSuit);
    if (cmp > 0) winningIndex = i;
  }

  // Determine winner playerId
  const winnerPlayer = state.players[(state.currentPlayerIndex + winningIndex) % 4];
  if (!winnerPlayer) return undefined;
  const winnerId = winnerPlayer.id;
  if (!winnerId) return undefined;
  

  // Update team tricks
  const teamId = state.players.find(p => p.id === winnerId)?.teamId;
  if (teamId) state.teams[teamId].tricksWon += 1;

  return winnerId;
}

// -------------------------------
// Check if bid is valid
// -------------------------------
export function isBidValid(bid: number, highestBid?: number): boolean {
  if (bid < 7 || bid > 13) return false;
  if (highestBid && bid <= highestBid) return false;
  return true;
}

// -------------------------------
// Calculate round score
// -------------------------------
export function calculateScore(state: GameState, contractBid: number, bidderId: string): void {
  const bidderTeamId = state.players.find(p => p.id === bidderId)?.teamId;
  if (!bidderTeamId) return;

  const bidderTricks = state.teams[bidderTeamId].tricksWon;
  const defendingTeamId = bidderTeamId === 1 ? 2 : 1;

  if (bidderTricks >= contractBid) {
    // Contract made
    state.teams[bidderTeamId].score += bidderTricks * 10;
  } else {
    // Contract failed
    state.teams[bidderTeamId].score -= contractBid * 10;
  }

  // Defending team always scores tricks
  const defendingTricks = state.teams[defendingTeamId].tricksWon;
  state.teams[defendingTeamId].score += defendingTricks * 10;
}

// -------------------------------
// Utility: find player index
// -------------------------------
export function getPlayerIndex(state: GameState, playerId: string): number {
  return state.players.findIndex(p => p.id === playerId);
}
