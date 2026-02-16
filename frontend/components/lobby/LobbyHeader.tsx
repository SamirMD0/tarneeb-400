import "@/styles/cards.css";

export function LobbyHeader() {
  return (
    <div className="relative">
      {/* Decorative background cards */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-4 right-0 hidden lg:flex gap-4 opacity-30 select-none"
      >
        {(
          [
            { rank: "A", symbol: "♠", color: "#e555c7" },
            { rank: "K", symbol: "♥", color: "#55aaff" },
            { rank: "Q", symbol: "♦", color: "#55ffaa" },
          ] as const
        ).map(({ rank, symbol, color }) => (
          <div
            key={rank}
            className="glowing-card"
            style={
              {
                "--gc-color": color,
                "--gc-blur": "1.5rem",
                "--gc-box-blur": "0.75rem",
                "--gc-width": "5.5rem",
                "--gc-height": "7.5rem",
              } as React.CSSProperties
            }
          >
            <div className="glowing-card__corner">
              <span className="glowing-card__rank">{rank}</span>
              <span className="glowing-card__suit-small">{symbol}</span>
            </div>
            <span className="glowing-card__suit-center">{symbol}</span>
            <div
              className="glowing-card__corner glowing-card__corner--bottom"
              aria-hidden="true"
            >
              <span className="glowing-card__rank">{rank}</span>
              <span className="glowing-card__suit-small">{symbol}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-pink-400/70">
          Tarneeb · 400
        </p>
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{
            background: "linear-gradient(90deg, #e555c7 0%, #55aaff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Lobby
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Create a new room or enter a room code to join an existing game.
        </p>
      </div>

      <div className="glow-divider mt-6" />
    </div>
  );
}