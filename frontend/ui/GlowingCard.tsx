import '@/styles/cards.css';

interface GlowingCardProps {
  rank?: string;
  suit?: string;
  suitSymbol?: string;
  color?: string;
  width?: string;
  height?: string;
  blur?: string;
  className?: string;
  onClick?: () => void;
}

export default function GlowingCard({
  rank = 'A',
  suit = 'Spades',
  suitSymbol = '♠',
  color = '#e555c7',
  width = '9rem',
  height = '13rem',
  blur = '1.75rem',
  className = '',
  onClick,
}: GlowingCardProps) {
  const cssVars = {
    '--gc-color':    color,
    '--gc-blur':     blur,
    '--gc-box-blur': `calc(0.5 * ${blur})`,
    '--gc-width':    width,
    '--gc-height':   height,
  } as Record<string, string>;

  const cardClass = [
    'glowing-card',
    onClick ? 'glowing-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      <div className="glowing-card__corner">
        <span className="glowing-card__rank">{rank}</span>
        <span className="glowing-card__suit-small" aria-hidden="true">{suitSymbol}</span>
      </div>

      <span className="glowing-card__suit-center" aria-hidden="true">
        {suitSymbol}
      </span>

      <div className="glowing-card__corner glowing-card__corner--bottom" aria-hidden="true">
        <span className="glowing-card__rank">{rank}</span>
        <span className="glowing-card__suit-small">{suitSymbol}</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${rank} of ${suit}`}
        className={cardClass}
        style={cssVars}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      aria-label={`${rank} of ${suit}`}
      className={cardClass}
      style={cssVars}
    >
      {inner}
    </div>
  );
}