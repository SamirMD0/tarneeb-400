import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction } from '../reducer.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../state.js';
import type { Card } from '../../types/game.types.js';

describe('Game Reducer', () => {
  function createTestState(): GameState {
    return createInitialGameState(['p1', 'p2', 'p3', 'p4']);
  }

  describe('Immutability', () => {
    it('should not mutate original state', () => {
      const original = createTestState();
      // Use structuredClone to preserve 'undefined' properties that JSON.stringify removes
      const originalCopy = structuredClone(original);

      applyAction(original, { type: 'START_BIDDING' });

      // Verify the original state object remains unchanged
      assert.deepEqual(original, originalCopy);
    });
  });

  describe('START_BIDDING', () => {
    it('should transition from DEALING to BIDDING', () => {
      const state = createTestState();
      const next = applyAction(state, { type: 'START_BIDDING' });

      assert.equal(next.phase, 'BIDDING');
      assert.equal(next.currentPlayerIndex, 0);
    });

    it('should not transition from other phases', () => {
      const state = createTestState();
      state.phase = 'PLAYING';

      const next = applyAction(state, { type: 'START_BIDDING' });

      assert.equal(next, state);
    });
  });

  describe('BID', () => {
    it('should accept valid bid and update state', () => {
      const state = createTestState();
      state.phase = 'BIDDING';

      const next = applyAction(state, {
        type: 'BID',
        playerId: 'p1',
        value: 7
      });

      assert.equal(next.highestBid, 7);
      assert.equal(next.bidderId, 'p1');
      assert.equal(next.currentPlayerIndex, 1);
    });

    it('should reject invalid bid', () => {
      const state = createTestState();
      state.phase = 'BIDDING';
      state.highestBid = 10;

      const next = applyAction(state, {
        type: 'BID',
        playerId: 'p1',
        value: 9 // Too low
      });

      assert.equal(next, state);
    });

    it('should reject bid from non-existent player', () => {
      const state = createTestState();
      state.phase = 'BIDDING';

      const next = applyAction(state, {
        type: 'BID',
        playerId: 'invalid',
        value: 7
      });

      assert.equal(next, state);
    });
  });

  describe('PASS', () => {
    it('should advance player index', () => {
      const state = createTestState();
      state.phase = 'BIDDING';

      const next = applyAction(state, {
        type: 'PASS',
        playerId: 'p1'
      });

      assert.equal(next.currentPlayerIndex, 1);
    });
  });

  describe('SET_TRUMP', () => {
    it('should set trump and transition to PLAYING', () => {
      const state = createTestState();
      state.phase = 'BIDDING';
      state.bidderId = 'p2';

      const next = applyAction(state, {
        type: 'SET_TRUMP',
        suit: 'SPADES'
      });

      assert.equal(next.trumpSuit, 'SPADES');
      assert.equal(next.phase, 'PLAYING');
      assert.equal(next.currentPlayerIndex, 1); // p2's index
    });

    it('should not set trump if no bidder', () => {
      const state = createTestState();
      state.phase = 'BIDDING';

      const next = applyAction(state, {
        type: 'SET_TRUMP',
        suit: 'SPADES'
      });

      assert.equal(next, state);
    });
  });

  describe('PLAY_CARD', () => {
    it('should play valid card and advance turn', () => {
      const state = createTestState();
      state.phase = 'PLAYING';
      state.trumpSuit = 'SPADES';

      const cardToPlay = state.players[0]?.hand[0];
      assert(cardToPlay !== undefined, 'Card should exist in hand');
      const initialHandSize = state.players[0]!.hand.length;

      const next = applyAction(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        card: cardToPlay
      });

      assert.equal(next.trick.length, 1);
      assert.equal(next.players[0]!.hand.length, initialHandSize - 1);
      assert.equal(next.currentPlayerIndex, 1);
      assert.equal(next.trickStartPlayerIndex, 0); // Track first player
    });

    it('should track trick start player', () => {
      const state = createTestState();
      state.phase = 'PLAYING';
      state.trumpSuit = 'SPADES';
      state.currentPlayerIndex = 2;

      const cardToPlay = state.players[2]!.hand[0]!;

      const next = applyAction(state, {
        type: 'PLAY_CARD',
        playerId: 'p3',
        card: cardToPlay
      });

      assert.equal(next.trickStartPlayerIndex, 2);
    });

    it('should reject playing card not owned', () => {
      const state = createTestState();
      state.phase = 'PLAYING';
      state.trumpSuit = 'SPADES';

      const cardNotOwned: Card = { suit: 'HEARTS', rank: 'A' };

      // Remove this card from player's hand if it exists
      if (state.players[0]) {
        state.players[0].hand = state.players[0].hand.filter(
          c => !(c.suit === 'HEARTS' && c.rank === 'A')
        );
      }

      const next = applyAction(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        card: cardNotOwned
      });

      assert.equal(next, state);
    });
  });

  describe('END_TRICK', () => {
    it('should resolve trick and advance to winner', () => {
      const state = createTestState();
      state.phase = 'PLAYING';
      state.trumpSuit = 'SPADES';
      state.trickStartPlayerIndex = 0;
      state.trick = [
        { suit: 'HEARTS', rank: 'K' },
        { suit: 'HEARTS', rank: 'A' }, // Winner
        { suit: 'HEARTS', rank: '5' },
        { suit: 'HEARTS', rank: '7' }
      ];

      const next = applyAction(state, { type: 'END_TRICK' });

      assert.equal(next.trick.length, 0);
      assert.equal(next.trickStartPlayerIndex, undefined);
      assert.equal(next.currentPlayerIndex, 1); // Winner (p2)
    });

    it('should not resolve if trick incomplete', () => {
      const state = createTestState();
      state.phase = 'PLAYING';
      state.trick = [
        { suit: 'HEARTS', rank: 'K' },
        { suit: 'HEARTS', rank: 'A' }
      ];

      const next = applyAction(state, { type: 'END_TRICK' });

      assert.equal(next, state);
    });
  });

  describe('END_ROUND', () => {
    it('should calculate scores and transition to SCORING', () => {
      const state = createTestState();
      state.phase = 'PLAYING';
      state.bidderId = 'p1';
      state.highestBid = 7;
      state.teams[1].tricksWon = 8;
      state.teams[2].tricksWon = 5;

      const initialScore1 = state.teams[1].score;
      const initialScore2 = state.teams[2].score;

      const next = applyAction(state, { type: 'END_ROUND' });

      assert.equal(next.phase, 'SCORING');
      assert.equal(next.teams[1].score, initialScore1 + 80);
      assert.equal(next.teams[2].score, initialScore2 + 50);
    });

    it('should not end round if no bidder', () => {
      const state = createTestState();
      state.phase = 'PLAYING';

      const next = applyAction(state, { type: 'END_ROUND' });

      assert.equal(next, state);
    });
  });

  describe('RESET_GAME', () => {
    it('should create new game with same players', () => {
      const state = createTestState();
      state.phase = 'SCORING';
      state.teams[1].score = 100;
      state.teams[2].score = 80;

      const next = applyAction(state, { type: 'RESET_GAME' });

      assert.equal(next.phase, 'DEALING');
      assert.equal(next.teams[1].score, 0);
      assert.equal(next.teams[2].score, 0);
      assert.deepEqual(
        next.players.map(p => p.id),
        ['p1', 'p2', 'p3', 'p4']
      );
    });
  });

  describe('Full Game Flow', () => {
    it('should complete a full bidding to playing sequence', () => {
      let state = createTestState();

      // Start bidding
      state = applyAction(state, { type: 'START_BIDDING' });
      assert.equal(state.phase, 'BIDDING');

      // Place bid
      state = applyAction(state, {
        type: 'BID',
        playerId: 'p1',
        value: 7
      });

      // Set trump
      state = applyAction(state, {
        type: 'SET_TRUMP',
        suit: 'SPADES'
      });
      assert.equal(state.phase, 'PLAYING');

      // Play a card
      assert(state.players[0] !== undefined, 'Player should exist');
      const card = state.players[0].hand[0]!;
      state = applyAction(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        card
      });

      assert.equal(state.trick.length, 1);
      assert.equal(state.currentPlayerIndex, 1);
    });
  });
});