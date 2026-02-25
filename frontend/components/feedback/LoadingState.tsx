// Frontend/components/feedback/LoadingState.tsx
// Named loading boundaries for every async boundary in the app.
// Wraps LoadingBird and applies a GlowingCard-style surface for prominent states.
// Presentation-only — no socket logic, no hooks.

import LoadingBird from '@/ui/LoadingBird';

export type LoadingVariant =
  | 'socket-connecting'   // App boot: socket not yet connected
  | 'room-hydrating'      // Joined room, waiting for first room_state snapshot
  | 'game-hydrating'      // Game started, waiting for first game snapshot
  | 'action-pending'      // Bid / play_card / set_trump emit in flight
  | 'join-pending'        // create_room or join_room emit in flight
  | 'reconnecting';       // Socket disconnected, automatic reconnect in progress

interface LoadingStateProps {
  variant: LoadingVariant;
  /** Override the default label for the variant */
  label?: string;
  /** Show as a full-page overlay (default: false — inline block) */
  fullPage?: boolean;
}

const VARIANT_LABELS: Record<LoadingVariant, string> = {
  'socket-connecting': 'Connecting…',
  'room-hydrating':    'Loading room…',
  'game-hydrating':    'Loading game…',
  'action-pending':    'Sending…',
  'join-pending':      'Joining…',
  'reconnecting':      'Reconnecting…',
};

export function LoadingState({ variant, label, fullPage = false }: LoadingStateProps) {
  const resolvedLabel = label ?? VARIANT_LABELS[variant];

  const inner = (
    <div
      className="flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
      aria-label={resolvedLabel}
    >
      <LoadingBird />
      <p
        className="text-sm font-semibold tracking-wide"
        style={{ color: 'rgba(229,85,199,0.8)', textShadow: '0 0 10px rgba(229,85,199,0.4)' }}
      >
        {resolvedLabel}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        {inner}
      </div>
    );
  }

  return (
    <div
      className="glow-panel flex items-center justify-center p-8"
      style={{ minHeight: '12rem' }}
    >
      {inner}
    </div>
  );
}