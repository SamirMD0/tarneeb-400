import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from '../state.js';

describe('Game State Initialization', () => {
  it('should create game state with exactly 4 players', () => {
    const playerIds = ['p1', 'p2', 'p3', 'p4'];
    const state = createInitialGameState(playerIds);

    assert.equal(state.players.length, 4);
    assert.deepEqual(
      state.players.map(p => p.id),
      playerIds
    );
  });

  it('should throw error if not exactly 4 players', () => {
    assert.throws(
      () => createInitialGameState(['p1', 'p2', 'p3']),
      /exactly 4 players/i
    );

    assert.throws(
      () => createInitialGameState(['p1', 'p2', 'p3', 'p4', 'p5']),
      /exactly 4 players/i
    );
  });

  it('should assign teams correctly (alternating pattern)', () => {
    const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);

    assert.ok(state.players[0]);
    assert.ok(state.players[1]);
    assert.ok(state.players[2]);
    assert.ok(state.players[3]);
    assert.equal(state.players[0].teamId, 1);
    assert.equal(state.players[1].teamId, 2);
    assert.equal(state.players[2].teamId, 1);
    assert.equal(state.players[3].teamId, 2);
  });

  it('should deal 13 cards to each player', () => {
    const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);

    for (const player of state.players) {
      assert.equal(player.hand.length, 13);
    }
  });

  it('should ensure all cards are unique across all hands', () => {
    const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);

    const allCards = state.players.flatMap(p => p.hand);
    const cardKeys = allCards.map(c => `${c.suit}:${c.rank}`);
    const uniqueKeys = new Set(cardKeys);

    assert.equal(uniqueKeys.size, 52);
  });

  it('should initialize phase to DEALING', () => {
    const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
    assert.equal(state.phase, 'DEALING');
  });

  it('should initialize team scores to 0', () => {
    const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);

    assert.equal(state.teams[1].score, 0);
    assert.equal(state.teams[2].score, 0);
    assert.equal(state.teams[1].tricksWon, 0);
    assert.equal(state.teams[2].tricksWon, 0);
  });

  it('should initialize with empty trick and no trump', () => {
    const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);

    assert.equal(state.trick.length, 0);
    assert.equal(state.trumpSuit, undefined);
    assert.equal(state.highestBid, undefined);
    assert.equal(state.bidderId, undefined);
  });

  it('should shuffle the deck (non-deterministic test)', () => {
    const state1 = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
    const state2 = createInitialGameState(['p1', 'p2', 'p3', 'p4']);

    // Hands should differ (with very high probability)
    const hand1 = state1.players[0]!.hand;
    const hand2 = state2.players[0]!.hand;

    const sameCards = hand1.every((card, i) =>
      card.suit === hand2[i]?.suit && card.rank === hand2[i]?.rank
    );

    // Probability of same shuffle: 1/(52!) ≈ 0
    assert.equal(sameCards, false);
  });
});