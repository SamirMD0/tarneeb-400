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

        assert.equal(compareCards(trump, nonTrump, leadSuit), 1);
        assert.equal(compareCards(nonTrump, trump, leadSuit), -1);
      });

      it('should handle multiple trump comparisons', () => {
        const highTrump: Card = { suit: 'SPADES', rank: 'A' };
        const lowTrump: Card = { suit: 'SPADES', rank: '2' };

        assert.equal(compareCards(highTrump, lowTrump, leadSuit), 1);
        assert.equal(compareCards(lowTrump, highTrump, leadSuit), -1);
      });

      it('should trump beat lead suit', () => {
        const trump: Card = { suit: 'SPADES', rank: '3' };
        const lead: Card = { suit: 'HEARTS', rank: 'A' };

        assert.equal(compareCards(trump, lead, leadSuit), 1);
        assert.equal(compareCards(lead, trump, leadSuit), -1);
      });
    });

    describe('Lead Suit vs Off-Suit', () => {
      it('should lead suit beat off-suit when no trump', () => {
        const lead: Card = { suit: 'HEARTS', rank: '2' };
        const offSuit: Card = { suit: 'DIAMONDS', rank: 'A' };

        assert.equal(compareCards(lead, offSuit, leadSuit), 1);
        assert.equal(compareCards(offSuit, lead, leadSuit), -1);
      });

      it('should compare lead suit cards by rank', () => {
        const highLead: Card = { suit: 'HEARTS', rank: 'A' };
        const lowLead: Card = { suit: 'HEARTS', rank: '5' };

        assert.equal(compareCards(highLead, lowLead, leadSuit), 1);
        assert.equal(compareCards(lowLead, highLead, leadSuit), -1);
      });

      it('should handle all lead suit cards beating off-suit', () => {
        const leadLow: Card = { suit: 'HEARTS', rank: '2' };
        const offSuitHigh: Card = { suit: 'CLUBS', rank: 'A' };

        assert.equal(compareCards(leadLow, offSuitHigh, leadSuit), 1);
      });
    });

    describe('Same Suit Rank Comparison', () => {
      it('should compare ranks correctly (A > K > Q > J)', () => {
        const ace: Card = { suit: 'CLUBS', rank: 'A' };
        const king: Card = { suit: 'CLUBS', rank: 'K' };
        const queen: Card = { suit: 'CLUBS', rank: 'Q' };
        const jack: Card = { suit: 'CLUBS', rank: 'J' };

        assert.equal(compareCards(ace, king, 'CLUBS'), 1);
        assert.equal(compareCards(king, queen, 'CLUBS'), 1);
        assert.equal(compareCards(queen, jack, 'CLUBS'), 1);
      });

      it('should compare numeric ranks correctly', () => {
        const ten: Card = { suit: 'DIAMONDS', rank: '10' };
        const nine: Card = { suit: 'DIAMONDS', rank: '9' };
        const two: Card = { suit: 'DIAMONDS', rank: '2' };

        assert.equal(compareCards(ten, nine, 'HEARTS'), 1);
        assert.equal(compareCards(nine, two, 'HEARTS'), 1);
        assert.equal(compareCards(two, ten, 'HEARTS'), -1);
      });

      it('should handle full rank order in trump suit', () => {
        const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

        for (let i = 0; i < ranks.length - 1; i++) {
          const higher: Card = { suit: 'SPADES', rank: ranks[i] as any };
          const lower: Card = { suit: 'SPADES', rank: ranks[i + 1] as any };

          const result = compareCards(higher, lower, 'SPADES');
          assert.equal(result, 1, `${ranks[i]} should beat ${ranks[i + 1]}`);
        }
      });

      it('should handle full rank order in lead suit', () => {
        const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

        for (let i = 0; i < ranks.length - 1; i++) {
          const higher: Card = { suit: 'HEARTS', rank: ranks[i] as any };
          const lower: Card = { suit: 'HEARTS', rank: ranks[i + 1] as any };

          const result = compareCards(higher, lower, 'HEARTS');
          assert.equal(result, 1, `${ranks[i]} should beat ${ranks[i + 1]}`);
        }
      });
    });

    describe('Edge Cases', () => {
      it('should return 0 for neither trump nor lead suit', () => {
        const card1: Card = { suit: 'CLUBS', rank: 'A' };
        const card2: Card = { suit: 'DIAMONDS', rank: '2' };

        const result = compareCards(card1, card2, 'HEARTS');
        assert.equal(result, 0);
      });

      it('should handle same card comparison', () => {
        const card: Card = { suit: 'HEARTS', rank: 'K' };

        const result = compareCards(card, card, leadSuit);
        assert.equal(result, 0);
      });

      it('should prioritize trump over lead suit', () => {
        const trump: Card = { suit: 'SPADES', rank: '2' };
        const lead: Card = { suit: 'HEARTS', rank: 'A' };

        assert.equal(compareCards(trump, lead, 'HEARTS'), 1);
      });

      it('should handle both cards being off-suit', () => {
        const club: Card = { suit: 'CLUBS', rank: 'A' };
        const diamond: Card = { suit: 'DIAMONDS', rank: 'K' };

        const result = compareCards(club, diamond, 'HEARTS');
        assert.equal(result, 0);
      });

      it('should compare equal rank cards in same suit', () => {
        const card1: Card = { suit: 'HEARTS', rank: 'K' };
        const card2: Card = { suit: 'HEARTS', rank: 'K' };

        const result = compareCards(card1, card2, 'HEARTS');
        assert.equal(result, 0);
      });
    });

    describe('All Suit Combinations', () => {
      it('should handle trump vs all other suits', () => {
        const trump: Card = { suit: 'SPADES', rank: '2' };
        const hearts: Card = { suit: 'HEARTS', rank: 'A' };
        const diamonds: Card = { suit: 'DIAMONDS', rank: 'A' };
        const clubs: Card = { suit: 'CLUBS', rank: 'A' };

        assert.equal(compareCards(trump, hearts, 'HEARTS'), 1);
        assert.equal(compareCards(trump, diamonds, 'HEARTS'), 1);
        assert.equal(compareCards(trump, clubs, 'HEARTS'), 1);
      });

      it('should handle lead suit vs all non-trump off-suits', () => {
        const lead: Card = { suit: 'HEARTS', rank: '2' };
        const diamonds: Card = { suit: 'DIAMONDS', rank: 'A' };
        const clubs: Card = { suit: 'CLUBS', rank: 'A' };

        assert.equal(compareCards(lead, diamonds, 'HEARTS'), 1);
        assert.equal(compareCards(lead, clubs, 'HEARTS'), 1);
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
        assert.notEqual(winnerId?.winnerId, undefined);
      });
    });

    describe.skip('Trump Wins', () => {
      it('should return winner ID when trump card wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },  // p1 (index 0)
          { suit: 'SPADES', rank: '2' },  // p2 (index 1) - TRUMP WINS
          { suit: 'HEARTS', rank: 'K' },  // p3 (index 2)
          { suit: 'HEARTS', rank: 'Q' }   // p4 (index 3)
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId?.winnerId, 'p2');
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
        assert.equal(winnerId?.winnerId, 'p2');
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
        assert.equal(winnerId?.winnerId, 'p2');
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
        assert.equal(winnerId?.winnerId, 'p4');
      });
    });

    describe.skip('Lead Suit Wins', () => {
      it('should return winner ID when highest lead suit wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },  // p1
          { suit: 'HEARTS', rank: 'A' },  // p2 - WINS
          { suit: 'HEARTS', rank: '5' },  // p3
          { suit: 'CLUBS', rank: 'A' }    // p4 - off-suit
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId?.winnerId, 'p2');
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
        assert.equal(winnerId?.winnerId, 'p1');
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
        assert.equal(winnerId?.winnerId, 'p3');
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
        assert.equal(winnerId?.winnerId, 'p1');
      });
    });

    describe.skip('Team Tricks Counter', () => {
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

    describe.skip('Different Start Players', () => {
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
        assert.equal(winnerId?.winnerId, 'p2');
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
        assert.equal(winnerId?.winnerId, 'p3');
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
        assert.equal(winnerId?.winnerId, 'p4');
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
        assert.equal(winnerId?.winnerId, 'p1');
      });
    });

    describe.skip('Complex Scenarios', () => {
      it('should handle mix of trump, lead, and off-suit', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },  // p1 - lead suit
          { suit: 'CLUBS', rank: 'K' },   // p2 - off-suit
          { suit: 'SPADES', rank: '3' },  // p3 - TRUMP WINS
          { suit: 'DIAMONDS', rank: 'A' } // p4 - off-suit
        ];

        const winnerId = resolveTrick(state);
        assert.equal(winnerId?.winnerId, 'p3');
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
        assert.equal(winnerId?.winnerId, 'p1');
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
        assert.equal(winnerId?.winnerId, 'p4');
      });
    });
  });

  // =================================================================
  // BIDDING VALIDATION TESTS
  // =================================================================
  describe('Bidding Validation', () => {
    describe('isBidValid', () => {
      it('should accept valid bids in range 7-13 with no prior bid', () => {
        assert.equal(isBidValid(7, 0, 0), true);
        assert.equal(isBidValid(10, 0, 0), true);
        assert.equal(isBidValid(13, 0, 0), true);
      });

      it('should reject bids below minimum for score', () => {
        // Score < 30 -> min bid 2
        assert.equal(isBidValid(1, 0, 0), false);
        assert.equal(isBidValid(2, 0, 0), true);

        // Score >= 30 -> min bid 3
        assert.equal(isBidValid(2, 30, 0), false);
        assert.equal(isBidValid(3, 30, 0), true);

        // General invalid bids
        assert.equal(isBidValid(0, 0, 0), false);
        assert.equal(isBidValid(-1, 0, 0), false);
      });

      it('should reject bids above 13', () => {
        assert.equal(isBidValid(14, 0, 0), false);
        assert.equal(isBidValid(20, 0, 0), false);
      });

      it('should accept valid bids regardless of current highest (independent bidding)', () => {
        // In Tarneeb 400, each player bids independently — no outbid requirement
        assert.equal(isBidValid(7, 0, 7), true);   // equal to highest — allowed
        assert.equal(isBidValid(5, 0, 8), true);    // below highest — allowed
        assert.equal(isBidValid(2, 0, 10), true);   // well below highest — allowed
      });

      it('should accept bids higher than current highest', () => {
        assert.equal(isBidValid(8, 0, 7), true);
        assert.equal(isBidValid(10, 0, 7), true);
        assert.equal(isBidValid(13, 0, 7), true);
      });

      it('should allow any valid bid when no highest bid exists', () => {
        assert.equal(isBidValid(7, 0, 0), true);
        assert.equal(isBidValid(10, 50, 0), true);
        assert.equal(isBidValid(13, 100, 0), true);
      });

      it('should handle boundary conditions', () => {
        assert.equal(isBidValid(2, 0, 0), true);    // min bid at score 0
        assert.equal(isBidValid(2, 0, 13), true);    // min bid even with max highest
        assert.equal(isBidValid(13, 0, 0), true);    // max bid
        assert.equal(isBidValid(13, 0, 13), true);   // max bid even when highest is 13
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
        assert.equal(getMinTotalBids(0), 11);
        assert.equal(getMinTotalBids(20), 11);
        assert.equal(getMinTotalBids(29), 11);
      });

      it('should return 12 when highest score 30-39', () => {
        assert.equal(getMinTotalBids(30), 12);
        assert.equal(getMinTotalBids(35), 12);
        assert.equal(getMinTotalBids(39), 12);
      });

      it('should return 13 when highest score 40-49', () => {
        assert.equal(getMinTotalBids(40), 13);
        assert.equal(getMinTotalBids(45), 13);
        assert.equal(getMinTotalBids(49), 13);
      });

      it('should return 14 when highest score 50+', () => {
        assert.equal(getMinTotalBids(50), 14);
        assert.equal(getMinTotalBids(60), 14);
        assert.equal(getMinTotalBids(100), 14);
      });

      it('should handle equal scores', () => {
        assert.equal(getMinTotalBids(30), 12);
        assert.equal(getMinTotalBids(40), 13);
        assert.equal(getMinTotalBids(50), 14);
      });
    });

    describe('isBiddingRoundValid', () => {
      it('should validate when total bids meet minimum', () => {
        assert.equal(isBiddingRoundValid([7, 8, 0, 0], 0), true); // Total 15 >= 11
        assert.equal(isBiddingRoundValid([3, 4, 5, 0], 0), true); // Total 12 >= 11
      });

      it('should reject when total bids below minimum', () => {
        assert.equal(isBiddingRoundValid([2, 3, 4, 0], 0), false); // Total 9 < 11
        assert.equal(isBiddingRoundValid([0, 0, 0, 0], 0), false); // Total 0 < 11
      });

      it('should handle progressive minimums', () => {
        assert.equal(isBiddingRoundValid([3, 4, 5, 0], 30), true);  // Total 12 >= 12
        assert.equal(isBiddingRoundValid([3, 4, 5, 0], 40), false); // Total 12 < 13
        assert.equal(isBiddingRoundValid([4, 5, 4, 0], 40), true);  // Total 13 >= 13
      });

      it('should handle all players passing (zeros)', () => {
        assert.equal(isBiddingRoundValid([0, 0, 0, 0], 0), false);
        assert.equal(isBiddingRoundValid([0, 0, 0, 0], 50), false);
      });

      it('should handle single high bidder', () => {
        assert.equal(isBiddingRoundValid([13, 0, 0, 0], 0), true); // 13 >= 11
        assert.equal(isBiddingRoundValid([7, 0, 0, 0], 0), false); // 7 < 11
      });
    });
  });

  describe('Phase 13: State Validation', () => {
    it('should reject canPlayCard for non-existent player', () => {
      const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
      state.phase = 'PLAYING';
      

      const result = canPlayCard(state, 'non_existent', { suit: 'HEARTS', rank: 'A' });
      assert.equal(result, false);
    });

    it('should handle resolveTrick with undefined trickStartPlayerIndex', () => {
      const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
      state.phase = 'PLAYING';
      
      state.trickStartPlayerIndex = undefined;
      state.trick = [
        { suit: 'HEARTS', rank: 'A' },
        { suit: 'HEARTS', rank: 'K' },
        { suit: 'HEARTS', rank: 'Q' },
        { suit: 'HEARTS', rank: 'J' }
      ];

      const result = resolveTrick(state);
      assert.equal(result, undefined);
    });

    it('should handle resolveTrick with empty trick array', () => {
      const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
      state.phase = 'PLAYING';
      
      state.trick = [];

      const result = resolveTrick(state);
      assert.equal(result, undefined);
    });

    it('should handle empty deck in state (edge case after dealing)', () => {
      const state = createInitialGameState(['p1', 'p2', 'p3', 'p4']);
      state.deck = []; // Clear deck after dealing

      // Game should still function - deck is only needed for dealing
      assert.equal(state.players[0]!.hand.length, 13);
    });
  });
});