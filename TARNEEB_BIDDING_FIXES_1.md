# Tarneeb Bidding Fixes

## Current Issues

1. **No highest-bid tracking** — `playerBids` stores each player's bid value but the reducer never tracks `highestBid` on state. Clients read `gameState.highestBid` (see `socket.test.ts` line asserting `update.gameState.highestBid === 7`) but the field does not exist on `GameState`.

2. **`isBidValid` ignores current highest** — `rules.ts::isBidValid(bid, playerScore)` only enforces the per-player minimum based on score. It never checks that the new bid exceeds the current round's highest bid, so a player can bid 2 when the current high is 10.

3. **`BID` and `PASS` treated identically** — Both record `bidValue = 0` for a pass. A pass (0) and a bid (2–13) are structurally distinguished only by `action.type`, but downstream checks use the stored `0` without context, making highest-bid logic fragile.

4. **Total-bids threshold uses wrong player scope** — `getMinTotalBids(highestPlayerScore)` is called with `Math.max(...state.players.map(p => p.score))`, which is correct, but this value is derived at evaluation time inside the reducer rather than being a named constant, making it easy to drift.

5. **Redeal resets `currentPlayerIndex` incorrectly** — On redeal the reducer sets `currentPlayerIndex: getNextPlayerIndex(state.dealerIndex)`, which is correct, but it does **not** reset `trickStartPlayerIndex`, leaving stale data from a previous aborted trick.

6. **`SET_TRUMP` action is referenced in tests and socket handlers but does not exist** — `bidding.handler.ts` imports no SET_TRUMP logic; the game auto-sets trump to `'HEARTS'` via `GameState.trumpSuit`. Test files emit `set_trump` events that go unhandled and silently drop.

---

## Correct Bidding Model

```
Bidding phase flow per Tarneeb rules:

1. Four players each bid exactly once, in order starting left of dealer.
2. Each bid must be:
   a. >= player's minimum (score-based, see getMinIndividualBid)
   b. > the current highest bid in the round (strict)
   c. <= 13
   OR the player passes (bid = 0).
3. A player who passes cannot bid again this round.
4. After all four players have acted:
   a. Sum all non-zero bids.
   b. If sum < getMinTotalBids(highestPlayerScore) → REDEAL
   c. Otherwise → transition to PLAYING, set trump to HEARTS
5. The player with the highest bid wins the contract.
   If two players tie on max bid, the first bidder (earlier index) wins.
```

---

## Data Structure Changes

### `GameState` — add two fields

```ts
// Backend/src/game/state.ts

export interface GameState {
  // ... existing fields ...

  highestBid: number;          // ADD: current round's highest bid value (0 = no bid yet)
  highestBidderId: string | null; // ADD: playerId of current high bidder (null = no bid yet)

  // existing:
  playerBids: Record<string, number>; // playerId → bid value (0 = pass)
}
```

### `createInitialGameState` — initialize new fields

```ts
return {
  // ... existing ...
  highestBid: 0,
  highestBidderId: null,
  playerBids: {},
};
```

### `GameAction` — no changes needed

`BID` and `PASS` already exist in `actions.ts`. `SET_TRUMP` should be **removed from client-facing socket events** since trump is always HEARTS; the auto-assignment happens at end of bidding.

---

## Bidding Flow

```
Player turn order: getNextPlayerIndex(state.dealerIndex) → +1 each turn

On BID action:
  1. Validate phase === 'BIDDING'
  2. Validate currentPlayer.id === action.playerId
  3. Validate action.value > state.highestBid          ← MISSING TODAY
  4. Validate action.value >= getMinIndividualBid(currentPlayer.score)
  5. Validate action.value <= 13
  6. If valid:
     - playerBids[playerId] = action.value
     - highestBid = action.value
     - highestBidderId = action.playerId
     - advance currentPlayerIndex
     - if bidsCount === 4 → evaluate total

On PASS action:
  1. Validate phase === 'BIDDING'
  2. Validate currentPlayer.id === action.playerId
  3. Record playerBids[playerId] = 0
  4. Advance currentPlayerIndex
  5. if bidsCount === 4 → evaluate total
```

---

## Total Bids Validation

Triggered when `Object.keys(nextPlayerBids).length === 4`.

```ts
const nonZeroBids = Object.values(nextPlayerBids).filter(v => v > 0);
const totalBids   = nonZeroBids.reduce((a, b) => a + b, 0);
const highestPlayerScore = Math.max(...state.players.map(p => p.score));
const minRequired = getMinTotalBids(highestPlayerScore);

if (totalBids < minRequired) {
  // REDEAL
} else {
  // TRANSITION TO PLAYING
}
```

