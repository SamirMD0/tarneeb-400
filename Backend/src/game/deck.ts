import {Suit, Rank, Card } from "../types/game.types.js" ;

const suits: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
const ranks: Rank[] = [
  'A', 'K', 'Q', 'J',
  '10', '9', '8', '7',
  '6', '5', '4', '3', '2'
];

export function createDeck(): Card[] {
  const deck: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({suit, rank});
      }
    }
    return deck;
}

export function shuffleDeck(deck: Card[], rng: () => number): Card[] {
  const copy = [...deck];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i]!, copy[j]!] = [copy[j]!, copy[i]!];
  }

  return copy;
}

