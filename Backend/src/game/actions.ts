// game/actions.ts (or inside reducer.ts if you prefer)

import { Card, Suit } from "../types/game.types.js";

export type GameAction =
  | { type: 'START_BIDDING' }
  | { type: 'BID'; playerId: string; value: number }
  | { type: 'PASS'; playerId: string }
  | { type: 'SET_TRUMP'; suit: Suit }
  | { type: 'PLAY_CARD'; playerId: string; card: Card }
  | { type: 'END_TRICK' }
  | { type: 'END_ROUND' }
  | { type: 'RESET_GAME' }
