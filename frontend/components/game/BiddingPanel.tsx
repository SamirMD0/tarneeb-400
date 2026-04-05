'use client';

import { useState, useEffect } from 'react';
import '@/styles/cards.css';

interface BiddingPanelProps {
  myScore: number;
  isMyTurn: boolean;
  onBid: (value: number) => void;
  onPass: () => void;
}

const BID_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export function BiddingPanel({
  myScore,
  isMyTurn,
  onBid,
  onPass,
}: BiddingPanelProps) {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  // Clear selection when turn changes
  useEffect(() => {
    if (!isMyTurn) setSelectedBid(null);
  }, [isMyTurn]);

  const minBid = myScore >= 50 ? 5 : myScore >= 40 ? 4 : myScore >= 30 ? 3 : 2;

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
    <section aria-labelledby="bidding-heading" className="glow-panel p-3 sm:p-5 relative">
      {/* Top shimmer */}
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(229,85,199,0.4), transparent)',
        }}
        aria-hidden="true"
      />

      <h2
        id="bidding-heading"
        className="text-xs sm:text-sm font-semibold text-slate-50 mb-2 sm:mb-4 flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          style={{ color: '#e555c7', filter: 'drop-shadow(0 0 5px #e555c7)' }}
        >
          ♠
        </span>
        Bidding
      </h2>

      {/* Bid value chips */}
      <div className="bid-values mb-2 sm:mb-4 flex-wrap max-w-sm">
        {BID_VALUES.map((val) => {
          const isDisabled = !isMyTurn || val < minBid;
          return (
            <button
              key={val}
              type="button"
              className={`bid-chip${selectedBid === val ? ' bid-chip--selected' : ''}`}
              disabled={isDisabled}
              onClick={() => setSelectedBid(val)}
              aria-pressed={selectedBid === val}
            >
              {val}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 sm:gap-3 max-w-sm">
        <button
          type="button"
          className="glow-btn glow-btn--primary flex-1"
          disabled={!isMyTurn || !selectedBid}
          onClick={handleBid}
        >
          Bid {selectedBid ?? ''}
        </button>
        <button
          type="button"
          className="glow-btn glow-btn--secondary flex-1"
          disabled={!isMyTurn}
          onClick={handlePass}
        >
          Pass
        </button>
      </div>

      {!isMyTurn && (
        <p className="mt-3 text-sm text-slate-400">
          Waiting for other players to bid…
        </p>
      )}
    </section>
  );
}