// Frontend/components/feedback/ErrorBanner.tsx
// Categorised error surfaces.
//
// Category → render surface:
//   transport  → Notification (transient, auto-dismisses after reconnect)
//   room       → Notification (transient, action errors)
//   game       → Notification (transient, action errors)
//   blocking   → GlowingCard-styled panel (non-dismissable until resolved)
//
// Presentation-only — no socket logic, no hooks.
// Receives pre-categorised error data from the parent component via useAppState.

import Notification from '@/ui/Notification';

export type ErrorCategory = 'transport' | 'room' | 'game' | 'blocking';

interface ErrorBannerProps {
  category: ErrorCategory;
  message: string;
  /** For blocking errors: an action code from the server (e.g. "ROOM_FULL") */
  code?: string;
  /** Callback for the dismiss button — not shown for blocking errors */
  onDismiss?: () => void;
}

// Maps server error codes to user-friendly messages
const ERROR_CODE_LABELS: Record<string, string> = {
  ROOM_FULL:          'This room is full.',
  ROOM_NOT_FOUND:     'Room not found. Check the code and try again.',
  NOT_IN_ROOM:        'You are not in a room.',
  GAME_NOT_STARTED:   'The game has not started yet.',
  INVALID_ACTION:     'That action is not allowed right now.',
  INVALID_PAYLOAD:    'Invalid request. Please try again.',
  NOT_YOUR_TURN:      'It is not your turn.',
};

function resolveMessage(message: string, code?: string): string {
  if (code && ERROR_CODE_LABELS[code]) return ERROR_CODE_LABELS[code];
  return message;
}

export function ErrorBanner({ category, message, code, onDismiss }: ErrorBannerProps) {
  const resolvedMessage = resolveMessage(message, code);

  // Blocking errors: render as a prominent GlowingCard-style panel
  if (category === 'blocking') {
    return (
      <div
        className="glow-panel p-6 flex flex-col items-center gap-4 text-center"
        role="alert"
        aria-live="assertive"
        style={{
          borderColor: 'rgba(255,85,119,0.4)',
          boxShadow: '0 0 24px rgba(255,85,119,0.15), inset 0 0 16px rgba(255,85,119,0.05)',
        }}
      >
        {/* Top shimmer in red */}
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,85,119,0.5), transparent)',
          }}
          aria-hidden="true"
        />

        <span
          aria-hidden="true"
          className="text-3xl"
          style={{ filter: 'drop-shadow(0 0 10px #ff5577)', color: '#ff5577' }}
        >
          ✕
        </span>
        <div>
          {code && (
            <p className="text-xs font-bold uppercase tracking-widest text-red-400/70 mb-1">
              {code}
            </p>
          )}
          <p className="text-sm font-semibold text-slate-200">{resolvedMessage}</p>
        </div>
      </div>
    );
  }

  // Transient errors: map category to Notification variant
  const notifVariant =
    category === 'transport' ? 'warning'
    : category === 'room'    ? 'error'
    :                          'error'; // game errors

  return (
    <div className="relative" role="alert" aria-live="assertive">
      <Notification variant={notifVariant} message={resolvedMessage} />
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}