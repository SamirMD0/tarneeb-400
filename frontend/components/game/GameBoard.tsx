'use client';

import { useAppState } from '@/hooks/useAppState';
import '@/styles/cards.css';
import { PlayerSeat, type PlayerSeatData } from './PlayerSeat';
import { HandCards } from './HandCards';
import { TrickArea, type TrickCard } from './TrickArea';
import { BiddingPanel } from './BiddingPanel';
import { TrumpSelector } from './TrumpSelector';
import type { Card, Suit } from '@/types/game.types';

// ─── Suit symbol mapping ───────────────────────────────────────────────────────
const SUIT_SYMBOLS: Record<Suit, '♠' | '♥' | '♦' | '♣'> = {
  SPADES:   '♠',
  HEARTS:   '♥',
  DIAMONDS: '♦',
  CLUBS:    '♣',
};

export function GameBoard() {
  const { game, room, dispatchers } = useAppState();
  const { derived } = game;

  // ── Loading guard ────────────────────────────────────────────────────────────
  if (!derived.phase) {
    return (
      <div className="glow-panel flex items-center justify-center p-12 text-center">
        <p className="text-sm text-slate-500">Waiting for game to start…</p>
      </div>
    );
  }

  // ── Build PlayerSeat data from live room + game state ────────────────────────
  // Seat order: [top, right, bottom(me), left]  — bottom is always the local player.
  const players = game.gameState?.players ?? [];
  const myIndex = players.findIndex((p) => p.id === room.myPlayerId);

  // Rotate so local player is always at index 2 (bottom)
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

  const seats: (PlayerSeatData | null)[] = Array.from({ length: 4 }, (_, i) => {
    const p = rotated[i];
    if (!p) return null;
    return {
      id: p.id,
      username:
        room.room?.players.find((lp) => lp.id === p.id)?.name ?? p.id.slice(0, 6),
      tricksWon: game.gameState?.teams[p.teamId]?.tricksWon ?? 0,
      isActive: p.id === activePlayerId,
      seatIndex: i,
    };
  });

  const [top, right, bottom, left] = seats;

  // ── Build trick cards ────────────────────────────────────────────────────────
  const trickCards: (TrickCard | null)[] = Array.from({ length: 4 }, (_, i) => {
    const card = derived.currentTrick[i];
    if (!card) return null;
    return {
      id: `trick-${i}`,
      rank: card.rank,
      suit: SUIT_SYMBOLS[card.suit],
      playedBy: rotated[i]?.id ?? '',
    };
  });

  // ── Build hand cards ─────────────────────────────────────────────────────────
  const handCards = derived.myHand.map((card: Card, i: number) => ({
    id: `hand-${card.suit}-${card.rank}-${i}`,
    rank: card.rank,
    suit: SUIT_SYMBOLS[card.suit],
  }));

  const phase = derived.phase;
  const isPlaying = phase === 'PLAYING';
  const isBidding = phase === 'BIDDING' && !derived.mustSelectTrump;
  const isTrumpSelection = phase === 'BIDDING' && derived.mustSelectTrump;

  // ── Current bid info ─────────────────────────────────────────────────────────
  const currentBid = game.gameState?.highestBid ?? null;
  const currentBidder =
    game.gameState?.bidderId != null
      ? room.room?.players.find((p) => p.id === game.gameState?.bidderId)?.name ?? null
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Error banner */}
      {game.lastError && (
        <div
          role="alert"
          className="rounded-lg px-4 py-2 text-xs text-red-400"
          style={{
            background: 'rgba(255,85,119,0.08)',
            border: '1px solid rgba(255,85,119,0.25)',
          }}
        >
          {game.lastError.message}
        </div>
      )}

      {/* Table layout */}
      <div className="glow-panel p-4 relative overflow-visible">
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(229,85,199,0.35), transparent)',
          }}
          aria-hidden="true"
        />

        <div className="game-table">
          <div className="game-table__top">
            {top ? <PlayerSeat player={top} /> : <EmptySeat index={0} />}
          </div>
          <div className="game-table__left">
            {left ? <PlayerSeat player={left} /> : <EmptySeat index={3} />}
          </div>
          <div className="game-table__center">
            <TrickArea cards={trickCards} />
          </div>
          <div className="game-table__right">
            {right ? <PlayerSeat player={right} /> : <EmptySeat index={1} />}
          </div>
          <div className="game-table__bottom">
            {bottom ? <PlayerSeat player={bottom} /> : <EmptySeat index={2} />}
          </div>
        </div>
      </div>

      {/* Local player's hand */}
      {isPlaying && (
        <HandCards
          cards={handCards}
          onSelect={(card) => {
            const original = derived.myHand.find(
              (c) => SUIT_SYMBOLS[c.suit] === card.suit && c.rank === card.rank,
            );
            if (original) dispatchers.game.playCard(original);
          }}
        />
      )}

      {/* Bidding panel */}
      {isBidding && (
        <BiddingPanel
          currentBid={currentBid ?? null}
          currentBidder={currentBidder}
          isMyTurn={derived.isMyTurn}
          onBid={(value) => dispatchers.game.placeBid(value)}
          onPass={() => dispatchers.game.passBid()}
        />
      )}

      {/* Trump selector */}
      {isTrumpSelection && (
        <TrumpSelector
          isActive={derived.mustSelectTrump}
          onConfirm={(suit) => dispatchers.game.selectTrump(suit as Suit)}
        />
      )}
    </div>
  );
}

// Small placeholder for unfilled seats
function EmptySeat({ index }: { index: number }) {
  const data: PlayerSeatData = {
    id: `empty-${index}`,
    username: null,
    tricksWon: 0,
    isActive: false,
    seatIndex: index,
  };
  return <PlayerSeat player={data} />;
}