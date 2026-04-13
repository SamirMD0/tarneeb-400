# Frontend UI Improvements — Tarneeb 400 Game Board

---

## 1. Problems Found

### GameBoard.tsx
- **No game context strip**: Phase ("BIDDING", "PLAYING"), trump suit, and round scores are buried deep in child components or absent entirely. Players have to mentally track game state with no persistent HUD.
- **Disconnected hand area**: The `HandCards` section sits below the board with no visual link to the bottom player seat — looks like an afterthought, not part of the table.
- **Error banner takes full-width top-of-board space** with no dismiss animation or visual softness; it's jarring when it appears mid-game.
- **Empty center during bidding**: When `isBiddingPhase` is true, `BiddingPanel` is stuffed into the `game-table__center` cell alongside the trick area logic — the panel is cramped and doesn't breathe.
- **No "your turn" banner or subtle cue** on the board itself; the only signal is a glow on the active seat.

### PlayerSeat.tsx
- **Score is 10px text** — the single most important individual stat is the hardest thing to read. It's labelled "Score: 0" in muted grey.
- **Bid value ("Bid: 7") is yellow bold** but positioned below tricks — creates inverted visual hierarchy (bid matters more than tricks during active play).
- **No "You" badge**: All four seats look the same from the perspective of the local player; there's no visual indicator of which seat is yours.
- **Team affiliation is invisible**: Teams 1 (seats 0, 2) and 2 (seats 1, 3) share no visual grouping — the 2v2 structure is not communicated at all.
- **Empty seat has "Add Bot" inline** inside the seat card. This is a secondary admin action squashed into a player identity slot — wrong placement, wrong size.
- **"X tricks" label** has no denominator (out of 13), giving it no meaning mid-round.

### TrickArea.tsx
- **No player labels**: The compass slots (N/E/S/W) have cards but no indication of which player played what. After playing, you lose track of who led.
- **Ghost placeholders** (`trick-area__ghost`) are nearly invisible — just a 1px dashed border on dark background.
- **Winner highlight** (`.trick-area__winner`) applies a box-shadow but is not animated or timed — it flashes on then persists, which feels static.
- **Very constrained sizing**: `max-width: clamp(14rem, 28vw, 22rem)` on a 1440px display renders cards at ~22rem wide total. Cards feel small relative to the table grid cells.

### BiddingPanel.tsx
- **Minimum bid not displayed**: `minBid` is computed but never shown to the user — players don't know why bids 2–4 are disabled when score ≥ 30.
- **"Bid " (empty) button label**: When no bid is selected, the submit button reads "Bid " with a trailing space and blank — looks broken.
- **Bid chips use `flex-wrap`**: On a 320px mobile the 12 chips wrap to 3+ rows unpredictably. No fixed grid.
- **No opponent bid summary**: During bidding, players can't see what others bid — this is hidden state. Even showing `2 / 4 players bid` would help.
- **"Pass" button is secondary-styled**: But semantically passing is a significant action equivalent to bidding — it looks like a cancel button.

