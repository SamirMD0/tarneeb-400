// Frontend/components/feedback/EmptyState.tsx
// Replaces the earlier placeholder. Aligns with the glow design system.
// Presentation-only — no socket logic, no hooks.
//
// Used for:
//   - No rooms available in RoomList
//   - No game history / no tricks yet
//   - Empty player roster slot (handled inline in PlayerRoster, not here)

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Suit symbol shown as the icon (defaults to ♠) */
  suit?: '♠' | '♥' | '♦' | '♣';
  /** Glow color for the suit icon */
  color?: string;
  /** Optional CTA */
  actionLabel?: string;
  onAction?: () => void;
}

const DEFAULT_SUIT_COLOR: Record<string, string> = {
  '♠': '#e555c7',
  '♥': '#ff5577',
  '♦': '#55aaff',
  '♣': '#55ffaa',
};

export function EmptyState({
  title,
  description,
  suit = '♠',
  color,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const resolvedColor = color ?? DEFAULT_SUIT_COLOR[suit] ?? '#e555c7';

  return (
    <div
      className="glow-panel flex flex-col items-center justify-center px-6 py-14 text-center"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="text-4xl"
        style={{
          color: resolvedColor,
          filter: `drop-shadow(0 0 10px ${resolvedColor})`,
          opacity: 0.4,
        }}
      >
        {suit}
      </span>

      <p className="mt-4 text-sm font-semibold text-slate-50">{title}</p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="glow-btn glow-btn--primary mt-6"
          style={{ width: 'auto', minWidth: '8rem' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}