// Frontend/components/game/animations/CardPlayMotion.tsx
//
// Animates card entry into the trick area when trick.length increases.
//
// Architecture:
//   - Purely presentational. Receives card data and position props.
//   - No game state mutations. No socket access.
//   - Trigger: parent (TrickArea) passes `isNew` when a card was just placed.
//   - Animation: CSS keyframe via inline style injection — no external lib.
//   - Cleanup: `isNew` flag is reset by parent on next STATE_UPDATED snapshot.
//   - Rapid plays: each card is independent; overlapping animations don't collide.
//   - Reduced motion: reads `prefers-reduced-motion` via hook, skips transform animation.
//
// Seat-to-trick positioning:
//   Each compass slot (n/e/s/w) has a distinct entry direction.
//   Cards fly in from the appropriate edge rather than from a fixed pixel position,
//   so no DOM measurement / getBoundingClientRect is needed (avoids layout thrash).

'use client';

import React, { useMemo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import '@/styles/cards.css';

export type TrickSlot = 'n' | 'e' | 's' | 'w';

export interface CardPlayMotionProps {
  /** Whether this card was just placed (triggers entry animation) */
  isNew: boolean;
  /** Compass position of this card in the trick */
  slot: TrickSlot;
  children: React.ReactNode;
}

// Entry transforms: card starts off-screen in the direction of the playing seat
const ENTRY_TRANSFORM: Record<TrickSlot, string> = {
  n: 'translateY(-60px) scale(0.85)',
  s: 'translateY(60px)  scale(0.85)',
  e: 'translateX(60px)  scale(0.85)',
  w: 'translateX(-60px) scale(0.85)',
};

export const CardPlayMotion = React.memo(function CardPlayMotion({
  isNew,
  slot,
  children,
}: CardPlayMotionProps) {
  const reduced = useReducedMotion();

  const style = useMemo<React.CSSProperties>(() => {
    if (!isNew || reduced) {
      return { transition: 'none' };
    }
    return {
      animation: `card-play-in-${slot} 0.28s cubic-bezier(0.22, 1, 0.36, 1) both`,
    };
  }, [isNew, slot, reduced]);

  return (
    <>
      {/* Keyframes injected once per slot direction — safe duplicate injection */}
      {isNew && !reduced && (
        <style>{`
          @keyframes card-play-in-${slot} {
            from {
              opacity: 0;
              transform: ${ENTRY_TRANSFORM[slot]};
            }
            to {
              opacity: 1;
              transform: translateY(0) translateX(0) scale(1);
            }
          }
        `}</style>
      )}
      <div style={style}>
        {children}
      </div>
    </>
  );
});

CardPlayMotion.displayName = 'CardPlayMotion';