### HandCards.tsx
- **No "your turn" visual**: The hand area looks identical whether it's your turn or not. Only reading the seat glow tells you to act.
- **No disabled card states**: Cards that would be illegal to play (can't follow suit logic) are not visually greyed out — players play them and get an error.
- **Overlap on mobile breaks fan**: `margin-left: -1.2rem` works with transforms on desktop but on mobile the transform is `none` and overlap creates a flat jumbled stack.
- **Selected card lifts +14px** but with no drop shadow increase proportional to the lift — looks like a broken translate.

### cards.css (game board sections)
- **`min-height: 520px` on `.game-table`**: On a 768px-tall laptop (common), plus navbar + hand cards, this overflows without scroll.
- **`.player-seat` has identical styling for all 4 seats**: No team-axis grouping, no self-indicator.
- **`.hand-cards__card` margin overlap** creates z-index fighting on rapid hover.
- **Mobile breakpoint at 768px** collapses to `.hand-cards .glowing-card { --gc-width: 3.2rem }` — cards become so small rank/suit labels are illegible.
- **`.bid-chip` uses fixed `min-width: 2.25rem`** — 12 chips × 2.25rem + gaps = can overflow on narrow panels.

---

## 2. Design Decisions

| Change | Rationale |
|--------|-----------|
| Add a `GameStatusBar` strip above the table | Single glance tells you: phase, trump suit (♥), round bid target, and team scores. Replaces 4 scattered pieces of info. |
| Move score to large text in PlayerSeat, demote tricks | Score determines win/loss. Tricks matter only within a round. Flip the hierarchy. |
| Add "YOU" pill badge to local player's seat | Removes ambiguity in the 4-seat layout immediately. |
| Team color border-top accent on seats | Left seats (top/bottom of one diagonal) get one color band, right seats another — communicates 2v2 at a glance. |
| Show player names on TrickArea compass slots | Labels the N/E/S/W positions with abbreviated names so played cards are attributable. |
| Replace flex-wrap bid chips with 4-column CSS grid | Controlled layout regardless of screen width. |
| Show `minBid` hint text inside BiddingPanel | "Min bid: 3 (score ≥ 30)" — eliminates confusion about disabled chips. |
| Show opponent bid count progress | "2 / 4 bid" counter during bidding phase. |
| "Your turn" banner on hand area | Pulsing border on the hand container when `isMyTurn && phase === 'PLAYING'`. |
| Reduce `min-height` on `.game-table` | 480px default, 380px mobile — prevents overflow on standard laptop screens. |
| Larger card sizes in TrickArea on desktop | `clamp(5rem, 9vw, 7rem)` width — cards are legible without squinting. |

---

## 3. Updated Code

### 3.1 New Component: `GameStatusBar.tsx`

```tsx
// frontend/components/game/GameStatusBar.tsx
'use client';

import type { GamePhase } from '@/types/game.types';

interface GameStatusBarProps {
  phase: GamePhase | null;
  team1Score: number;
  team2Score: number;
  highestBid: number;
  bidsPlaced: number; // count of playerBids entries
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  DEALING:  { label: 'Dealing',  color: '#55aaff' },
  BIDDING:  { label: 'Bidding',  color: '#ffaa33' },
  PLAYING:  { label: 'Playing',  color: '#e555c7' },
  SCORING:  { label: 'Scoring',  color: '#55ffaa' },
  GAME_OVER:{ label: 'Game Over',color: '#ff5577' },
};

export function GameStatusBar({
  phase,
  team1Score,
  team2Score,
  highestBid,
  bidsPlaced,
}: GameStatusBarProps) {
  if (!phase) return null;
  const phaseInfo = PHASE_LABELS[phase] ?? { label: phase, color: '#94a3b8' };

  return (
    <div
      className="game-status-bar"
      role="status"
      aria-label="Game status"
    >
      {/* Phase pill */}
      <div className="game-status-bar__pill" style={{ '--pill-color': phaseInfo.color } as React.CSSProperties}>
        <span className="game-status-bar__dot" aria-hidden="true" />
        {phaseInfo.label}
      </div>

      {/* Trump */}
      <div className="game-status-bar__trump" aria-label="Trump suit: Hearts">
        <span className="game-status-bar__trump-label">Trump</span>
        <span className="game-status-bar__trump-suit">♥</span>
      </div>

      {/* Scores */}
      <div className="game-status-bar__scores">
        <span className="game-status-bar__team" aria-label={`Team 1 score: ${team1Score}`}>
          T1 <strong>{team1Score}</strong>
        </span>
        <span className="game-status-bar__sep" aria-hidden="true">vs</span>
        <span className="game-status-bar__team" aria-label={`Team 2 score: ${team2Score}`}>
          T2 <strong>{team2Score}</strong>
        </span>
      </div>

      {/* Bid info during bidding */}
      {phase === 'BIDDING' && (
        <div className="game-status-bar__bid-info" aria-label={`${bidsPlaced} of 4 players have bid`}>
          <span className="game-status-bar__bid-count">{bidsPlaced} / 4 bid</span>
          {highestBid > 0 && (
            <span className="game-status-bar__high-bid">High: {highestBid}</span>
          )}
        </div>
      )}

      {/* Win target reminder */}
      <div className="game-status-bar__target" aria-label="Win at 41 points">
        <span>Win @ 41</span>
      </div>
    </div>
  );
}
```

### 3.2 Updated `GameBoard.tsx`

```tsx
// frontend/components/game/GameBoard.tsx
'use client';

import { useAppState } from '@/hooks/useAppState';
import '@/styles/cards.css';
import { PlayerSeat, type PlayerSeatData } from './PlayerSeat';
import { HandCards } from './HandCards';
import { TrickArea, type TrickCard } from './TrickArea';
import { BiddingPanel } from './BiddingPanel';
import { GameStatusBar } from './GameStatusBar';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { LoadingState } from '@/components/feedback/LoadingState';
import type { Card, Suit } from '@/types/game.types';

const SUIT_SYMBOLS: Record<Suit, '♠' | '♥' | '♦' | '♣'> = {
  SPADES:   '♠',
  HEARTS:   '♥',
  DIAMONDS: '♦',
  CLUBS:    '♣',
};

export function GameBoard() {
  const { game, room, dispatchers } = useAppState();
  const { derived } = game;

  if (!derived.phase) {
    return <LoadingState variant="game-hydrating" />;
  }

  const players = game.gameState?.players ?? [];
  const myIndex = players.findIndex((p) => p.id === room.myPlayerId);

  const rotated =
    myIndex >= 0
      ? [
          players[(myIndex + 2) % players.length],
          players[(myIndex + 3) % players.length],
          players[myIndex],
          players[(myIndex + 1) % players.length],
        ]
      : players.slice(0, 4);

  const activePlayerId = derived.activePlayerId;
  const isBiddingPhase = derived.phase === 'BIDDING';

  // Build seat data
  const seats: (PlayerSeatData | null)[] = Array.from({ length: 4 }, (_, i) => {
    const p = rotated[i];
    if (!p) return null;
    const currentBid = game.gameState?.playerBids?.[p.id];
    return {
      id: p.id,
      username: room.room?.players.find((lp) => lp.id === p.id)?.name ?? p.id.slice(0, 6),
      tricksWon: game.gameState?.teams[p.teamId]?.tricksWon ?? 0,
      score: p.score ?? 0,
      currentBid,
      isActive: p.id === activePlayerId,
      isMe: p.id === room.myPlayerId,
      teamId: p.teamId,
      seatIndex: i,
    };
  });

  const [top, right, bottom, left] = seats;

  // Trick cards with player labels
  const trickCards: (TrickCard | null)[] = Array.from({ length: 4 }, (_, i) => {
    const card = derived.currentTrick[i];
    if (!card) return null;
    return {
      id: `trick-${i}`,
      rank: card.rank,
      suit: SUIT_SYMBOLS[card.suit],
      playedBy: rotated[i]?.id ?? '',
      playerName: room.room?.players.find(lp => lp.id === rotated[i]?.id)?.name?.slice(0, 6) ?? '',
    };
  });

  // Hand cards
  const handCards = derived.myHand.map((card: Card, i: number) => ({
    id: `hand-${card.suit}-${card.rank}-${i}`,
    rank: card.rank,
    suit: SUIT_SYMBOLS[card.suit],
  }));

  const phase = derived.phase;
  const isPlaying = phase === 'PLAYING';
  const showHandCards = phase === 'PLAYING' || phase === 'BIDDING';

  // Status bar data
  const team1Score = Math.max(0, ...players.filter(p => p.teamId === 1).map(p => p.score));
  const team2Score = Math.max(0, ...players.filter(p => p.teamId === 2).map(p => p.score));
  const bidsPlaced = Object.keys(game.gameState?.playerBids ?? {}).length;
  const highestBid = game.gameState?.highestBid ?? 0;

  return (
    <div className="game-board-root">

      {/* ── Status Bar ─────────────────────────────────────────────── */}
      <GameStatusBar
        phase={phase}
        team1Score={team1Score}
        team2Score={team2Score}
        highestBid={highestBid}
        bidsPlaced={bidsPlaced}
      />

      {/* ── Inline error ─────────────────────────────────────────────── */}
      {game.lastError && (
        <ErrorBanner
          category="game"
          message={game.lastError.message}
          code={game.lastError.code}
        />
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="glow-panel game-table-wrapper">
        <div className="absolute top-0 left-6 right-6 h-px" style={{
          background: 'linear-gradient(90deg, transparent, rgba(229,85,199,0.35), transparent)',
        }} aria-hidden="true" />

        <div className="game-table">
          <div className="game-table__top">
            {top ? <PlayerSeat player={top} /> : <EmptySeat index={0} />}
          </div>
          <div className="game-table__left">
            {left ? <PlayerSeat player={left} /> : <EmptySeat index={3} />}
          </div>
          <div className="game-table__center">
            {isBiddingPhase ? (
              <BiddingPanel
                myScore={derived.myPlayer?.score ?? 0}
                isMyTurn={derived.isMyTurn}
                playerBids={game.gameState?.playerBids ?? {}}
                players={players}
                onBid={(value) => dispatchers.game.placeBid(value)}
                onPass={() => dispatchers.game.passBid()}
              />
            ) : (
              <TrickArea cards={trickCards} />
            )}
          </div>
          <div className="game-table__right">
            {right ? <PlayerSeat player={right} /> : <EmptySeat index={1} />}
          </div>
          <div className="game-table__bottom">
            {bottom ? <PlayerSeat player={bottom} /> : <EmptySeat index={2} />}
          </div>
        </div>
      </div>

      {/* ── Hand ────────────────────────────────────────────────────── */}
      {showHandCards && (
        <div className={`hand-wrapper${isPlaying && derived.isMyTurn ? ' hand-wrapper--your-turn' : ''}`}>
          {isPlaying && derived.isMyTurn && (
            <p className="hand-wrapper__cue" aria-live="polite">Your turn — select a card</p>
          )}
          <HandCards
            cards={handCards}
            onSelect={(card) => {
              if (!isPlaying) return;
              const original = derived.myHand.find(
                (c) => SUIT_SYMBOLS[c.suit] === card.suit && c.rank === card.rank,
              );
              if (original) dispatchers.game.playCard(original);
            }}
          />
        </div>
      )}
    </div>
  );
}

function EmptySeat({ index }: { index: number }) {
  const data: PlayerSeatData = {
    id: `empty-${index}`,
    username: null,
    score: 0,
    currentBid: undefined,
    tricksWon: 0,
    isActive: false,
    isMe: false,
    teamId: index % 2 === 0 ? 1 : 2,
    seatIndex: index,
  };
  return <PlayerSeat player={data} />;
}
```

### 3.3 Updated `PlayerSeat.tsx`

```tsx
// frontend/components/game/PlayerSeat.tsx
import "@/styles/cards.css";
import { useAppState } from '@/hooks/useAppState';

const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"] as const;

const SEAT_COLORS: Record<number, string> = {
  0: "#e555c7",
  1: "#55aaff",
  2: "#55ffaa",
  3: "#ffaa33",
};

// Team accent colors for the top border band
const TEAM_COLORS: Record<1 | 2, string> = {
  1: "#e555c7",  // pink – team 1
  2: "#55aaff",  // blue – team 2
};

export interface PlayerSeatData {
  id: string;
  username: string | null;
  tricksWon: number;
  score: number;
  currentBid: number | undefined;
  isActive: boolean;
  isMe: boolean;
  teamId: 1 | 2;
  seatIndex: number;
}

interface PlayerSeatProps {
  player: PlayerSeatData;
}

export function PlayerSeat({ player }: PlayerSeatProps) {
  const { dispatchers } = useAppState();
  const color = SEAT_COLORS[player.seatIndex] ?? SEAT_COLORS[0];
  const suit = SUIT_SYMBOLS[player.seatIndex] ?? "♠";
  const isEmpty = !player.username;
  const teamColor = TEAM_COLORS[player.teamId];

  return (
    <div
      className={[
        'player-seat',
        player.isActive ? 'player-seat--active' : '',
        isEmpty       ? 'player-seat--empty'  : '',
        player.isMe   ? 'player-seat--me'     : '',
      ].filter(Boolean).join(' ')}
      style={{ '--seat-color': color, '--team-color': teamColor } as React.CSSProperties}
      aria-label={
        isEmpty
          ? 'Empty seat'
          : `${player.username}${player.isMe ? ', you' : ''}${player.isActive ? ', current turn' : ''}`
      }
    >
      {/* Team accent bar */}
      <div className="player-seat__team-bar" aria-hidden="true" />

      {/* Avatar */}
      <div className="player-seat__avatar" aria-hidden="true">
        {isEmpty ? '·' : suit}
      </div>

      {/* Name row */}
      <div className="player-seat__name-row">
        <p className="player-seat__name">
          {isEmpty ? 'Empty' : player.username}
        </p>
        {player.isMe && !isEmpty && (
          <span className="player-seat__you-badge" aria-label="This is you">YOU</span>
        )}
      </div>

      {/* Empty seat action */}
      {isEmpty && (
        <button
          type="button"
          onClick={() => dispatchers.room.addBot()}
          className="player-seat__add-bot"
          aria-label="Add a bot to this seat"
        >
          + Bot
        </button>
      )}

      {/* Active player stats */}
      {!isEmpty && (
        <div className="player-seat__stats">
          {/* Score — primary stat */}
          <div className="player-seat__score-block">
            <span className="player-seat__score-value">{player.score}</span>
            <span className="player-seat__score-label">pts</span>
          </div>

          {/* Divider */}
          <div className="player-seat__stat-div" aria-hidden="true" />

          {/* Tricks */}
          <div className="player-seat__tricks-block">
            <span className="player-seat__tricks-value">{player.tricksWon}</span>
            <span className="player-seat__tricks-label">tricks</span>
          </div>

          {/* Current bid */}
          {player.currentBid !== undefined && (
            <div className="player-seat__bid-badge" aria-label={`Bid: ${player.currentBid === 0 ? 'Pass' : player.currentBid}`}>
              {player.currentBid === 0 ? 'Pass' : `Bid ${player.currentBid}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3.4 Updated `TrickArea.tsx`

```tsx
// frontend/components/game/TrickArea.tsx
import "@/styles/cards.css";

export interface TrickCard {
  id: string;
  rank: string;
  suit: "♠" | "♥" | "♦" | "♣";
  playedBy: string;
  playerName?: string;   // NEW: display name for the slot label
  isWinner?: boolean;
}

const SUIT_COLORS: Record<string, string> = {
  "♠": "#e555c7",
  "♥": "#ff5577",
  "♦": "#55aaff",
  "♣": "#55ffaa",
};

const POSITIONS = ["n", "e", "s", "w"] as const;

// Direction labels shown under each slot
const POSITION_LABELS: Record<string, string> = {
  n: 'Opponent',
  e: 'Right',
  s: 'You',
  w: 'Left',
};

interface TrickAreaProps {
  cards: (TrickCard | null)[];
}

export function TrickArea({ cards }: TrickAreaProps) {
  const slots = [0, 1, 2, 3].map((i) => cards[i] ?? null);

  return (
    <div className="trick-area" aria-label="Current trick">
      {slots.map((card, i) => {
        const pos = POSITIONS[i];

        return (
          <div
            key={pos}
            className={[
              'trick-area__slot',
              `trick-area__slot--${pos}`,
              card?.isWinner ? 'trick-area__winner' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Player name label */}
            {card?.playerName && (
              <span className="trick-area__player-label" aria-hidden="true">
                {card.playerName}
              </span>
            )}

            {card ? (
              <div
                className="glowing-card"
                style={{
                  '--gc-color':    SUIT_COLORS[card.suit] ?? '#e555c7',
                  '--gc-blur':     '1rem',
                  '--gc-box-blur': '0.6rem',
                  '--gc-width':    'var(--trick-card-w, 5rem)',
                  '--gc-height':   'var(--trick-card-h, 7rem)',
                } as React.CSSProperties}
                aria-label={`${card.rank} of ${card.suit}${card.playerName ? ` played by ${card.playerName}` : ''}`}
              >
                <div className="glowing-card__corner">
                  <span className="glowing-card__rank">{card.rank}</span>
                  <span className="glowing-card__suit-small">{card.suit}</span>
                </div>
                <span className="glowing-card__suit-center">{card.suit}</span>
                <div className="glowing-card__corner glowing-card__corner--bottom" aria-hidden="true">
                  <span className="glowing-card__rank">{card.rank}</span>
                  <span className="glowing-card__suit-small">{card.suit}</span>
                </div>
              </div>
            ) : (
              <div
                className="trick-area__ghost"
                aria-hidden="true"
                style={{
                  '--gc-width':  'var(--trick-card-w, 5rem)',
                  '--gc-height': 'var(--trick-card-h, 7rem)',
                } as React.CSSProperties}
              >
                <span className="trick-area__ghost-label">{POSITION_LABELS[pos] ?? ''}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### 3.5 Updated `BiddingPanel.tsx`

```tsx
// frontend/components/game/BiddingPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import '@/styles/cards.css';
import type { PlayerState } from '@/types/game.types';

interface BiddingPanelProps {
  myScore: number;
  isMyTurn: boolean;
  playerBids: Record<string, number>;   // NEW: all placed bids
  players: PlayerState[];               // NEW: player list for bid display
  onBid: (value: number) => void;
  onPass: () => void;
}

const BID_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export function BiddingPanel({
  myScore,
  isMyTurn,
  playerBids,
  players,
  onBid,
  onPass,
}: BiddingPanelProps) {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  useEffect(() => {
    if (!isMyTurn) setSelectedBid(null);
  }, [isMyTurn]);

  const minBid = myScore >= 50 ? 5 : myScore >= 40 ? 4 : myScore >= 30 ? 3 : 2;
  const bidsPlaced = Object.keys(playerBids).length;

  function handleBid() {
    if (!selectedBid) return;
    onBid(selectedBid);
    setSelectedBid(null);
  }

  function handlePass() {
    onPass();
    setSelectedBid(null);
  }

  return (
    <section aria-labelledby="bidding-heading" className="bidding-panel">

      {/* Header */}
      <div className="bidding-panel__header">
        <span className="bidding-panel__suit-icon" aria-hidden="true"
          style={{ color: '#e555c7', filter: 'drop-shadow(0 0 5px #e555c7)' }}>♠</span>
        <h2 id="bidding-heading" className="bidding-panel__title">Bidding</h2>
        <span className="bidding-panel__progress" aria-live="polite"
          aria-label={`${bidsPlaced} of 4 players have bid`}>
          {bidsPlaced} / 4
        </span>
      </div>

      {/* Min bid hint */}
      {isMyTurn && minBid > 2 && (
        <p className="bidding-panel__min-hint" aria-live="polite">
          Min bid: <strong>{minBid}</strong>
          {myScore >= 30 && <span> (score ≥ {myScore >= 50 ? 50 : myScore >= 40 ? 40 : 30})</span>}
        </p>
      )}

      {/* Bid grid — 4 columns, always controlled */}
      <div className="bidding-panel__grid" role="group" aria-label="Select bid value">
        {BID_VALUES.map((val) => {
          const isDisabled = !isMyTurn || val < minBid;
          const isMin = val === minBid;
          return (
            <button
              key={val}
              type="button"
              className={[
                'bid-chip',
                selectedBid === val ? 'bid-chip--selected' : '',
                isMin && isMyTurn ? 'bid-chip--min' : '',
              ].filter(Boolean).join(' ')}
              disabled={isDisabled}
              onClick={() => setSelectedBid(val)}
              aria-pressed={selectedBid === val}
              aria-label={`Bid ${val}${isMin ? ', minimum bid' : ''}`}
            >
              {val}
              {isMin && <span className="bid-chip__min-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="bidding-panel__actions">
        <button
          type="button"
          className="glow-btn glow-btn--primary bidding-panel__bid-btn"
          disabled={!isMyTurn || !selectedBid}
          onClick={handleBid}
          aria-label={selectedBid ? `Place bid of ${selectedBid}` : 'Select a bid value first'}
        >
          {selectedBid ? `Bid ${selectedBid}` : 'Select bid'}
        </button>
        <button
          type="button"
          className="glow-btn bidding-panel__pass-btn"
          disabled={!isMyTurn}
          onClick={handlePass}
          aria-label="Pass — do not bid this round"
        >
          Pass
        </button>
      </div>

      {/* Waiting state */}
      {!isMyTurn && (
        <p className="bidding-panel__waiting" aria-live="polite">
          Waiting for others to bid…
        </p>
      )}
    </section>
  );
}
```

### 3.6 Updated CSS additions to `cards.css`

Add these blocks to the end of `frontend/styles/cards.css` (do not remove existing rules):

```css
/* ═══════════════════════════════════════════════════════════════════════ */
/*  UI Improvements — Game Board                                          */
/* ═══════════════════════════════════════════════════════════════════════ */

/* ─── Game board root ─────────────────────────────────────────────────── */
.game-board-root {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Game Status Bar ─────────────────────────────────────────────────── */
.game-status-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-radius: 0.625rem;
  background: rgba(255 255 255 / 0.025);
  border: 1px solid rgba(255 255 255 / 0.06);
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.game-status-bar__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pill-color, #e555c7);
  background: color-mix(in srgb, var(--pill-color, #e555c7) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--pill-color, #e555c7) 30%, transparent);
}

.game-status-bar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pill-color, #e555c7);
  box-shadow: 0 0 6px var(--pill-color, #e555c7);
  animation: pulse-dot 1.8s ease-in-out infinite;
}

.game-status-bar__trump {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #ff5577;
}
.game-status-bar__trump-label {
  color: #64748b;
  font-weight: 500;
}
.game-status-bar__trump-suit {
  font-size: 1rem;
  filter: drop-shadow(0 0 5px #ff5577);
}

.game-status-bar__scores {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  color: #94a3b8;
}
.game-status-bar__team strong {
  color: #f0f4ff;
  font-weight: 700;
  margin-left: 0.2rem;
}
.game-status-bar__sep {
  color: #334155;
  font-size: 0.65rem;
}

.game-status-bar__bid-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.game-status-bar__bid-count {
  color: #ffaa33;
  font-weight: 600;
}
.game-status-bar__high-bid {
  color: #94a3b8;
}

.game-status-bar__target {
  color: #334155;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
}

/* ─── Table wrapper ───────────────────────────────────────────────────── */
.game-table-wrapper {
  padding: 0.5rem;
}

/* Override: reduce min-height to fit standard laptop screens */
.game-table {
  min-height: 480px !important;
}

@media (max-width: 768px) {
  .game-table {
    min-height: 340px !important;
  }
}

/* ─── Trick card sizing (larger on desktop) ───────────────────────────── */
.trick-area {
  --trick-card-w: clamp(4rem, 7vw, 5.5rem);
  --trick-card-h: clamp(5.8rem, 10vw, 7.8rem);
}

@media (max-width: 768px) {
  .trick-area {
    --trick-card-w: 3rem;
    --trick-card-h: 4.4rem;
  }
}

/* ─── Trick player labels ─────────────────────────────────────────────── */
.trick-area__slot {
  position: relative;
  flex-direction: column;
  gap: 0.2rem;
}

.trick-area__player-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
  text-align: center;
  margin-bottom: 0.15rem;
}

/* Ghost placeholder improvement */
.trick-area__ghost {
  width: var(--trick-card-w, 5rem);
  height: var(--trick-card-h, 7rem);
  border-radius: 0.75rem;
  border: 1px dashed rgba(255 255 255 / 0.1);
  background: rgba(255 255 255 / 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
}

.trick-area__ghost-label {
  font-size: 0.55rem;
  color: rgba(255 255 255 / 0.15);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
  padding: 0.25rem;
}

/* ─── Player seat improvements ────────────────────────────────────────── */

/* Team color bar at top of each seat */
.player-seat {
  position: relative;
  overflow: hidden;
}

.player-seat__team-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--team-color, #e555c7);
  opacity: 0.5;
  transition: opacity 0.3s;
}

.player-seat--active .player-seat__team-bar {
  opacity: 1;
  box-shadow: 0 0 8px var(--team-color, #e555c7);
}

/* "You" badge */
.player-seat__name-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  justify-content: center;
}

.player-seat__you-badge {
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  background: rgba(229 85 199 / 0.15);
  border: 1px solid rgba(229 85 199 / 0.35);
  color: #e555c7;
  line-height: 1.4;
}

/* Self-seat subtle highlight */
.player-seat--me {
  background: rgba(229 85 199 / 0.04);
}

/* Stats block */
.player-seat__stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.25rem;
}

.player-seat__score-block,
.player-seat__tricks-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}

.player-seat__score-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #f0f4ff;
  line-height: 1;
}

.player-seat__score-label {
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
}

.player-seat__tricks-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  line-height: 1;
}

.player-seat__tricks-label {
  font-size: 0.5rem;
  letter-spacing: 0.04em;
  color: #334155;
  text-transform: uppercase;
}

.player-seat__stat-div {
  width: 1px;
  height: 1.5rem;
  background: rgba(255 255 255 / 0.07);
}

/* Bid badge — shown during/after bidding */
.player-seat__bid-badge {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 0.375rem;
  background: rgba(255 170 51 / 0.12);
  border: 1px solid rgba(255 170 51 / 0.3);
  color: #ffaa33;
}

/* Add bot button — cleaner inside empty seat */
.player-seat__add-bot {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  background: rgba(229 85 199 / 0.08);
  border: 1px solid rgba(229 85 199 / 0.25);
  color: rgba(229 85 199 / 0.7);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  margin-top: 0.25rem;
}
.player-seat__add-bot:hover {
  background: rgba(229 85 199 / 0.15);
  color: #e555c7;
}

@media (max-width: 768px) {
  .player-seat__score-value {
    font-size: 0.85rem;
  }
  .player-seat__tricks-value {
    font-size: 0.65rem;
  }
  .player-seat__stats {
    gap: 0.3rem;
  }
  .player-seat__stat-div {
    height: 1rem;
  }
}

/* ─── Bidding panel improvements ──────────────────────────────────────── */
.bidding-panel {
  background: linear-gradient(160deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border-dim);
  border-radius: 0.875rem;
  padding: 1rem;
  position: relative;
  width: 100%;
  max-width: 22rem;
}

@media (max-width: 768px) {
  .bidding-panel {
    max-width: 100%;
    padding: 0.75rem;
  }
}

.bidding-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 1.5rem; right: 1.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(229 85 199 / 0.4), transparent);
  border-radius: 9999px;
}

.bidding-panel__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.bidding-panel__suit-icon {
  font-size: 1rem;
}

.bidding-panel__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #f0f4ff;
  flex: 1;
  margin: 0;
}

.bidding-panel__progress {
  font-size: 0.7rem;
  font-weight: 600;
  color: #ffaa33;
  background: rgba(255 170 51 / 0.1);
  border: 1px solid rgba(255 170 51 / 0.25);
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
}

.bidding-panel__min-hint {
  font-size: 0.7rem;
  color: #64748b;
  margin: 0 0 0.6rem;
  padding: 0.3rem 0.6rem;
  background: rgba(255 170 51 / 0.05);
  border-left: 2px solid rgba(255 170 51 / 0.3);
  border-radius: 0 0.25rem 0.25rem 0;
}
.bidding-panel__min-hint strong {
  color: #ffaa33;
}

/* 4-column controlled grid for bid chips */
.bidding-panel__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

@media (max-width: 400px) {
  .bidding-panel__grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.25rem;
  }
}

