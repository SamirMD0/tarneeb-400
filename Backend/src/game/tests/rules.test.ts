import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareCards,
  canPlayCard,
  resolveTrick,
  isBidValid,
  getMinIndividualBid,
  getMinTotalBids,
  isBiddingRoundValid,
  calculateScoreDeltas,
  getPlayerIndex
} from '../rules.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../state.js';
import type { Card, Suit } from '../../types/game.types.js';

describe('rules', () => {
  // =================================================================
  // CARD COMPARISON TESTS
  // =================================================================
  describe('compareCards', () => {
    const trumpSuit: Suit = 'SPADES';
    const leadSuit: Suit = 'HEARTS';

    describe('Trump vs Non-Trump', () => {
      it('should trump card beat non-trump card', () => {
        const trump: Card = { suit: 'SPADES', rank: '2' }; // Weakest trump
        const nonTrump: Card = { suit: 'HEARTS', rank: 'A' }; // Strongest non-trump

        assert.equal(compareCards(trump, nonTrump, trumpSuit, leadSuit), 1);
        assert.equal(compareCards(nonTrump, trump, trumpSuit, leadSuit), -1);
      });

      it('should handle multiple trump comparisons', () => {
        const highTrump: Card = { suit: 'SPADES', rank: 'A' };
        const lowTrump: Card = { suit: 'SPADES', rank: '2' };

        assert.equal(compareCards(highTrump, lowTrump, trumpSuit, leadSuit), 1);
        assert.equal(compareCards(lowTrump, highTrump, trumpSuit, leadSuit), -1);
      });

      it('should trump beat lead suit', () => {
        const trump: Card = { suit: 'SPADES', rank: '3' };
        const lead: Card = { suit: 'HEARTS', rank: 'A' };

        assert.equal(compareCards(trump, lead, trumpSuit, leadSuit), 1);
        assert.equal(compareCards(lead, trump, trumpSuit, leadSuit), -1);
      });
    });

    describe('Lead Suit vs Off-Suit', () => {
      it('should lead suit beat off-suit when no trump', () => {
        const lead: Card = { suit: 'HEARTS', rank: '2' };
        const offSuit: Card = { suit: 'DIAMONDS', rank: 'A' };

        assert.equal(compareCards(lead, offSuit, trumpSuit, leadSuit), 1);
        assert.equal(compareCards(offSuit, lead, trumpSuit, leadSuit), -1);
      });

      it('should compare lead suit cards by rank', () => {
        const highLead: Card = { suit: 'HEARTS', rank: 'A' };
        const lowLead: Card = { suit: 'HEARTS', rank: '5' };

        assert.equal(compareCards(highLead, lowLead, trumpSuit, leadSuit), 1);
        assert.equal(compareCards(lowLead, highLead, trumpSuit, leadSuit), -1);
      });

      it('should handle all lead suit cards beating off-suit', () => {
        const leadLow: Card = { suit: 'HEARTS', rank: '2' };
        const offSuitHigh: Card = { suit: 'CLUBS', rank: 'A' };

        assert.equal(compareCards(leadLow, offSuitHigh, trumpSuit, leadSuit), 1);
      });
    });

    describe('Same Suit Rank Comparison', () => {
      it('should compare ranks correctly (A > K > Q > J)', () => {
        const ace: Card = { suit: 'CLUBS', rank: 'A' };
        const king: Card = { suit: 'CLUBS', rank: 'K' };
        const queen: Card = { suit: 'CLUBS', rank: 'Q' };
        const jack: Card = { suit: 'CLUBS', rank: 'J' };

        assert.equal(compareCards(ace, king, 'SPADES', 'CLUBS'), 1);
        assert.equal(compareCards(king, queen, 'SPADES', 'CLUBS'), 1);
        assert.equal(compareCards(queen, jack, 'SPADES', 'CLUBS'), 1);
      });

      it('should compare numeric ranks correctly', () => {
        const ten: Card = { suit: 'DIAMONDS', rank: '10' };
        const nine: Card = { suit: 'DIAMONDS', rank: '9' };
        const two: Card = { suit: 'DIAMONDS', rank: '2' };

        assert.equal(compareCards(ten, nine, 'SPADES', 'HEARTS'), 1);
        assert.equal(compareCards(nine, two, 'SPADES', 'HEARTS'), 1);
        assert.equal(compareCards(two, ten, 'SPADES', 'HEARTS'), -1);
      });

      it('should handle full rank order in trump suit', () => {
        const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

        for (let i = 0; i < ranks.length - 1; i++) {
          const higher: Card = { suit: 'SPADES', rank: ranks[i] as any };
          const lower: Card = { suit: 'SPADES', rank: ranks[i + 1] as any };

          const result = compareCards(higher, lower, 'SPADES', 'SPADES');
          assert.equal(result, 1, `${ranks[i]} should beat ${ranks[i + 1]}`);
        }
      });

      it('should handle full rank order in lead suit', () => {
        const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

        for (let i = 0; i < ranks.length - 1; i++) {
          const higher: Card = { suit: 'HEARTS', rank: ranks[i] as any };
          const lower: Card = { suit: 'HEARTS', rank: ranks[i + 1] as any };

          const result = compareCards(higher, lower, 'SPADES', 'HEARTS');
          assert.equal(result, 1, `${ranks[i]} should beat ${ranks[i + 1]}`);
        }
      });
    });

    describe('Edge Cases', () => {
      it('should return 0 for neither trump nor lead suit', () => {
        const card1: Card = { suit: 'CLUBS', rank: 'A' };
        const card2: Card = { suit: 'DIAMONDS', rank: '2' };

        const result = compareCards(card1, card2, 'SPADES', 'HEARTS');
        assert.equal(result, 0);
      });

      it('should handle same card comparison', () => {
        const card: Card = { suit: 'HEARTS', rank: 'K' };

        const result = compareCards(card, card, trumpSuit, leadSuit);
        assert.equal(result, 0);
      });

      it('should prioritize trump over lead suit', () => {
        const trump: Card = { suit: 'SPADES', rank: '2' };
        const lead: Card = { suit: 'HEARTS', rank: 'A' };

        assert.equal(compareCards(trump, lead, 'SPADES', 'HEARTS'), 1);
      });

      it('should handle both cards being off-suit', () => {
        const club: Card = { suit: 'CLUBS', rank: 'A' };
        const diamond: Card = { suit: 'DIAMONDS', rank: 'K' };

        const result = compareCards(club, diamond, 'SPADES', 'HEARTS');
        assert.equal(result, 0);
      });

      it('should compare equal rank cards in same suit', () => {
        const card1: Card = { suit: 'HEARTS', rank: 'K' };
        const card2: Card = { suit: 'HEARTS', rank: 'K' };

        const result = compareCards(card1, card2, 'SPADES', 'HEARTS');
        assert.equal(result, 0);
      });
    });

    describe('All Suit Combinations', () => {
      it('should handle trump vs all other suits', () => {
        const trump: Card = { suit: 'SPADES', rank: '2' };
        const hearts: Card = { suit: 'HEARTS', rank: 'A' };
        const diamonds: Card = { suit: 'DIAMONDS', rank: 'A' };
        const clubs: Card = { suit: 'CLUBS', rank: 'A' };

        assert.equal(compareCards(trump, hearts, 'SPADES', 'HEARTS'), 1);
        assert.equal(compareCards(trump, diamonds, 'SPADES', 'HEARTS'), 1);
        assert.equal(compareCards(trump, clubs, 'SPADES', 'HEARTS'), 1);
      });

      it('should handle lead suit vs all non-trump off-suits', () => {
        const lead: Card = { suit: 'HEARTS', rank: '2' };
        const diamonds: Card = { suit: 'DIAMONDS', rank: 'A' };
        const clubs: Card = { suit: 'CLUBS', rank: 'A' };

        assert.equal(compareCards(lead, diamonds, 'SPADES', 'HEARTS'), 1);
        assert.equal(compareCards(lead, clubs, 'SPADES', 'HEARTS'), 1);
      });
    });
  });

  // =================================================================
  // PLAY VALIDATION TESTS
  // =================================================================
  describe('canPlayCard', () => {
    function createTestState(): GameState {
      const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
      state.phase = 'PLAYING';
      state.trumpSuit = 'SPADES';
      return state;
    }

    describe('Ownership Validation', () => {
      it('should reject playing card not owned', () => {
        const state = createTestState();

        // Create a card definitely not in player's hand
        state.players[0]!.hand = [
          { suit: 'CLUBS', rank: 'A' },
          { suit: 'CLUBS', rank: 'K' }
        ];

        const canPlay = canPlayCard(state, 'p1', { suit: 'HEARTS', rank: 'A' });
        assert.equal(canPlay, false);
      });

      it('should allow playing card that is owned', () => {
        const state = createTestState();

        state.players[0]!.hand = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'CLUBS', rank: 'K' }
        ];

        const canPlay = canPlayCard(state, 'p1', { suit: 'HEARTS', rank: 'A' });
        assert.equal(canPlay, true);
      });

      it('should reject for non-existent player', () => {
        const state = createTestState();

        const canPlay = canPlayCard(state, 'invalid', { suit: 'HEARTS', rank: 'A' });
        assert.equal(canPlay, false);
      });
    });

    describe('First Card of Trick', () => {
      it('should allow playing any card on first play of trick', () => {
        const state = createTestState();

        state.players[0]!.hand = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'CLUBS', rank: 'K' },
          { suit: 'DIAMONDS', rank: 'Q' }
        ];

        // Empty trick - any card should be allowed
        assert.equal(canPlayCard(state, 'p1', { suit: 'HEARTS', rank: 'A' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'CLUBS', rank: 'K' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'DIAMONDS', rank: 'Q' }), true);
      });
    });

    describe('Follow Suit Rules', () => {
      it('should enforce following lead suit when able', () => {
        const state = createTestState();

        // Setup: Give p1 some hearts
        state.players[0]!.hand = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'CLUBS', rank: 'Q' }
        ];

        // Lead with hearts
        state.trick = [{ suit: 'HEARTS', rank: '5' }];

        // Try to play clubs when hearts available
        const canPlayOffSuit = canPlayCard(state, 'p1', { suit: 'CLUBS', rank: 'Q' });
        assert.equal(canPlayOffSuit, false);

        // Playing hearts should work
        const canPlayLeadSuit = canPlayCard(state, 'p1', { suit: 'HEARTS', rank: 'A' });
        assert.equal(canPlayLeadSuit, true);
      });

      it('should allow playing off-suit when void in lead suit', () => {
        const state = createTestState();

        state.players[0]!.hand = [
          { suit: 'CLUBS', rank: 'A' },
          { suit: 'DIAMONDS', rank: 'K' },
          { suit: 'SPADES', rank: 'Q' }
        ];

        state.trick = [{ suit: 'HEARTS', rank: '5' }];

        // No hearts in hand - can play any card
        assert.equal(canPlayCard(state, 'p1', { suit: 'CLUBS', rank: 'A' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'DIAMONDS', rank: 'K' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'SPADES', rank: 'Q' }), true);
      });

      it('should enforce following lead suit for all matching cards', () => {
        const state = createTestState();

        state.players[0]!.hand = [
          { suit: 'HEARTS', rank: '2' },
          { suit: 'HEARTS', rank: '3' },
          { suit: 'HEARTS', rank: '4' },
          { suit: 'CLUBS', rank: 'A' }
        ];

        state.trick = [{ suit: 'HEARTS', rank: 'K' }];

        // All hearts should be playable
        assert.equal(canPlayCard(state, 'p1', { suit: 'HEARTS', rank: '2' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'HEARTS', rank: '3' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'HEARTS', rank: '4' }), true);

        // Clubs should not be playable
        assert.equal(canPlayCard(state, 'p1', { suit: 'CLUBS', rank: 'A' }), false);
      });
    });

    describe('Trump Handling', () => {
      it('should allow playing trump when void in lead suit', () => {
        const state = createTestState();

        state.players[0]!.hand = [
          { suit: 'SPADES', rank: 'A' }, // Trump
          { suit: 'CLUBS', rank: 'K' }
        ];

        state.trick = [{ suit: 'HEARTS', rank: '5' }];

        // Can play trump when void
        assert.equal(canPlayCard(state, 'p1', { suit: 'SPADES', rank: 'A' }), true);
      });

      it('should allow playing trump as lead card', () => {
        const state = createTestState();

        state.players[0]!.hand = [
          { suit: 'SPADES', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' }
        ];

        // Empty trick - can lead with trump
        assert.equal(canPlayCard(state, 'p1', { suit: 'SPADES', rank: 'A' }), true);
      });

      it('should not force trump when void in lead suit (can discard)', () => {
        const state = createTestState();

        state.players[0]!.hand = [
          { suit: 'SPADES', rank: 'A' }, // Trump
          { suit: 'CLUBS', rank: 'K' },  // Off-suit
          { suit: 'DIAMONDS', rank: 'Q' } // Off-suit
        ];

        state.trick = [{ suit: 'HEARTS', rank: '5' }];

        // Both trump and off-suit discard should be allowed
        assert.equal(canPlayCard(state, 'p1', { suit: 'SPADES', rank: 'A' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'CLUBS', rank: 'K' }), true);
        assert.equal(canPlayCard(state, 'p1', { suit: 'DIAMONDS', rank: 'Q' }), true);
      });
    });

    describe('Multiple Cards in Trick', () => {
      it('should enforce follow suit on second card', () => {
        const state = createTestState();

        state.players[1]!.hand = [
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'CLUBS', rank: 'A' }
        ];

        state.trick = [{ suit: 'HEARTS', rank: 'Q' }];

        assert.equal(canPlayCard(state, 'p2', { suit: 'HEARTS', rank: 'K' }), true);
        assert.equal(canPlayCard(state, 'p2', { suit: 'CLUBS', rank: 'A' }), false);
      });

      it('should enforce follow suit on third card', () => {
        const state = createTestState();

        state.players[2]!.hand = [
          { suit: 'HEARTS', rank: '7' },
          { suit: 'DIAMONDS', rank: 'K' }
        ];

        state.trick = [
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'K' }
        ];

        assert.equal(canPlayCard(state, 'p3', { suit: 'HEARTS', rank: '7' }), true);
        assert.equal(canPlayCard(state, 'p3', { suit: 'DIAMONDS', rank: 'K' }), false);
      });

      it('should enforce follow suit on fourth card', () => {
        const state = createTestState();

        state.players[3]!.hand = [
          { suit: 'HEARTS', rank: '2' },
          { suit: 'SPADES', rank: 'A' }
        ];

        state.trick = [
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'J' }
        ];

        assert.equal(canPlayCard(state, 'p4', { suit: 'HEARTS', rank: '2' }), true);
        assert.equal(canPlayCard(state, 'p4', { suit: 'SPADES', rank: 'A' }), false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle player with single card', () => {
        const state = createTestState();

        state.players[0]!.hand = [{ suit: 'CLUBS', rank: 'A' }];
        state.trick = [{ suit: 'HEARTS', rank: 'K' }];

        // Only one card - must be playable (void in lead suit)
        assert.equal(canPlayCard(state, 'p1', { suit: 'CLUBS', rank: 'A' }), true);
      });

      it('should handle empty hand (edge case)', () => {
        const state = createTestState();
        state.players[0]!.hand = [];

        const canPlay = canPlayCard(state, 'p1', { suit: 'HEARTS', rank: 'A' });
        assert.equal(canPlay, false);
      });

      it('should handle trick with 3 cards', () => {
        const state = createTestState();

        state.players[3]!.hand = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'CLUBS', rank: 'K' }
        ];

        state.trick = [
          { suit: 'HEARTS', rank: '5' },
          { suit: 'HEARTS', rank: '6' },
          { suit: 'HEARTS', rank: '7' }
        ];

        assert.equal(canPlayCard(state, 'p4', { suit: 'HEARTS', rank: 'A' }), true);
        assert.equal(canPlayCard(state, 'p4', { suit: 'CLUBS', rank: 'K' }), false);
      });
    });
  });

  // =================================================================
  // TRICK RESOLUTION TESTS
  // =================================================================
  describe('resolveTrick', () => {
    function createTestState(): GameState {
      const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
      state.phase = 'PLAYING';
      state.trumpSuit = 'SPADES';
      state.trickStartPlayerIndex = 0;
      return state;
    }

    describe('Validation', () => {
      it('should return undefined if trick has less than 4 cards', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' }
        ];

        assert.equal(resolveTrick(state), undefined);
      });

      it('should return undefined if no trump suit set', () => {
        const state = createTestState();
        state.trumpSuit = undefined;
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'J' }
        ];

        assert.equal(resolveTrick(state), undefined);
      });

      it('should return undefined if trickStartPlayerIndex not set', () => {
        const state = createTestState();
        state.trickStartPlayerIndex = undefined;
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'J' }
        ];

        assert.equal(resolveTrick(state), undefined);
      });

      it('should handle exactly 4 cards', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'J' }
        ];

        const winnerId = resolveTrick(state);
        assert.notEqual(winnerId, undefined);
      });
    });

    describe('Trump Wins', () => {
      it('should return winner ID when trump card wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },  // p1 (index 0)
          { suit: 'SPADES', rank: '2' },  // p2 (index 1) - TRUMP WINS
          { suit: 'HEARTS', rank: 'K' },  // p3 (index 2)
          { suit: 'HEARTS', rank: 'Q' }   // p4 (index 3)
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p2');
      });

      it('should handle multiple trumps - highest wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'SPADES', rank: '5' },  // p1 - trump
          { suit: 'SPADES', rank: 'K' },  // p2 - HIGHER TRUMP WINS
          { suit: 'SPADES', rank: '2' },  // p3 - trump
          { suit: 'HEARTS', rank: 'A' }   // p4 - lead suit
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p2');
      });

      it('should handle trump ace winning', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'SPADES', rank: 'A' },  // TRUMP ACE WINS
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'J' }
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p2');
      });

      it('should handle trump from last player', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'SPADES', rank: '2' }  // p4 - TRUMP WINS
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p4');
      });
    });

    describe('Lead Suit Wins', () => {
      it('should return winner ID when highest lead suit wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p1
          { suit: 'HEARTS', rank: 'A' },  // p2 - WINS
          { suit: 'HEARTS', rank: '5' },  // p3
          { suit: 'CLUBS', rank: 'A' }    // p4 - off-suit
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p2');
      });

      it('should handle lead card winning when all follow suit', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },  // p1 - WINS
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'J' }
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p1');
      });

      it('should handle third card winning', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: '7' },
          { suit: 'HEARTS', rank: '5' },
          { suit: 'HEARTS', rank: 'K' },  // p3 - WINS
          { suit: 'CLUBS', rank: 'A' }
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p3');
      });

      it('should handle off-suit discards not winning', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: '2' },  // p1 - WINS (lowest lead suit)
          { suit: 'CLUBS', rank: 'A' },
          { suit: 'DIAMONDS', rank: 'A' },
          { suit: 'CLUBS', rank: 'K' }
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p1');
      });
    });

    describe('Team Tricks Counter', () => {
      it('should increment team tricks counter', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'J' }
        ];

        const initialTricks = state.teams[1].tricksWon;
        resolveTrick(state);
        assert.equal(state.teams[1].tricksWon, initialTricks + 1);
      });

      it('should increment correct team counter', () => {
        const state = createTestState();
        state.trickStartPlayerIndex = 1; // Start from p2 (team 2)
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p2
          { suit: 'HEARTS', rank: 'A' },  // p3 (team 1) - WINS
          { suit: 'HEARTS', rank: '5' },  // p4
          { suit: 'HEARTS', rank: '7' }   // p1
        ];

        const initialTeam1 = state.teams[1].tricksWon;
        const initialTeam2 = state.teams[2].tricksWon;

        resolveTrick(state);

        assert.equal(state.teams[1].tricksWon, initialTeam1 + 1);
        assert.equal(state.teams[2].tricksWon, initialTeam2);
      });
    });

    describe('Different Start Players', () => {
      it('should handle tricks starting from player 0', () => {
        const state = createTestState();
        state.trickStartPlayerIndex = 0;
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p1
          { suit: 'HEARTS', rank: 'A' },  // p2 - WINS
          { suit: 'HEARTS', rank: '5' },  // p3
          { suit: 'HEARTS', rank: '7' }   // p4
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p2');
      });

      it('should handle tricks starting from player 1', () => {
        const state = createTestState();
        state.trickStartPlayerIndex = 1;
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p2
          { suit: 'HEARTS', rank: 'A' },  // p3 - WINS
          { suit: 'HEARTS', rank: '5' },  // p4
          { suit: 'HEARTS', rank: '7' }   // p1
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p3');
      });

      it('should handle tricks starting from player 2', () => {
        const state = createTestState();
        state.trickStartPlayerIndex = 2;
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p3
          { suit: 'HEARTS', rank: 'A' },  // p4 - WINS
          { suit: 'HEARTS', rank: '5' },  // p1
          { suit: 'HEARTS', rank: '7' }   // p2
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p4');
      });

      it('should handle tricks starting from player 3', () => {
        const state = createTestState();
        state.trickStartPlayerIndex = 3;
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p4
          { suit: 'HEARTS', rank: 'A' },  // p1 - WINS
          { suit: 'HEARTS', rank: '5' },  // p2
          { suit: 'HEARTS', rank: '7' }   // p3
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p1');
      });
    });

    describe('Complex Scenarios', () => {
      it('should handle mix of trump, lead, and off-suit', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },  // p1 - lead suit
          { suit: 'CLUBS', rank: 'K' },   // p2 - off-suit
          { suit: 'SPADES', rank: '3' },  // p3 - TRUMP WINS
          { suit: 'DIAMONDS', rank: 'A' } // p4 - off-suit
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p3');
      });

      it('should handle all players discarding off-suit', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p1 - lead, WINS by default
          { suit: 'CLUBS', rank: 'A' },
          { suit: 'DIAMONDS', rank: 'A' },
          { suit: 'CLUBS', rank: 'K' }
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p1');
      });

      it('should handle numeric trump cards', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'SPADES', rank: '10' },  // Trump
          { suit: 'SPADES', rank: '9' },   // Trump
          { suit: 'SPADES', rank: 'J' }    // HIGHER TRUMP WINS
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId, 'p4');
      });
    });
  });

  // =================================================================
  // BIDDING VALIDATION TESTS
  // =================================================================
  describe('Bidding Validation', () => {
    describe('isBidValid', () => {
      it('should accept valid bids in range 7-13', () => {
        assert.equal(isBidValid(7, 0, undefined), true);
        assert.equal(isBidValid(10, 0, undefined), true);
        assert.equal(isBidValid(13, 0, undefined), true);
      });

      it('should reject bids below minimum for score', () => {
        // Score < 30 -> min bid 2
        assert.equal(isBidValid(1, 0, undefined), false);
        assert.equal(isBidValid(2, 0, undefined), true);

        // Score >= 30 -> min bid 3
        assert.equal(isBidValid(2, 30, undefined), false);
        assert.equal(isBidValid(3, 30, undefined), true);

        // General invalid bids
        assert.equal(isBidValid(0, 0, undefined), false);
        assert.equal(isBidValid(-1, 0, undefined), false);
      });

      it('should reject bids above 13', () => {
        assert.equal(isBidValid(14, 0, undefined), false);
        assert.equal(isBidValid(20, 0, undefined), false);
      });

      it('should reject bids not higher than current highest', () => {
        assert.equal(isBidValid(7, 0, 7), false);
        assert.equal(isBidValid(7, 0, 8), false);
        assert.equal(isBidValid(9, 0, 10), false);
      });

      it('should accept bids higher than current highest', () => {
        assert.equal(isBidValid(8, 0, 7), true);
        assert.equal(isBidValid(10, 0, 9), true);
        assert.equal(isBidValid(13, 0, 12), true);
      });

      it('should allow any valid bid when no highest bid exists', () => {
        assert.equal(isBidValid(7, 0, undefined), true);
        assert.equal(isBidValid(10, 50, undefined), true);
        assert.equal(isBidValid(13, 100, undefined), true);
      });

      it('should handle boundary conditions', () => {
        assert.equal(isBidValid(7, 0, 6), true);
        assert.equal(isBidValid(7, 0, 7), false);
        assert.equal(isBidValid(13, 0, 12), true);
        assert.equal(isBidValid(13, 0, 13), false);
      });
    });

    describe('getMinIndividualBid', () => {
      it('should return 2 for scores below 30', () => {
        assert.equal(getMinIndividualBid(0), 2);
        assert.equal(getMinIndividualBid(15), 2);
        assert.equal(getMinIndividualBid(29), 2);
      });

      it('should return 3 for scores 30-39', () => {
        assert.equal(getMinIndividualBid(30), 3);
        assert.equal(getMinIndividualBid(35), 3);
        assert.equal(getMinIndividualBid(39), 3);
      });

      it('should return 4 for scores 40-49', () => {
        assert.equal(getMinIndividualBid(40), 4);
        assert.equal(getMinIndividualBid(45), 4);
        assert.equal(getMinIndividualBid(49), 4);
      });

      it('should return 5 for scores 50+', () => {
        assert.equal(getMinIndividualBid(50), 5);
        assert.equal(getMinIndividualBid(75), 5);
        assert.equal(getMinIndividualBid(100), 5);
        assert.equal(getMinIndividualBid(1000), 5);
      });

      it('should handle boundary values', () => {
        assert.equal(getMinIndividualBid(29), 2);
        assert.equal(getMinIndividualBid(30), 3);
        assert.equal(getMinIndividualBid(39), 3);
        assert.equal(getMinIndividualBid(40), 4);
        assert.equal(getMinIndividualBid(49), 4);
        assert.equal(getMinIndividualBid(50), 5);
      });

      it('should handle negative scores (edge case)', () => {
        assert.equal(getMinIndividualBid(-10), 2);
        assert.equal(getMinIndividualBid(-50), 2);
      });
    });

    describe('getMinTotalBids', () => {
      it('should return 11 when highest score below 30', () => {
        assert.equal(getMinTotalBids(0, 0), 11);
        assert.equal(getMinTotalBids(20, 25), 11);
        assert.equal(getMinTotalBids(29, 15), 11);
      });

      it('should return 12 when highest score 30-39', () => {
        assert.equal(getMinTotalBids(30, 20), 12);
        assert.equal(getMinTotalBids(25, 35), 12);
        assert.equal(getMinTotalBids(39, 10), 12);
      });

      it('should return 13 when highest score 40-49', () => {
        assert.equal(getMinTotalBids(40, 30), 13);
        assert.equal(getMinTotalBids(35, 45), 13);
        assert.equal(getMinTotalBids(49, 20), 13);
      });

      it('should return 14 when highest score 50+', () => {
        assert.equal(getMinTotalBids(50, 40), 14);
        assert.equal(getMinTotalBids(30, 75), 14);
        assert.equal(getMinTotalBids(100, 80), 14);
      });

      it('should use max of both team scores', () => {
        assert.equal(getMinTotalBids(50, 20), 14);
        assert.equal(getMinTotalBids(20, 50), 14);
        assert.equal(getMinTotalBids(40, 30), 13);
        assert.equal(getMinTotalBids(30, 40), 13);
      });

      it('should handle equal scores', () => {
        assert.equal(getMinTotalBids(30, 30), 12);
        assert.equal(getMinTotalBids(40, 40), 13);
        assert.equal(getMinTotalBids(50, 50), 14);
      });
    });

    describe('isBiddingRoundValid', () => {
      it('should validate when total bids meet minimum', () => {
        assert.equal(isBiddingRoundValid([7, 8, 0, 0], 0, 0), true); // Total 15 >= 11
        assert.equal(isBiddingRoundValid([3, 4, 5, 0], 0, 0), true); // Total 12 >= 11
      });

      it('should reject when total bids below minimum', () => {
        assert.equal(isBiddingRoundValid([2, 3, 4, 0], 0, 0), false); // Total 9 < 11
        assert.equal(isBiddingRoundValid([0, 0, 0, 0], 0, 0), false); // Total 0 < 11
      });

      it('should handle progressive minimums', () => {
        assert.equal(isBiddingRoundValid([3, 4, 5, 0], 30, 0), true);  // Total 12 >= 12
        assert.equal(isBiddingRoundValid([3, 4, 5, 0], 40, 0), false); // Total 12 < 13
        assert.equal(isBiddingRoundValid([4, 5, 4, 0], 40, 0), true);  // Total 13 >= 13
      });

      it('should handle all players passing (zeros)', () => {
        assert.equal(isBiddingRoundValid([0, 0, 0, 0], 0, 0), false);
        assert.equal(isBiddingRoundValid([0, 0, 0, 0], 50, 50), false);
      });

      it('should handle single high bidder', () => {
        assert.equal(isBiddingRoundValid([13, 0, 0, 0], 0, 0), true); // 13 >= 11
        assert.equal(isBiddingRoundValid([7, 0, 0, 0], 0, 0), false); // 7 < 11
      });
    });
  });

  // =================================================================
  // SCORING TESTS
  // =================================================================
  describe('calculateScoreDeltas', () => {
    const players = [
      { id: 'p1', teamId: 1 as const },
      { id: 'p2', teamId: 2 as const },
      { id: 'p3', teamId: 1 as const },
      { id: 'p4', teamId: 2 as const }
    ];

    describe('Contract Made', () => {
      it('should award points when contract is made exactly', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p1', // Team 1 bidder
          { 1: 7, 2: 6 },
          players
        );

        assert.deepEqual(deltas, { team1: 70, team2: 60 });
      });

      it('should handle overtricks', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p1',
          { 1: 10, 2: 3 },
          players
        );

        assert.deepEqual(deltas, { team1: 100, team2: 30 });
      });

      it('should handle high contract made', () => {
        const deltas = calculateScoreDeltas(
          13,
          'p2', // Team 2 bidder
          { 1: 0, 2: 13 },
          players
        );

        assert.deepEqual(deltas, { team1: 0, team2: 130 });
      });
    });

    describe('Contract Failed', () => {
      it('should penalize bidder when contract fails', () => {
        const deltas = calculateScoreDeltas(
          10,
          'p1', // Team 1 bidder
          { 1: 6, 2: 7 },
          players
        );

        assert.deepEqual(deltas, { team1: -100, team2: 70 });
      });

      it('should handle bidder getting zero tricks', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p2',
          { 1: 13, 2: 0 },
          players
        );

        assert.deepEqual(deltas, { team1: 130, team2: -70 });
      });

      it('should handle failed high bid', () => {
        const deltas = calculateScoreDeltas(
          13,
          'p2',
          { 1: 8, 2: 5 },
          players
        );

        assert.deepEqual(deltas, { team1: 80, team2: -130 });
      });

      it('should handle one trick short', () => {
        const deltas = calculateScoreDeltas(
          8,
          'p1',
          { 1: 7, 2: 6 },
          players
        );

        assert.deepEqual(deltas, { team1: -80, team2: 60 });
      });
    });

    describe('Edge Cases', () => {
      it('should return undefined for invalid bidderId', () => {
        const deltas = calculateScoreDeltas(
          7,
          'invalid',
          { 1: 7, 2: 6 },
          players
        );

        assert.equal(deltas, undefined);
      });

      it('should handle 13-0 sweep by bidder', () => {
        const deltas = calculateScoreDeltas(
          13,
          'p1',
          { 1: 13, 2: 0 },
          players
        );

        assert.deepEqual(deltas, { team1: 130, team2: 0 });
      });

      it('should handle 13-0 sweep against bidder', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p1',
          { 1: 0, 2: 13 },
          players
        );

        assert.deepEqual(deltas, { team1: -70, team2: 130 });
      });

      it('should handle minimum bid (7)', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p1',
          { 1: 7, 2: 6 },
          players
        );

        assert.deepEqual(deltas, { team1: 70, team2: 60 });
      });

      it('should handle maximum bid (13)', () => {
        const deltas = calculateScoreDeltas(
          13,
          'p1',
          { 1: 13, 2: 0 },
          players
        );

        assert.deepEqual(deltas, { team1: 130, team2: 0 });
      });
    });

    describe('Different Bidder Teams', () => {
      it('should handle team 1 as bidder', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p1',
          { 1: 8, 2: 5 },
          players
        );

        assert.deepEqual(deltas, { team1: 80, team2: 50 });
      });

      it('should handle team 2 as bidder', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p2',
          { 1: 5, 2: 8 },
          players
        );

        assert.deepEqual(deltas, { team1: 50, team2: 80 });
      });

      it('should handle team 1 partner as bidder', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p3', // Also team 1
          { 1: 9, 2: 4 },
          players
        );

        assert.deepEqual(deltas, { team1: 90, team2: 40 });
      });

      it('should handle team 2 partner as bidder', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p4', // Also team 2
          { 1: 4, 2: 9 },
          players
        );

        assert.deepEqual(deltas, { team1: 40, team2: 90 });
      });
    });

    describe('Various Trick Distributions', () => {
      it('should handle 7-6 split', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p1',
          { 1: 7, 2: 6 },
          players
        );

        assert.deepEqual(deltas, { team1: 70, team2: 60 });
      });

      it('should handle 8-5 split', () => {
        const deltas = calculateScoreDeltas(
          7,
          'p2',
          { 1: 5, 2: 8 },
          players
        );

        assert.deepEqual(deltas, { team1: 50, team2: 80 });
      });

      it('should handle 10-3 split', () => {
        const deltas = calculateScoreDeltas(
          8,
          'p1',
          { 1: 10, 2: 3 },
          players
        );

        assert.deepEqual(deltas, { team1: 100, team2: 30 });
      });

      it('should handle 11-2 split', () => {
        const deltas = calculateScoreDeltas(
          9,
          'p2',
          { 1: 2, 2: 11 },
          players
        );

        assert.deepEqual(deltas, { team1: 20, team2: 110 });
      });
    });
  });

  // =================================================================
  // UTILITY TESTS
  // =================================================================
  describe('getPlayerIndex', () => {
    function createTestState(): GameState {
      return createInitialGameState(['p1', 'p2', 'p3', 'p4']);
    }

    it('should return correct index for each player', () => {
      const state = createTestState();

      assert.equal(getPlayerIndex(state, 'p1'), 0);
      assert.equal(getPlayerIndex(state, 'p2'), 1);
      assert.equal(getPlayerIndex(state, 'p3'), 2);
      assert.equal(getPlayerIndex(state, 'p4'), 3);
    });

    it('should return -1 for non-existent player', () => {
      const state = createTestState();

      assert.equal(getPlayerIndex(state, 'invalid'), -1);
      assert.equal(getPlayerIndex(state, ''), -1);
    });

    it('should handle case-sensitive IDs', () => {
      const state = createTestState();

      assert.equal(getPlayerIndex(state, 'P1'), -1);
      assert.equal(getPlayerIndex(state, 'p1'), 0);
    });
  });
});