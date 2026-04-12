import * as fs from 'fs';

let content = fs.readFileSync('src/game/tests/rules.test.ts', 'utf-8');

// Fix 'Trump Wins' descriptions and test logic
content = content.replace(
`      it('should return winner ID when trump card wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },  // p1 (index 0)
          { suit: 'SPADES', rank: '2' },  // p2 (index 1) - TRUMP WINS
          { suit: 'HEARTS', rank: 'K' },  // p3 (index 2)
          { suit: 'HEARTS', rank: 'Q' }   // p4 (index 3)
        ];`,
`      it('should return winner ID when trump card wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'SPADES', rank: 'A' },  // p1 (index 0)
          { suit: 'HEARTS', rank: '2' },  // p2 (index 1) - TRUMP WINS
          { suit: 'SPADES', rank: 'K' },  // p3 (index 2)
          { suit: 'SPADES', rank: 'Q' }   // p4 (index 3)
        ];`
);

content = content.replace(
`      it('should handle multiple trumps - highest wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'SPADES', rank: '5' },  // p1 - trump
          { suit: 'SPADES', rank: 'K' },  // p2 - HIGHER TRUMP WINS
          { suit: 'SPADES', rank: '2' },  // p3 - trump
          { suit: 'HEARTS', rank: 'A' }   // p4 - lead suit
        ];`,
`      it('should handle multiple trumps - highest wins', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: '5' },  // p1 - trump
          { suit: 'HEARTS', rank: 'K' },  // p2 - HIGHER TRUMP WINS
          { suit: 'HEARTS', rank: '2' },  // p3 - trump
          { suit: 'SPADES', rank: 'A' }   // p4 - lead suit
        ];`
);

content = content.replace(
`      it('should handle trump ace winning', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'SPADES', rank: 'A' },  // TRUMP ACE WINS
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'HEARTS', rank: 'J' }
        ];`,
`      it('should handle trump ace winning', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'SPADES', rank: 'K' },
          { suit: 'HEARTS', rank: 'A' },  // TRUMP ACE WINS
          { suit: 'SPADES', rank: 'Q' },
          { suit: 'SPADES', rank: 'J' }
        ];`
);

content = content.replace(
`      it('should handle trump from last player', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'HEARTS', rank: 'K' },
          { suit: 'HEARTS', rank: 'Q' },
          { suit: 'SPADES', rank: '2' }  // p4 - TRUMP WINS
        ];`,
`      it('should handle trump from last player', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'SPADES', rank: 'A' },
          { suit: 'SPADES', rank: 'K' },
          { suit: 'SPADES', rank: 'Q' },
          { suit: 'HEARTS', rank: '2' }  // p4 - TRUMP WINS
        ];`
);

content = content.replace(
`      it('should handle numeric trump cards', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },
          { suit: 'SPADES', rank: '10' },  // Trump
          { suit: 'SPADES', rank: '9' },   // Trump
          { suit: 'SPADES', rank: 'J' }    // HIGHER TRUMP WINS
        ];`,
`      it('should handle numeric trump cards', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'SPADES', rank: 'A' },
          { suit: 'HEARTS', rank: '10' },  // Trump
          { suit: 'HEARTS', rank: '9' },   // Trump
          { suit: 'HEARTS', rank: 'J' }    // HIGHER TRUMP WINS
        ];`
);

content = content.replace(
`      it('should handle mix of trump, lead, and off-suit', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'HEARTS', rank: 'A' },  // p1 - lead suit
          { suit: 'CLUBS', rank: 'K' },   // p2 - off-suit
          { suit: 'SPADES', rank: '3' },  // p3 - TRUMP WINS
          { suit: 'DIAMONDS', rank: 'A' } // p4 - off-suit
        ];`,
`      it('should handle mix of trump, lead, and off-suit', () => {
        const state = createTestState();
        state.trick = [
          { suit: 'SPADES', rank: 'A' },  // p1 - lead suit
          { suit: 'CLUBS', rank: 'K' },   // p2 - off-suit
          { suit: 'HEARTS', rank: '3' },  // p3 - TRUMP WINS
          { suit: 'DIAMONDS', rank: 'A' } // p4 - off-suit
        ];`
);


fs.writeFileSync('src/game/tests/rules.test.ts', content);
console.log('Fixed suits!');
