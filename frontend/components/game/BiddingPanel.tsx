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