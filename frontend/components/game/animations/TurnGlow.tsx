// Frontend/components/game/animations/TurnGlow.tsx
//
// Wraps a player seat and applies a breathing glow animation when it is the
// active player's turn.
//
// Trigger contract:
//   Parent passes `isActive` (derived from `activePlayerId === player.id`)
//   and `color` (the seat color from PlayerSeat's SEAT_COLORS map).
//   This component owns only the visual shell — no game state reads.
//
// Animation:
//   A CSS `breathing` keyframe that gently pulses the box-shadow opacity.
//   Runs continuously while isActive is true.
//   Stops immediately (no pending cycle) when isActive becomes false.
//
// Turn change behavior:
//   When `isActive` transitions true → false the glow fades out via CSS transition.
//   When `isActive` transitions false → true the glow fades in and breathing begins.
//   No JS timers involved — pure CSS state-driven.
//
// Reduced motion:
//   The pulsing breathing animation is replaced with a static border highlight.
//   The glow still appears to indicate active turn; it simply doesn't animate.
//
// Re-render guard:
//   Component is memoized. Only re-renders when `isActive` or `color` changes.
//   Parent should derive these from stable useMemo selectors.

'use client';

import React, { useMemo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface TurnGlowProps {
  /** Whether this seat belongs to the currently active player */
  isActive: boolean;
  /** Seat color — matches the PlayerSeat color for this player index */
  color: string;
  children: React.ReactNode;
  className?: string;
}

export const TurnGlow = React.memo(function TurnGlow({
  isActive,
  color,
  children,
  className,
}: TurnGlowProps) {
  const reduced = useReducedMotion();

  const outerStyle = useMemo<React.CSSProperties>(() => {
    if (!isActive) {
      return {
        borderRadius: '0.75rem',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
        boxShadow: 'none',
      };
    }

    if (reduced) {
      // Static highlight — no animation
      return {
        borderRadius: '0.75rem',
        boxShadow: `0 0 0 2px ${color}, 0 0 12px ${color}66`,
        transition: 'box-shadow 0.3s ease',
      };
    }

    return {
      borderRadius: '0.75rem',
      boxShadow: `0 0 18px ${color}88, 0 0 6px ${color}`,
      animation: `turn-glow-breathe-${color.replace('#', '')} 1.8s ease-in-out infinite`,
      transition: 'box-shadow 0.3s ease',
    };
  }, [isActive, color, reduced]);

  const keyframeId = color.replace('#', '');

  return (
    <>
      {isActive && !reduced && (
        <style>{`
          @keyframes turn-glow-breathe-${keyframeId} {
            0%, 100% {
              box-shadow: 0 0 10px ${color}55, 0 0 4px ${color};
            }
            50% {
              box-shadow: 0 0 22px ${color}bb, 0 0 8px ${color},
                          inset 0 0 8px ${color}22;
            }
          }
        `}</style>
      )}
      <div
        className={className}
        style={outerStyle}
        aria-label={isActive ? 'Active player' : undefined}
      >
        {children}
      </div>
    </>
  );
});

TurnGlow.displayName = 'TurnGlow';