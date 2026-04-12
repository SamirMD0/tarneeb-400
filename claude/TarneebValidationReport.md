# Tarneeb Rules Validation Report

> **Status: ✅ ALL ISSUES RESOLVED**
>
> This report was generated during development to audit the game engine against the official Tarneeb 400 rules.
> All 7 identified issues (3 Critical, 3 High, 1 Medium) have been systematically resolved.
>
> | # | Issue | Severity | Status |
> |---|-------|----------|--------|
> | 1 | Hearts Fixed vs. Chosen Trump | CRITICAL | ✅ Resolved — `trumpSuit` hardcoded as `'HEARTS'`, `SET_TRUMP` removed |
> | 2 | Scoring Formula (lookup table) | CRITICAL | ✅ Resolved — `getBidPoints()` implements official points table |
> | 3 | Individual vs. Team Scoring | CRITICAL | ✅ Resolved — `PlayerState.score` tracks per-player, `TeamState.score` removed |
> | 4 | Win Condition (partner > 0) | HIGH | ✅ Resolved — `isGameOver()` checks partner score > 0 |
> | 5 | Card Redistribution | HIGH | ✅ Resolved — Redeal logic in BID/PASS reducer when total bids < minimum |
> | 6 | Dealer Rotation | MEDIUM | ✅ Resolved — `dealerIndex` tracked and rotated in `START_NEXT_ROUND` |
> | 7 | All Player Bids Retained | HIGH | ✅ Resolved — `playerBids: Record<string, number>` stores all 4 bids |

---

## 1. Bidding System

### 1.1 Trump Suit Selection During Bidding

- **RULE (TarneebRules.md):**
  No mention of the bidding winner choosing a trump suit. The rules explicitly state: *"Hearts is considered the most powerful suit."* Hearts is fixed as the powerful suit — not a player-chosen suit.

- **IMPLEMENTATION:**
  `bidding.handler.ts` registers a `set_trump` socket event. `reducer.ts` handles `SET_TRUMP` action that sets `state.trumpSuit` to any of `['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']`. `BotManager.ts` has `decideTrumpSuit()` that picks any suit.

- **ISSUE:** ❌ CRITICAL — The entire trump-selection mechanic does not exist in the rules. The bidding winner does NOT choose a trump suit. Hearts is always the dominant suit.

- **FIX:**
  Remove `SET_TRUMP` action and `set_trump` socket event entirely. Set `trumpSuit: 'HEARTS'` as a constant in `createInitialGameState()`. Remove `decideTrumpSuit()` from `BotManager`. After bidding resolves, transition directly to `PLAYING` phase without requiring a `SET_TRUMP` dispatch.
```typescript
  // state.ts — createInitialGameState
  return {
    ...
    trumpSuit: 'HEARTS', // Always Hearts per rules
    ...
  };
```

---

### 1.2 Minimum Bid Range

- **RULE:** *"players have one chance to bid on the number of Tricks they want, ranging from 2 to 13"*

- **IMPLEMENTATION:**
  `BidActionSchema` in `validator.ts`: `z.number().int().min(2).max(13)` ✓
  `isBidValid()` in `rules.ts`: checks `bid < minBid || bid > 13` ✓

- **ISSUE:** ✅ Matches. No fix needed.

---

### 1.3 Score-Based Minimum Bid (Individual Player Scores)

- **RULE:**
  - Player score 30–39 → minimum bid = 3
  - Player score 40–49 → minimum bid = 4
  - Player score ≥ 50 → minimum bid = 5
  These thresholds reference **individual player scores**, not team aggregate scores.

- **IMPLEMENTATION:**
  `getMinIndividualBid(playerScore)` in `rules.ts` correctly maps these thresholds. However, it is called with `state.teams[player.teamId].score` (team score), not an individual player score. The backend tracks no per-player score — only per-team.

- **ISSUE:** ❌ The score thresholds are applied against **team scores** but the rules specify **individual player scores**. With team-aggregate scoring, a player could be incorrectly required to bid 3 when their personal score is only 15 (because the teammate pushed the team total to 32).

- **FIX:**
  Extend `PlayerState` to include `score: number`. Track and persist individual player scores throughout rounds. Pass the bidding player's own score to `isBidValid`:
