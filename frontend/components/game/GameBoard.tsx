'use client';

import { useAppState } from '@/hooks/useAppState';
import '@/styles/cards.css';
import { PlayerSeat, type PlayerSeatData } from './PlayerSeat';
import { HandCards } from './HandCards';
import { TrickArea, type TrickCard } from './TrickArea';
import { BiddingPanel } from './BiddingPanel';
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

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (!derived.phase) {
    return <LoadingState variant="game-hydrating" />;
  }

  // ── Build PlayerSeat data ──────────────────────────────────────────────────
  // Seat order: [top, right, bottom(me), left] — bottom is always the local player.
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

  const seats: (PlayerSeatData | null)[] = Array.from({ length: 4 }, (_, i) => {
    const p = rotated[i];
    if (!p) return null;
    
    // playerBids only exist in the current round, if it's bidding or we are tracking current round bids
    const currentBid = game.gameState?.playerBids?.[p.id];
    
    return {
      id: p.id,
      username:
        room.room?.players.find((lp) => lp.id === p.id)?.name ?? p.id.slice(0, 6),
      tricksWon: game.gameState?.teams[p.teamId]?.tricksWon ?? 0,
      score: p.score ?? 0, // from PlayerState, individual score
      currentBid: currentBid,
      isActive: p.id === activePlayerId,
      seatIndex: i,
    };
  });

  const [top, right, bottom, left] = seats;

  // ── Trick cards ────────────────────────────────────────────────────────────
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

  // ── Hand cards ─────────────────────────────────────────────────────────────
  const handCards = derived.myHand.map((card: Card, i: number) => ({
    id: `hand-${card.suit}-${card.rank}-${i}`,
    rank: card.rank,
    suit: SUIT_SYMBOLS[card.suit],
  }));

  const phase = derived.phase;
  const isPlaying = phase === 'PLAYING';
  const showHandCards = phase === 'PLAYING' || phase === 'BIDDING';

  return (
    <div className="flex flex-col gap-6">

      {/* Game action error banner — transient, shown above the board */}
      {game.lastError && (
        <ErrorBanner
          category="game"
          message={game.lastError.message}
          code={game.lastError.code}
        />
      )}

      {/* Table */}
      <div className="glow-panel p-4 relative overflow-visible">
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(229,85,199,0.35), transparent)',
          }}
          aria-hidden="true"
        />

        <div className="game-table flex-1 min-h-[400px]">
          <div className="game-table__top">
            {top ? <PlayerSeat player={top} /> : <EmptySeat index={0} />}
          </div>
          <div className="game-table__left">
            {left ? <PlayerSeat player={left} /> : <EmptySeat index={3} />}
          </div>
          <div className="game-table__center">
            {isBiddingPhase ? (
              <div className="flex items-center justify-center">
                <BiddingPanel
                  myScore={derived.myPlayer?.score ?? 0}
                  isMyTurn={derived.isMyTurn}
                  onBid={(value) => dispatchers.game.placeBid(value)}
                  onPass={() => dispatchers.game.passBid()}
                />
              </div>
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

      {/* Local player's hand */}
      {showHandCards && (
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
    seatIndex: index,
  };
  return <PlayerSeat player={data} />;
}