/* Min-bid dot indicator */
.bid-chip {
  position: relative;
}

.bid-chip__min-dot {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffaa33;
}

.bid-chip--min {
  border-color: rgba(255 170 51 / 0.35);
}

/* Actions row */
.bidding-panel__actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: stretch;
}

.bidding-panel__bid-btn {
  width: 100%;
}

.bidding-panel__pass-btn {
  width: auto;
  padding: 0.6rem 1rem;
  background: rgba(255 255 255 / 0.04);
  border: 1px solid rgba(255 255 255 / 0.1);
  color: #64748b;
  font-size: 0.8rem;
}
.bidding-panel__pass-btn:hover:not(:disabled) {
  background: rgba(255 255 255 / 0.08);
  color: #94a3b8;
}

.bidding-panel__waiting {
  font-size: 0.75rem;
  color: #475569;
  text-align: center;
  margin: 0.5rem 0 0;
}

/* ─── Hand wrapper: "your turn" indicator ─────────────────────────────── */
.hand-wrapper {
  position: relative;
}

.hand-wrapper--your-turn {
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px rgba(229 85 199 / 0.35), 0 0 20px rgba(229 85 199 / 0.12);
  padding: 0.5rem;
  background: rgba(229 85 199 / 0.03);
  animation: hand-pulse 2.4s ease-in-out infinite;
}