`getMinTotalBids` thresholds (already correct in `rules.ts`):

| Highest player score | Min total bids |
|---|---|
| < 30 | 11 |
| 30–39 | 12 |
| 40–49 | 13 |
| >= 50 | 14 |

---

## Redeal Logic

On redeal, reshuffle and redistribute; preserve scores and dealer.

```ts
case REDEAL (inside BID/PASS when totalBids < minRequired):

  const newDeck    = shuffleDeck(createDeck(), Math.random);
  const newPlayers = state.players.map((p, i) => ({
    ...p,
    hand: newDeck.slice(i * 13, (i + 1) * 13),
    // score: PRESERVE (do not reset)
  }));

  return {
    ...state,
    players:               newPlayers,
    deck:                  newDeck,
    phase:                 'BIDDING',          // stay in BIDDING
    currentPlayerIndex:    getNextPlayerIndex(state.dealerIndex),
    playerBids:            {},                 // RESET
    highestBid:            0,                  // RESET
    highestBidderId:       null,               // RESET
    trick:                 [],                 // RESET
    trickStartPlayerIndex: undefined,          // RESET  ← fix current bug
    teams: {
      1: { tricksWon: 0 },
      2: { tricksWon: 0 },
    },
    // dealerIndex: PRESERVE (no rotation on redeal per standard rules)
  };
```

**Do NOT reset:** `players[n].score`, `dealerIndex`.

---

## Transition to PLAYING

When total bids pass validation:

```ts
return {
  ...state,
  playerBids:         nextPlayerBids,
  highestBid:         computedHighestBid,
  highestBidderId:    computedHighestBidderId,
  phase:              'PLAYING',
  trumpSuit:          'HEARTS',               // always HEARTS in this implementation
  currentPlayerIndex: getNextPlayerIndex(state.dealerIndex),
  trick:              [],
  trickStartPlayerIndex: undefined,
};
```

---

## Implementation Pseudocode

### `rules.ts` — fix `isBidValid`

```ts
// ADD currentHighestBid parameter
export function isBidValid(
  bid: number,
  playerScore: number,
  currentHighestBid: number  // ← ADD
): boolean {
  const minBid = getMinIndividualBid(playerScore);
  if (bid < minBid)            return false;
  if (bid > 13)                return false;
  if (bid <= currentHighestBid) return false;  // ← ADD: must strictly exceed current high
  return true;
}
```

Update all call sites:
- `reducer.ts`: `isBidValid(action.value, currentPlayer.score, state.highestBid)`
- `BotManager.ts::decideBid`: pass `state.highestBid` as third argument; return `null` if computed bid <= highestBid

### `state.ts` — extend `GameState`

```ts
export interface GameState {
  players:               PlayerState[];
  teams:                 Record<1 | 2, TeamState>;
  deck:                  Card[];
  trumpSuit:             'HEARTS';
  dealerIndex:           number;
  currentPlayerIndex:    number;
  trickStartPlayerIndex?: number;
  phase:                 GamePhase;
  trick:                 Card[];
  playerBids:            Record<string, number>;
  highestBid:            number;              // ADD
  highestBidderId:       string | null;       // ADD
}

export function createInitialGameState(playerIds: string[], initialDealerIndex = 0): GameState {
  // ... existing setup ...
  return {
    // ... existing fields ...
    playerBids:      {},
    highestBid:      0,         // ADD
    highestBidderId: null,      // ADD
  };
}
```

### `reducer.ts` — BID case

