// Frontend/components/game/animations/BidPulse.tsx
//
// Renders a one-shot glow pulse when the highest bid changes.
//
// Trigger contract:
//   Parent passes `bidValue` (derived from `useDerivedGameView().trickSummary.bidValue`).
//   This component tracks the previous value via useRef and fires the animation
//   only when bidValue increments or transitions from null.
//
//   It does NOT fire on:
//     - Component mount
//     - Phase transitions (bidValue stays the same)
//     - Rerenders caused by unrelated state changes
//
// Animation:
//   Single pulse ring that expands and fades. Fires once per bid change.
//   Does not loop. Cleans up via `animationend` — no setTimeout.
//
// Reduced motion: pulse is suppressed entirely; a brief border flash is used instead.
//
// Memo boundary: BidPulse re-renders ONLY when bidValue or isBidding changes.
// Parent should not pass object refs that change identity on every render.

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface BidPulseProps {
  /** Current highest bid value, or null before any bid is placed */
  bidValue: number | null;
  /** Whether the game is currently in BIDDING phase */
  isBidding: boolean;
  /** The glow color — should match the bidder's seat color */
  color?: string;
  children: React.ReactNode;
}

export const BidPulse = React.memo(function BidPulse({
  bidValue,
  isBidding,
  color = '#e555c7',
  children,
}: BidPulseProps) {
  const reduced = useReducedMotion();
  const prevBidRef = useRef<number | null>(null);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    // Only pulse when bid value actually increases
    const prev = prevBidRef.current;
    const didBidIncrease =
      isBidding &&
      bidValue !== null &&
      (prev === null || bidValue > prev);

    if (didBidIncrease) {
      setPulsing(true);
    }
    prevBidRef.current = bidValue;
  }, [bidValue, isBidding]);

  // Reset on phase change (bidding ends)
  useEffect(() => {
    if (!isBidding) {
      setPulsing(false);
      prevBidRef.current = null;
    }
  }, [isBidding]);

  const handleAnimationEnd = useCallback(() => {
    setPulsing(false);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {pulsing && (
        <>
          {!reduced && (
            <style>{`
              @keyframes bid-pulse-ring {
                0%   { transform: scale(1);   opacity: 0.85; }
                100% { transform: scale(1.55); opacity: 0; }
              }
            `}</style>
          )}
          <div
            aria-hidden="true"
            onAnimationEnd={handleAnimationEnd}
            style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '0.875rem',
              border: `2px solid ${color}`,
              boxShadow: `0 0 14px ${color}, inset 0 0 8px ${color}33`,
              pointerEvents: 'none',
              zIndex: 10,
              ...(reduced
                ? { opacity: 0, transition: 'opacity 0.2s' }
                : { animation: 'bid-pulse-ring 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards' }),
            }}
          />
        </>
      )}
      {children}
    </div>
  );
});

BidPulse.displayName = 'BidPulse';