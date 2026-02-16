import Container from './Container';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto py-6"
      style={{
        background: 'linear-gradient(180deg, rgba(7,8,15,0) 0%, rgba(7,8,15,0.8) 100%)',
        borderTop: '1px solid rgba(229,85,199,0.1)',
      }}
    >
      <Container>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {(['♠', '♥', '♦', '♣'] as const).map((suit, i) => (
              <span
                key={suit}
                aria-hidden="true"
                className="text-xs"
                style={{
                  color: ['#e555c7', '#ff5577', '#55aaff', '#55ffaa'][i],
                  filter: `drop-shadow(0 0 4px ${['#e555c7','#ff5577','#55aaff','#55ffaa'][i]})`,
                  opacity: 0.6,
                }}
              >
                {suit}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            &copy; {year} Tarneeb 400. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}