```typescript
  // In reducer.ts BID case:
  const player = state.players.find(p => p.id === action.playerId);
  const playerScore = player.score; // individual score, not team score
  if (!isBidValid(action.value, playerScore, state.highestBid)) return state;
```

---

### 1.4 Minimum Total Bids Threshold

- **RULE:**
  - If result 30–39: minimum total bids = 12
  - If result 40–49: minimum total bids = 13
  - If result ≥ 50: minimum total bids = 14
  - Otherwise: minimum total bids = 11
  *"If the total bids are less than 11, the cards are redistributed."*

- **IMPLEMENTATION:**
  `getMinTotalBids(team1Score, team2Score)` uses the max of two team scores, returning 11/12/13/14. However, the trigger for redistribution is never enforced. There is no logic in the bidding flow that checks if total bids meet the minimum and re-deals if not.

- **ISSUE:** ❌ Card redistribution on insufficient total bids is completely unimplemented. Additionally, the threshold input should be based on individual player scores (highest individual score), not team scores.

- **FIX:**
  After all 4 players have bid/passed, compute the total of all bids placed. If `totalBids < getMinTotalBids(...)`, dispatch a `REDEAL` action that resets hands without resetting scores:
```typescript
  // In reducer.ts, after all 4 players have had their turn in BIDDING:
  case 'CHECK_TOTAL_BIDS': {
    const totalBids = state.bids.reduce((sum, b) => sum + b, 0);
    const minTotal = getMinTotalBids(...);
    if (totalBids < minTotal) {
      // Re-deal: reset hands, trick, bids, currentPlayerIndex
      // Keep team/player scores intact
      return redealState(state);
    }
    return state;
  }
```

  Alternatively, add redeal check at the end of each player's `PASS` or `BID` when `currentPlayerIndex` wraps back to 0.

---

### 1.5 All-Player Bidding vs. Highest-Bidder-Only Model

- **RULE:**
  *"Each player estimates the number of Tricks they believe they can win and declares it to the other players."* All 4 players bid. Each player's individual bid is used for their personal scoring.

- **IMPLEMENTATION:**
  The backend treats bidding as a competition: only the highest bid and the `bidderId` are stored. There is no storage of each player's individual bid value. Only the winning bidder's team performance is scored against the contract.

- **ISSUE:** ❌ The backend discards every player's bid except the highest one. Per rules, all four bids must be retained to individually score each player at round end.

- **FIX:**
  Add `playerBids: Record<string, number>` to `GameState`. Record each player's bid in the `BID` handler and each player's pass (as 0) in the `PASS` handler. Use these at `END_ROUND` to compute each player's individual score delta.

---

## 2. Trump (Tarneeb) Logic

### 2.1 Fixed vs. Chosen Trump

- **RULE:**
  *"Hearts is considered the most powerful suit."*
  *"If there is a heart, the card holder wins."*
  *"If there are multiple hearts, the one with the highest-ranking heart wins."*
  Hearts is the **permanent, fixed** dominant suit. No trump selection occurs.

- **IMPLEMENTATION:**
  `GameState.trumpSuit` is `Suit | undefined`, populated only after `SET_TRUMP` dispatch. If `SET_TRUMP` is never called, `trumpSuit` remains `undefined`, causing `resolveTrick()` to return `undefined` and breaking trick resolution.

- **ISSUE:** ❌ CRITICAL — The entire bidding-winner-chooses-trump mechanic contradicts the rules. Hearts must always be trump. Having `trumpSuit` as optional/undefined breaks trick resolution.

- **FIX:**
```typescript
  // state.ts
  export interface GameState {
    ...
    trumpSuit: 'HEARTS'; // readonly, never undefined
    ...
  }

  export function createInitialGameState(playerIds: string[]): GameState {
    return {
      ...
      trumpSuit: 'HEARTS',
      phase: 'DEALING',
      ...
    };
  }
```
  Remove `SET_TRUMP` from `actions.ts`, `reducer.ts`, `validator.ts`, and all socket handlers.

---

### 2.2 Trick Resolution with Fixed Hearts Trump

- **RULE:**
  Hearts always wins over non-hearts. Highest heart wins among multiple hearts. Highest card of led suit wins if no hearts played.

- **IMPLEMENTATION:**
  `compareCards(cardA, cardB, trumpSuit, leadSuit)` in `rules.ts` — logic is structurally correct given a `trumpSuit` parameter.

