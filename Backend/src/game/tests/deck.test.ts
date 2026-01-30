import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffleDeck } from '../deck.js';
import type { Card } from '../../types/game.types.js';

// Deterministic RNG helper for tests
function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length] ?? 0;
    i += 1;
    return value;
  };
}

describe('deck', () => {
  it('should create a deck of 52 unique cards with correct suits and ranks', () => {
    const deck = createDeck();
    assert.equal(deck.length, 52);

    // uniqueness check by suit+rank key
    const keys = new Set(deck.map(c => `${c.suit}:${c.rank}`));
    assert.equal(keys.size, 52);

    // spot-check first few cards are valid Card objects
    for (const card of deck.slice(0, 5)) {
      assert.ok(card.suit && card.rank);
    }
  });

  it('should not mutate the original deck when shuffling', () => {
    const original = createDeck();
    const originalCopy: Card[] = [...original.map(c => ({ ...c }))];

    const rng = makeRng([0.1, 0.9, 0.3, 0.7]);
    const shuffled = shuffleDeck(original, rng);

    // original deck remains unchanged
    assert.deepEqual(original, originalCopy);

    // shuffled is a different array instance
    assert.notEqual(shuffled, original);
  });

  it('should produce a permutation of the original deck when shuffling', () => {
    const original = createDeck();
    const rng = makeRng([0.42, 0.13, 0.99, 0.05, 0.77, 0.23]);
    const shuffled = shuffleDeck(original, rng);

    // Same multiset of cards
    const originalKeys = original.map(c => `${c.suit}:${c.rank}`).sort();
    const shuffledKeys = shuffled.map(c => `${c.suit}:${c.rank}`).sort();
    assert.deepEqual(shuffledKeys, originalKeys);
  });

  it('should use the provided RNG to drive the shuffle deterministically', () => {
    const deck = createDeck();

    const rngA = makeRng([0.1, 0.2, 0.3, 0.4]);
    const rngB = makeRng([0.1, 0.2, 0.3, 0.4]);
    const rngC = makeRng([0.9, 0.8, 0.7, 0.6]);

    const a = shuffleDeck(deck, rngA);
    const b = shuffleDeck(deck, rngB);
    const c = shuffleDeck(deck, rngC);

    assert.deepEqual(a, b, 'same RNG sequences should yield identical shuffles');
    assert.notDeepEqual(a, c, 'different RNG sequences should yield different shuffles');
  });

  it('should handle small decks (edge cases) with Fisher–Yates boundaries correctly', () => {
    const single: Card[] = [{ suit: 'SPADES', rank: 'A' }];
    const rng = makeRng([0.99]);

    const shuffledSingle = shuffleDeck(single, rng);
    assert.deepEqual(shuffledSingle, single);

    const two: Card[] = [
      { suit: 'SPADES', rank: 'A' },
      { suit: 'HEARTS', rank: 'K' },
    ];
    const rng2 = makeRng([0.0, 0.99]); // force j=0 then j=1
    const shuffledTwo = shuffleDeck(two, rng2);

    // Should still be a permutation of the original two cards
    const twoKeys = two.map(c => `${c.suit}:${c.rank}`).sort();
    const shuffledTwoKeys = shuffledTwo.map(c => `${c.suit}:${c.rank}`).sort();
    assert.deepEqual(shuffledTwoKeys, twoKeys);
  });
});
