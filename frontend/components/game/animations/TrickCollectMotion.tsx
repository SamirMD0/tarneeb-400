// Frontend/components/game/animations/TrickCollectMotion.tsx
//
// Two-phase animation for trick resolution:
//   Phase 1 (winner highlight): When trick has 4 cards, a pulse ring expands from
//     the winning seat direction to identify the winner visually.
//   Phase 2 (collect): When the snapshot arrives with trick reset to [], the trick
//     cards shrink toward the winning compass slot before disappearing.
//
// Trigger contract:
//   Parent (TrickArea or GameBoard) tracks:
//     - prevTrickLength: previous trick.length from the last snapshot
//     - winnerSlot:     compass slot of the trick winner (derived from game snapshot)
//     - isCollecting:   true when prevTrickLength === 4 && currentTrickLength === 0
//
//   These are passed as props. This component owns ONLY the visual reaction.
//
// No timers that assume backend resolution speed.
// The collecting phase completes in 400ms — well within any backend round-trip.
//
// Reduced motion: pulsing and collection collapse are both suppressed.
// Layout thrash prevention: transforms only (no width/height/position reads).

'use client';

import React, { useMemo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type TrickSlot = 'n' | 'e' | 's' | 'w';

const SLOT_COLORS: Record<TrickSlot, string> = {
  n: '#e555c7',
  e: '#55aaff',
  s: '#55ffaa',
  w: '#ffaa33',
};

// Collect-toward transforms: cards scale down and drift toward the winner's edge
const COLLECT_TRANSFORM: Record<TrickSlot, string> = {
  n: 'translateY(-40px) scale(0.5)',
  e: 'translateX(40px)  scale(0.5)',
  s: 'translateY(40px)  scale(0.5)',
  w: 'translateX(-40px) scale(0.5)',
};

// ─── Winner pulse ring ─────────────────────────────────────────────────────────
// Renders an expanding ring anchored at the winner's compass edge.
// Purely decorative — no game state changes.

interface WinnerPulseProps {
  winnerSlot: TrickSlot;
  active: boolean;
}

export const WinnerPulse = React.memo(function WinnerPulse({
  winnerSlot,
  active,
}: WinnerPulseProps) {
  const reduced = useReducedMotion();
  const color = SLOT_COLORS[winnerSlot];

  if (!active || reduced) return null;

  return (
    <>
      <style>{`
        @keyframes trick-winner-pulse {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '0.75rem',
          border: `2px solid ${color}`,
          boxShadow: `0 0 18px ${color}`,
          animation: 'trick-winner-pulse 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />
    </>
  );
});

WinnerPulse.displayName = 'WinnerPulse';

// ─── Trick collect wrapper ─────────────────────────────────────────────────────
// Wraps each card slot during the collect phase.
// Cards shrink and drift toward the winner slot, then the parent snapshot removes them.

interface TrickCollectMotionProps {
  /** Whether the collect animation is active (trick just cleared) */
  isCollecting: boolean;
  /** The compass slot the winning player occupies */
  winnerSlot: TrickSlot;
  /** The compass slot of THIS card */
  cardSlot: TrickSlot;
  children: React.ReactNode;
}

export const TrickCollectMotion = React.memo(function TrickCollectMotion({
  isCollecting,
  winnerSlot,
  cardSlot,
  children,
}: TrickCollectMotionProps) {
  const reduced = useReducedMotion();

  const style = useMemo<React.CSSProperties>(() => {
    if (!isCollecting || reduced) return {};
    return {
      transform: COLLECT_TRANSFORM[winnerSlot],
      opacity: 0,
      transition: `transform 0.38s cubic-bezier(0.4, 0, 1, 1),
                   opacity   0.38s ease-in`,
    };
  }, [isCollecting, winnerSlot, reduced]);

  // cardSlot used for future stagger if needed; currently unused visually
  void cardSlot;

  return <div style={style}>{children}</div>;
});

TrickCollectMotion.displayName = 'TrickCollectMotion';