- **ISSUE:** ✅ The comparison logic itself is correct. It will work correctly once `trumpSuit` is fixed to `'HEARTS'`.

---

## 3. Trick Resolution

### 3.1 Turn Order — Counterclockwise Play

- **RULE:**
  *"The player to the right of the dealer throws any card on the table"*
  *"The turn proceeds counterclockwise"*

- **IMPLEMENTATION:**
  `reducer.ts` PLAY_CARD case: `currentPlayerIndex: (state.currentPlayerIndex + 1) % 4`
  This increments index by 1 each turn, implying clockwise or purely sequential order. No dealer position is tracked. No "player to the right of dealer" logic exists.

- **ISSUE:** ❌ Turn advancement is sequential (index +1) with no concept of counterclockwise rotation or dealer position. The seating arrangement determines which direction is "counterclockwise," but the engine has no seat/direction model.

- **FIX:**
  Add `dealerIndex: number` to `GameState`. At round start, the player at index `(dealerIndex + 1) % 4` (right of dealer in counterclockwise seating) leads the first trick. For subsequent tricks, the winner leads. Ensure player array order in `createInitialGameState` reflects counterclockwise seating. Rotate `dealerIndex` each round:
```typescript
  // In START_NEXT_ROUND reducer:
  return {
    ...nextInitial,
    dealerIndex: (state.dealerIndex + 1) % 4, // dealer rotates right
    currentPlayerIndex: (state.dealerIndex + 2) % 4, // right of new dealer plays first
  };
```

---

### 3.2 Trick Winner Leads Next Trick

- **RULE:**
  *"The player with the highest-ranking card wins the Trick and starts the next round."*

- **IMPLEMENTATION:**
  In `END_TRICK` reducer: `currentPlayerIndex: getPlayerIndex(state, resolution.winnerId)` ✓

- **ISSUE:** ✅ Correct. No fix needed.

---

### 3.3 Card Rank Order

- **RULE:**
  *"2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A"*

- **IMPLEMENTATION:**
  `rankOrder` in `rules.ts`: `['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']`
  Higher index = weaker. A is strongest. ✓

- **ISSUE:** ✅ Correct. No fix needed.

---

## 4. Scoring System

### 4.1 Points Table — Wrong Formula

- **RULE:**
  The rules specify a **discrete points table** per bid value:

  | Bid | Points (score < 30) | Points (score ≥ 30) |
  |-----|---------------------|----------------------|
  | 2   | 2                   | 2                    |
  | 3   | 3                   | 3                    |
  | 4   | 4                   | 4                    |
  | 5   | 10                  | 5                    |
  | 6   | 12                  | 6                    |
  | 7   | 14                  | 14                   |
  | 8   | 16                  | 16                   |
  | 9   | 27                  | 27                   |
  | 10  | 40                  | 40                   |
  | 11  | 40                  | 40                   |
  | 12  | 40                  | 40                   |
  | 13  | 40                  | 40                   |

  *"If a player wins the number of Tricks they bid or more, only the number they bid is added to their score."*

- **IMPLEMENTATION:**
  `calculateScoreDeltas()` in `rules.ts`:
```typescript
  if (bidderTricks >= contractBid) {
    bidderScoreDelta = bidderTricks * 10; // WRONG
  } else {
    bidderScoreDelta = -(contractBid * 10); // WRONG
  }
  const defenderScoreDelta = defenderTricks * 10; // WRONG
```

- **ISSUE:** ❌ CRITICAL — Three separate errors:
  1. The formula `tricks * 10` is not in the rules. The rules use a lookup table.
  2. Bidder gets bonus for extra tricks beyond bid (`bidderTricks * 10`). Rules say only the bid value counts.
  3. Failure penalty is `-(contractBid * 10)`. Rules say subtract the point value (from table), not bid×10.

- **FIX:**
  Implement a scoring lookup table and use it for both success and failure:
