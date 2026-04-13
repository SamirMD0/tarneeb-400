import "@/styles/cards.css";

export interface TrickCard {
  id: string;
  rank: string;
  suit: "♠" | "♥" | "♦" | "♣";
  playedBy: string;
  playerName?: string;   // NEW: display name for the slot label
  isWinner?: boolean;
}

const SUIT_COLORS: Record<string, string> = {
  "♠": "#e555c7",
  "♥": "#ff5577",
  "♦": "#55aaff",
  "♣": "#55ffaa",
};

const POSITIONS = ["n", "e", "s", "w"] as const;

// Direction labels shown under each slot
const POSITION_LABELS: Record<string, string> = {
  n: 'Opponent',
  e: 'Right',
  s: 'You',
  w: 'Left',
};

interface TrickAreaProps {
  cards: (TrickCard | null)[];
}

export function TrickArea({ cards }: TrickAreaProps) {
  const slots = [0, 1, 2, 3].map((i) => cards[i] ?? null);

  return (
    <div className="trick-area" aria-label="Current trick">
      {slots.map((card, i) => {
        const pos = POSITIONS[i];

        return (
          <div
            key={pos}
            className={[
              'trick-area__slot',
              `trick-area__slot--${pos}`,
              card?.isWinner ? 'trick-area__winner' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Player name label */}
            {card?.playerName && (
              <span className="trick-area__player-label" aria-hidden="true">
                {card.playerName}
              </span>
            )}

            {card ? (
              <div
                className="glowing-card"
                style={{
                  '--gc-color':    SUIT_COLORS[card.suit] ?? '#e555c7',
                  '--gc-blur':     '1rem',
                  '--gc-box-blur': '0.6rem',
                  '--gc-width':    'var(--trick-card-w, 5rem)',
                  '--gc-height':   'var(--trick-card-h, 7rem)',
                } as React.CSSProperties}
                aria-label={`${card.rank} of ${card.suit}${card.playerName ? ` played by ${card.playerName}` : ''}`}
              >
                <div className="glowing-card__corner">
                  <span className="glowing-card__rank">{card.rank}</span>
                  <span className="glowing-card__suit-small">{card.suit}</span>
                </div>
                <span className="glowing-card__suit-center">{card.suit}</span>
                <div className="glowing-card__corner glowing-card__corner--bottom" aria-hidden="true">
                  <span className="glowing-card__rank">{card.rank}</span>
                  <span className="glowing-card__suit-small">{card.suit}</span>
                </div>
              </div>
            ) : (
              <div
                className="trick-area__ghost"
                aria-hidden="true"
                style={{
                  '--gc-width':  'var(--trick-card-w, 5rem)',
                  '--gc-height': 'var(--trick-card-h, 7rem)',
                } as React.CSSProperties}
              >
                <span className="trick-area__ghost-label">{POSITION_LABELS[pos] ?? ''}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
