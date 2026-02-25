// Frontend/components/feedback/RetryPanel.tsx
// Shown for recoverable failures where a user action can re-trigger the operation.
// Uses GlowingCard-style surface. Presentation-only — no socket logic.
//
// Typical usages:
//   - Room join failed (ROOM_NOT_FOUND, ROOM_FULL) → retry with different code
//   - Game action rejected (INVALID_ACTION) → user can re-attempt
//   - Snapshot never arrived after reconnect timeout → manual rejoin

interface RetryPanelProps {
  title: string;
  description?: string;
  /** Label for the primary retry CTA */
  retryLabel?: string;
  /** Called when the user clicks retry */
  onRetry: () => void;
  /** Optional secondary action (e.g. "Leave Room") */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Indicate that the retry is currently in progress */
  isRetrying?: boolean;
}

export function RetryPanel({
  title,
  description,
  retryLabel = 'Try Again',
  onRetry,
  secondaryLabel,
  onSecondary,
  isRetrying = false,
}: RetryPanelProps) {
  return (
    <div
      className="glow-panel p-6 flex flex-col items-center gap-5 text-center relative"
      role="alert"
      aria-live="polite"
    >
      {/* Top shimmer */}
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,170,51,0.45), transparent)',
        }}
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-lg text-xl"
        style={{
          background: 'rgba(255,170,51,0.08)',
          border: '1px solid rgba(255,170,51,0.25)',
          color: '#ffaa33',
          filter: 'drop-shadow(0 0 8px #ffaa33)',
        }}
        aria-hidden="true"
      >
        ⚠
      </div>

      {/* Text */}
      <div>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="glow-btn glow-btn--primary"
          style={{
            background: 'linear-gradient(135deg, #9a6600 0%, #6b4400 100%)',
            borderColor: 'rgba(255,170,51,0.45)',
            color: '#ffaa33',
            boxShadow: '0 0 14px rgba(255,170,51,0.3)',
          }}
        >
          {isRetrying ? 'Retrying…' : retryLabel}
        </button>

        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            disabled={isRetrying}
            className="glow-btn"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b',
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}