```typescript
  function getBidPoints(bidValue: number, playerScore: number): number {
    const tableBelow30: Record<number, number> = {
      2:2, 3:3, 4:4, 5:10, 6:12, 7:14, 8:16, 9:27,
      10:40, 11:40, 12:40, 13:40
    };
    const tableAbove30: Record<number, number> = {
      2:2, 3:3, 4:4, 5:5, 6:6, 7:14, 8:16, 9:27,
      10:40, 11:40, 12:40, 13:40
    };
    const table = playerScore >= 30 ? tableAbove30 : tableBelow30;
    return table[bidValue] ?? bidValue;
  }

  // If bidder makes their bid:
  bidderScoreDelta = getBidPoints(contractBid, bidderCurrentScore);
  // If bidder fails:
  bidderScoreDelta = -getBidPoints(contractBid, bidderCurrentScore);
```

---

### 4.2 Only Bid Value Scored on Success (No Overtrick Bonus)

- **RULE:**
  *"If a player wins the number of Tricks they bid or more, only the number they bid is added to their score."*
  Winning extra tricks beyond the bid gives NO additional points.

- **IMPLEMENTATION:**
  `bidderScoreDelta = bidderTricks * 10` — awards more points for winning more tricks than bid.

- **ISSUE:** ❌ Overtricks are rewarded. Rules explicitly forbid this.

- **FIX:**
  As shown above — use `getBidPoints(contractBid, ...)` regardless of how many tricks the bidder actually won (as long as they met the bid).

---

### 4.3 Individual vs. Team Scoring

- **RULE:**
  *"Points are calculated individually for each player at the end of each round."*
  *"If a player reaches a score of 30–39 points: the minimum bid becomes 3 Tricks."*
  *"the team whose player reaches 41 points wins, provided the other player on the same team has a score greater than 0"*

  These statements confirm scores are per-player, not per-team.

- **IMPLEMENTATION:**
  `GameState.teams: Record<1 | 2, TeamState>` with a single `score` per team. There is no individual player score tracking. The entire score model is team-based.

- **ISSUE:** ❌ Scoring model is team-aggregate. Rules require per-player score tracking.

- **FIX:**
  Add `score: number` to `PlayerState`. Track each player's score independently. At `END_ROUND`, update each player's `score` based on their individual bid result. The `teams` structure can remain for `tricksWon` tracking but `score` must move to `PlayerState`:
```typescript
  export interface PlayerState {
    id: string;
    hand: Card[];
    teamId: 1 | 2;
    score: number;       // ADD: individual score
    currentBid?: number; // ADD: individual bid for current round
  }
```

---

### 4.4 Defender Scoring

- **RULE:**
  All 4 players bid and are scored individually. If a defending player's team wins enough tricks to meet their bid, they gain points. If not, they lose points. The rules apply symmetrically to all players.

- **IMPLEMENTATION:**
  `defenderScoreDelta = defenderTricks * 10` — defenders always gain points regardless of their bid. The defending players' bids are not stored and cannot be evaluated.

- **ISSUE:** ❌ Defenders are never penalized for failing their own bids. Their scoring uses `tricks * 10` rather than the lookup table.

- **FIX:**
  After retaining all player bids (see §1.5 fix), at `END_ROUND` iterate over all four players and compute each one's delta individually:
```typescript
  for (const player of state.players) {
    const playerBid = state.playerBids[player.id];
    const playerTeamTricks = state.teams[player.teamId].tricksWon;
    const madeTheirBid = playerTeamTricks >= playerBid;
    const delta = madeTheirBid
      ? getBidPoints(playerBid, player.score)
      : -getBidPoints(playerBid, player.score);
    updatedPlayers[player.id].score += delta;
  }
```

---

## 5. Game Flow

### 5.1 Win Condition — Partner Score > 0

- **RULE:**
  *"the team whose player reaches 41 points wins, provided the other player on the same team has a score greater than 0"*

- **IMPLEMENTATION:**
  `engine.ts isGameOver()`:
```typescript
  return team1.score >= 41 || team2.score >= 41;
```
  No check that the winning player's teammate has score > 0.

- **ISSUE:** ❌ A team can win even if the partner player has a negative or zero score.

- **FIX:**
```typescript
  public isGameOver(): boolean {
    for (const player of this.state.players) {
      if (player.score >= 41) {
        // Check partner's score > 0
        const partner = this.state.players.find(
          p => p.teamId === player.teamId && p.id !== player.id
        );
        if (partner && partner.score > 0) return true;
      }
    }
    return false;
  }
```

---

### 5.2 Winner Determination — Team vs. Individual

