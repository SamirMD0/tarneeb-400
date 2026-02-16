import '@/styles/cards.css';

import GlowingCard from '@/ui/GlowingCard';

const GLOW = 'rgba(191,123,255,0.781)';

const ACES = [
  { suit: 'Spades',   suitSymbol: '♠', delay: '0s',    rotate: 'rotate(-8deg)'  },
  { suit: 'Hearts',   suitSymbol: '♥', delay: '0.25s', rotate: 'rotate(-2deg)'  },
  { suit: 'Diamonds', suitSymbol: '♦', delay: '0.5s',  rotate: 'rotate(4deg)'   },
  { suit: 'Clubs',    suitSymbol: '♣', delay: '0.75s', rotate: 'rotate(10deg)'  },
] as const;

export default function FloatingAces() {
  return (
    <div className="floating-aces" aria-label="Tarneeb aces">
      {ACES.map(({ suit, suitSymbol, delay, rotate }) => (
        <div
          key={suit}
          className="floating-aces__card"
          style={
            {
              '--fa-rotate':       rotate,
              animationDelay:      delay,
            } as React.CSSProperties
          }
        >
          <GlowingCard
            rank="A"
            suit={suit}
            suitSymbol={suitSymbol}
            color={GLOW}
            width="clamp(5.5rem, 12vw, 9rem)"
            height="clamp(8rem, 17vw, 13rem)"
            blur="1.5rem"
          />
        </div>
      ))}
    </div>
  );
}