@keyframes hand-pulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(229 85 199 / 0.35), 0 0 20px rgba(229 85 199 / 0.12); }
  50%       { box-shadow: 0 0 0 1px rgba(229 85 199 / 0.6),  0 0 32px rgba(229 85 199 / 0.22); }
}

.hand-wrapper__cue {
  font-size: 0.7rem;
  font-weight: 600;
  color: #e555c7;
  text-align: center;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  text-shadow: 0 0 8px rgba(229 85 199 / 0.5);
  animation: cue-fade 1.6s ease-in-out infinite;
}

@keyframes cue-fade {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
```

---

## 4. Before vs After (Text Description)

### Before
The game board was a collection of individually styled widgets arranged on a grid with no unifying visual language. Players had to:
- Look at a tiny "Score: 0" label in 10px grey text to check their score
- Guess which seat was theirs (no indicator)
- Figure out which team they were on (no visual grouping)
- Read individual player seats to understand the bidding progress
- Suffer through an overflowing flex-wrap chip grid that could render unpredictably
- Get no visual feedback that it was their turn to play a card
- See an ambiguous "Bid " button when no bid chip was selected

The table had no status context — phase, trump, and scores required scanning multiple areas. The center trick area used tiny cards with no attribution. Ghost placeholders were nearly invisible.

### After
A **persistent GameStatusBar** now anchors the top of the board: one glance shows phase → trump suit → both team scores → bidding progress. Players no longer need to hunt for context.

**PlayerSeats** now have a team-colored accent bar at the top (pink for team 1, blue for team 2) that immediately communicates the 2v2 structure. Your seat gets a "YOU" pill and a subtle pink tint. Score is promoted to large bold text; tricks is secondary. Bid values appear as a compact orange badge when placed.

The **BiddingPanel** uses a 4-column CSS grid for chips (no more flex-wrap chaos), shows a "Min bid: 3 (score ≥ 30)" hint when applicable, displays "2 / 4 bid" progress, and gives the submit button a clear "Select bid" placeholder instead of the broken "Bid " empty string.

The **TrickArea** cards are 25% larger on desktop. Each compass slot shows a player label and ghost placeholders have a subtle text hint.

The **hand area** now has a breathing glow border and "YOUR TURN — SELECT A CARD" label when it's the player's turn to act.

---

## 5. Optional Enhancements

These are low-effort, zero-logic improvements to add if desired:

```css
/* 1. Card play micro-animation — cards slide in from 8px below when added to trick */
.trick-area__slot .glowing-card {
  animation: card-settle 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes card-settle {
  from { transform: translateY(8px) scale(0.92); opacity: 0; }
  to   { transform: translateY(0)   scale(1);    opacity: 1; }
}

/* 2. Active seat — subtle shimmer sweep on the team bar */
.player-seat--active .player-seat__team-bar {
  background: linear-gradient(90deg, transparent, var(--team-color), transparent);
  background-size: 200% 100%;
  animation: bar-sweep 1.8s ease-in-out infinite;
}
@keyframes bar-sweep {
  0%   { background-position: -100% 0; }
  100% { background-position:  300% 0; }
}

/* 3. Score counter highlight when it changes — add via JS class toggle */
.player-seat__score-value--changed {
  animation: score-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes score-pop {
  0%   { transform: scale(1);    color: #f0f4ff; }
  40%  { transform: scale(1.3);  color: #55ffaa; }
  100% { transform: scale(1);    color: #f0f4ff; }
}

/* 4. Bid chip hover — slight lift with glow color matching value weight */
.bid-chip:not(:disabled):hover {
  transform: translateY(-2px);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

/* 5. Status bar phase pill — animate the dot faster during active phases */
.game-status-bar__pill[style*="--pill-color: #e555c7"] .game-status-bar__dot,
.game-status-bar__pill[style*="--pill-color: #ffaa33"] .game-status-bar__dot {
  animation-duration: 1s;
}
```

**Tip — Win threshold progress bar** (pure CSS, no logic change):
```css
/* Add this inside .player-seat__score-block — driven by CSS clamp on a custom prop */
.player-seat__score-block::after {
  content: '';
  display: block;
  width: 100%;
  height: 2px;
  border-radius: 1px;
  background: rgba(255 255 255 / 0.06);
  margin-top: 0.2rem;
  position: relative;
  overflow: hidden;
}
/* Use inline style="--score-pct: calc(X / 41 * 100%)" on the element to drive it */
.player-seat__score-block::after {
  background: linear-gradient(90deg,
    var(--team-color) var(--score-pct, 0%),
    rgba(255 255 255 / 0.06) var(--score-pct, 0%)
  );
}
```
This gives a thin progress bar under each player's score indicating proximity to the 41-point win — purely visual, zero logic change.