- **RULE:**
  Win is triggered when a **player** (individual) reaches 41 points and their **partner** has score > 0. The winning **team** is determined by which player reached the threshold.

- **IMPLEMENTATION:**
  `getWinner()` compares `team1.score` vs `team2.score` (aggregate). This is incorrect given individual scoring.

- **ISSUE:** ❌ Winner logic uses team aggregate score, not individual player score.

- **FIX:**
```typescript
  public getWinner(): 1 | 2 | undefined {
    for (const player of this.state.players) {
      if (player.score >= 41) {
        const partner = this.state.players.find(
          p => p.teamId === player.teamId && p.id !== player.id
        );
        if (partner && partner.score > 0) return player.teamId;
      }
    }
    return undefined;
  }
```

---

### 5.3 Dealer Rotation

- **RULE:**
  *"After each game, the dealing moves to the player on the right."*
  *"The player to the right of the dealer throws any card on the table"*

- **IMPLEMENTATION:**
  No dealer tracking exists anywhere in `GameState`, `Room`, or `RoomManager`. `createInitialGameState()` always sets `currentPlayerIndex: 0` for the first player. `START_NEXT_ROUND` resets to index 0 as well.

- **ISSUE:** ❌ Dealer is never tracked, never rotated. The first player to act is always index 0, which is always the same player every round.

- **FIX:**
  Add `dealerIndex: number` to `GameState`. Rotate it each round in `START_NEXT_ROUND`. Set first bidder/player as `(dealerIndex + 1) % 4`:
```typescript
  // createInitialGameState — add:
  dealerIndex: 0,
  currentPlayerIndex: 1, // player to right of dealer (index 1)

  // START_NEXT_ROUND reducer:
  const nextDealer = (state.dealerIndex + 1) % 4;
  return {
    ...nextInitial,
    dealerIndex: nextDealer,
    currentPlayerIndex: (nextDealer + 1) % 4,
    teams: { /* preserved scores */ }
  };
```

---

### 5.4 Card Redistribution on Insufficient Total Bids

- **RULE:**
  *"If the total bids are less than 11, the cards are redistributed."*
  Additionally, with score thresholds, the minimum total rises to 12/13/14. If total bids fall below this minimum, redistribution occurs.

- **IMPLEMENTATION:**
  No redistribution logic exists anywhere. Once bidding ends, play always begins regardless of total bid sum.

- **ISSUE:** ❌ Completely unimplemented. Games will proceed with illegally low total bids.

- **FIX:**
  Add a `REDEAL` action. After the last player bids/passes in a round, compute total bids:
```typescript
  case 'CHECK_BID_TOTAL': {
    const totalBids = Object.values(state.playerBids).reduce((s, v) => s + v, 0);
    const highestScore = Math.max(...state.players.map(p => p.score));
    const minTotal = getMinTotalBids(highestScore);
    if (totalBids < minTotal) {
      // Re-deal without resetting scores
      return redealHands(state);
    }
    return state; // proceed to SET_TRUMP... wait — no SET_TRUMP per §2.1, proceed to PLAYING
  }

  function redealHands(state: GameState): GameState {
    const newDeck = shuffleDeck(createDeck(), Math.random);
    const newPlayers = state.players.map((p, i) => ({
      ...p,
      hand: newDeck.slice(i * 13, (i + 1) * 13),
      currentBid: undefined,
    }));
    return {
      ...state,
      players: newPlayers,
      deck: newDeck,
      phase: 'BIDDING',
      currentPlayerIndex: (state.dealerIndex + 1) % 4,
      playerBids: {},
      highestBid: undefined,
      bidderId: undefined,
      trick: [],
    };
  }
```

---

## 6. Edge Cases

### 6.1 SET_TRUMP After Bidding Without a Bidder

- **RULE:** N/A (SET_TRUMP should not exist per §2.1)
- **ISSUE:** In the current backend, if all 4 players pass and no `bidderId` is set, `SET_TRUMP` is guarded by `if (!state.bidderId) return state`. This leaves the game stuck in BIDDING phase forever since no trump can be set and play cannot start. Without redistribution logic, the game deadlocks.
- **FIX:** Once redistribution is implemented (§5.4), an all-pass scenario triggers a redeal, preventing deadlock.

---

### 6.2 Bot Bid Minimum (2 vs 7)

