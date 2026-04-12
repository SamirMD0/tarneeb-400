# Tarneeb 400 Game Rules
Phase 23 API Documentation

## Overview
Tarneeb 400 is a trick-taking card game played by 4 players. Unlike standard Tarneeb (which uses teams of 2), Tarneeb 400 is played individually—every player bids for themselves, and scoring is based on their individual contract.

## Key Differences from Standard Tarneeb
1. **No Teams:** Players bid and score individually (although gameplay still follows a 2v2 dynamic where passing cards/tricks might indirectly happen, the scoring is what matters).
2. **Fixed Trump:** The trump suit is permanently fixed to **HEARTS**.
3. **Bidding:**
   - Minimum total bids required varies based on the highest player score.
   - If total bids < minimum allowed, cards are re-dealt.

## Bidding Phase
- Starting to the right of the dealer, each player bids how many tricks they estimate they will win.
- Valid Bids: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.
- The minimum individual bid depends on a player's current score:
  - Score >= 50: min bid is 5
  - Score >= 40: min bid is 4
  - Score >= 30: min bid is 3
  - Otherwise: min bid is 2
- The minimum **Total Bids** (sum of all 4 player's bids) required for the round to validly start depends on the highest score among players:
  - Highest Score >= 50: 14 total bids min
  - Highest Score >= 40: 13 total bids min
  - Highest Score >= 30: 12 total bids min
  - Otherwise: 11 total bids min

## Playing Phase
1. The player to the right of the dealer leads the first trick.
2. Players MUST follow the lead suit if they have it.
3. If a player does not have the lead suit, they may play any card (including a Heart, which is Trump).
4. The trick is won by the highest Heart (Trump), or if no Hearts are played, the highest card of the lead suit.
5. The winner of the trick leads the next trick.

## Card Rankings (High to Low)
A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2

## Scoring
- If a player wins at least as many tricks as they bid, they gain points.
- If a player wins fewer tricks than they bid, they lose points.
- The point value is calculated based on their bid and whether their current score is >= 30:
  - Bids of 5-13 have distinct point jumps, heavily rewarding high contracts but severely punishing failures. Max score per bid scales non-linearly.

## Game End
- The game ends when a player reaches **41 points or more**, provided their partner is not in negative points (adapted team-based victory condition applied individually).
- If multiple players pass 41 on the same round, the one with the higher score wins.