```ts
case 'BID': {
  if (state.phase !== 'BIDDING') return state;

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== action.playerId) return state;

  // FIX: pass highestBid to validator
  if (!isBidValid(action.value, currentPlayer.score, state.highestBid)) return state;

  const nextPlayerBids = { ...state.playerBids, [action.playerId]: action.value };
  const bidsCount      = Object.keys(nextPlayerBids).length;

  const newHighestBid      = action.value;           // ADD
  const newHighestBidderId = action.playerId;         // ADD

  if (bidsCount === 4) {
    // evaluate total
    const totalBids          = Object.values(nextPlayerBids).reduce((a, b) => a + b, 0);
    const highestPlayerScore = Math.max(...state.players.map(p => p.score));

    if (totalBids < getMinTotalBids(highestPlayerScore)) {
      // REDEAL
      const newDeck    = shuffleDeck(createDeck(), Math.random);
      const newPlayers = state.players.map((p, i) => ({
        ...p,
        hand: newDeck.slice(i * 13, (i + 1) * 13),
      }));
      return {
        ...state,
        players:               newPlayers,
        deck:                  newDeck,
        phase:                 'BIDDING',
        currentPlayerIndex:    getNextPlayerIndex(state.dealerIndex),
        playerBids:            {},
        highestBid:            0,
        highestBidderId:       null,
        trick:                 [],
        trickStartPlayerIndex: undefined,
        teams: { 1: { tricksWon: 0 }, 2: { tricksWon: 0 } },
      };
    }

    // PLAYING
    return {
      ...state,
      playerBids:         nextPlayerBids,
      highestBid:         newHighestBid,
      highestBidderId:    newHighestBidderId,
      phase:              'PLAYING',
      currentPlayerIndex: getNextPlayerIndex(state.dealerIndex),
      trick:              [],
      trickStartPlayerIndex: undefined,
    };
  }

  // mid-round, advance turn
  return {
    ...state,
    playerBids:         nextPlayerBids,
    highestBid:         newHighestBid,
    highestBidderId:    newHighestBidderId,
    currentPlayerIndex: getNextPlayerIndex(state.currentPlayerIndex),
  };
}
```

### `reducer.ts` — PASS case

```ts
case 'PASS': {
  if (state.phase !== 'BIDDING') return state;

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== action.playerId) return state;

  const nextPlayerBids = { ...state.playerBids, [action.playerId]: 0 };
  const bidsCount      = Object.keys(nextPlayerBids).length;

  if (bidsCount === 4) {
    const totalBids          = Object.values(nextPlayerBids).reduce((a, b) => a + b, 0);
    const highestPlayerScore = Math.max(...state.players.map(p => p.score));

    if (totalBids < getMinTotalBids(highestPlayerScore)) {
      // REDEAL (same as BID branch above)
      const newDeck    = shuffleDeck(createDeck(), Math.random);
      const newPlayers = state.players.map((p, i) => ({
        ...p,
        hand: newDeck.slice(i * 13, (i + 1) * 13),
      }));
      return {
        ...state,
        players:               newPlayers,
        deck:                  newDeck,
        phase:                 'BIDDING',
        currentPlayerIndex:    getNextPlayerIndex(state.dealerIndex),
        playerBids:            {},
        highestBid:            0,
        highestBidderId:       null,
        trick:                 [],
        trickStartPlayerIndex: undefined,
        teams: { 1: { tricksWon: 0 }, 2: { tricksWon: 0 } },
      };
    }

    return {
      ...state,
      playerBids:         nextPlayerBids,
      phase:              'PLAYING',
      currentPlayerIndex: getNextPlayerIndex(state.dealerIndex),
      trick:              [],
      trickStartPlayerIndex: undefined,
    };
  }

  return {
    ...state,
    playerBids:         nextPlayerBids,
    currentPlayerIndex: getNextPlayerIndex(state.currentPlayerIndex),
  };
}
```

### `validator.ts` — update `BidActionSchema` minimum

The Zod schema currently allows `value: z.number().int().min(2).max(13)`. This is the structural floor; the contextual floor (`> highestBid`) is enforced in the reducer. No schema change needed.

### `BotManager.ts` — fix `decideBid`

```ts
private decideBid(hand: Card[], playerScore: number, highestBid: number = 0): number | null {
  // ... existing card-counting logic to compute targetBid ...

  const minBid = Math.max(targetBid, getMinIndividualBid(playerScore));

  // Must strictly exceed current highest bid
  const effectiveBid = Math.max(minBid, highestBid + 1);

  if (effectiveBid > 13) return null;  // cannot outbid, pass
  return effectiveBid;
}
```

Call site in `executeBiddingTurn`:

```ts
const bidValue = this.decideBid(hand, playerScore, state.highestBid);
// if null → emit PASS action instead of BID
```

### `GameEngine.fromState` — validate new fields

Add to the validation block:

```ts
if (typeof state.highestBid !== 'number' || state.highestBid < 0)
  throw new Error('Invalid GameState: highestBid');
// highestBidderId may be null; no further constraint needed
```

---

## Socket/Client Impact

- `SanitizedGameState` (strips `deck`) will now carry `highestBid` and `highestBidderId` automatically.
- Frontend `GameState` type in `frontend/types/game.types.ts` must add:

```ts
highestBid:      number;
highestBidderId: string | null;
```

- Remove `set_trump` from `ClientToServerEvents` in both backend and frontend socket type files. The field `trumpSuit: 'HEARTS'` is constant; no client action is needed.
- Tests asserting `gameState.highestBid` will pass once the field is on state.