- **RULE:** Minimum bid is 2 (or 3/4/5 depending on player score).
- **IMPLEMENTATION:** `BotManager.decideBid()` returns bids of 5, 6, 7, or 8 minimum — never below 5. The bot never attempts to bid 2, 3, or 4.
- **ISSUE:** ❌ Bots cannot make low legal bids, distorting game balance and potentially causing total bids to fail minimums more often, triggering unnecessary redeals.
- **FIX:** Update `decideBid()` to map hand strength to the full 2–13 range, using bid values of 2–4 for weak hands rather than passing.

---

### 6.3 Negative Score and Subsequent Bid Minimums

- **RULE:** Score thresholds (30–39, 40–49, 50+) are for the player's current score. No rule addresses negative scores reducing the threshold.
- **IMPLEMENTATION:** `getMinIndividualBid(-10)` returns 2, which is correct (no penalty for negative scores). ✓
- **ISSUE:** ✅ Handled correctly.

---

### 6.4 Game End at Exact 41 Points Mid-Round

- **RULE:** The game ends when a team's player reaches 41 or more. No rule specifies stopping mid-round vs. waiting for round completion.
- **IMPLEMENTATION:** `END_ROUND` reducer checks: `const isGameOver = newTeam1Score >= 41 || newTeam2Score >= 41`. Game ends at round completion, not mid-round. ✓
- **ISSUE:** ✅ Reasonable and consistent with rules (game ends after round scoring).

---

## 7. Critical Bugs

### Bug 1 — Hearts Fixed vs. Chosen Trump [SEVERITY: CRITICAL]
**Impact:** Entire trump mechanic is wrong. Games will allow unintended dominant suits (e.g., Spades as trump) contradicting the rules. Trick resolution outcomes will be incorrect in the majority of games.
**Root Cause:** `SET_TRUMP` action exists and is called after bidding. `trumpSuit` is undefined until `SET_TRUMP` is dispatched, causing `resolveTrick()` to return `undefined` if game enters PLAYING before SET_TRUMP.
**Fix:** Hardcode `trumpSuit = 'HEARTS'` in `createInitialGameState`. Remove `SET_TRUMP` action, handler, schema, bot logic, and socket event.

---

### Bug 2 — Scoring Formula (tricks×10 vs. lookup table) [SEVERITY: CRITICAL]
**Impact:** Every game scores incorrectly. A player bidding 7 tricks earns 70 points (backend) vs. 14 points (rules). Games end in 1–2 rounds instead of the extended sessions the rules produce. The 400-point game name implies extended play — the current formula makes this impossible.
**Fix:** Implement `getBidPoints(bidValue, playerScore)` lookup table as shown in §4.1.

---

### Bug 3 — Team Scoring vs. Individual Scoring [SEVERITY: CRITICAL]
**Impact:** Win condition check, bidding minimums, and scoring deltas are all computed incorrectly. A team of players with scores 50 and -10 would win (backend: team aggregate = 40, not enough) but per rules the player with 50 would trigger a win check (and partner's -10 is not > 0, so game continues). The interaction of individual scores with the win condition cannot be evaluated at all without per-player tracking.
**Fix:** Move `score` from `TeamState` to `PlayerState`. See §4.3.

---

### Bug 4 — Win Condition Missing Partner Score > 0 Check [SEVERITY: HIGH]
**Impact:** A team where one player has 45 points and the partner has -20 points would win under backend logic but must NOT win per rules.
**Fix:** See §5.1.

---

### Bug 5 — Missing Card Redistribution [SEVERITY: HIGH]
**Impact:** Games proceed with total bids below the legal minimum (11/12/13/14), violating rules. Players never experience the redistribution mechanic at all.
**Fix:** See §5.4.

---

### Bug 6 — Dealer Position Never Tracked or Rotated [SEVERITY: MEDIUM]
**Impact:** The same player always bids and plays first in every round. The rule that the right-of-dealer plays first card each round is never honored. Fairness is compromised across rounds.
**Fix:** See §5.3.

---

### Bug 7 — All Player Bids Not Retained [SEVERITY: HIGH]
**Impact:** Since only the winning bid is stored (`state.highestBid`, `state.bidderId`), the other three players' bids are discarded. Individual scoring per §4 and §4.4 is impossible without storing all four bids.
**Fix:** See §1.5.