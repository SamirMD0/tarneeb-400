import "@/styles/cards.css";

type GamePhase = "waiting" | "starting" | "in-progress";

const MOCK_STATUS = {
  phase: "waiting" as GamePhase,
  round: null as number | null,
  trick: null as number | null,
  trump: null as string | null,
};

const PHASE_CONFIG: Record<
  GamePhase,
  { label: string; description: string; color: string; suit: string }
> = {
  waiting: {
    label: "Waiting",
    description: "Waiting for all players to join and ready up.",
    color: "#55ffaa",
    suit: "♦",
  },
  starting: {
    label: "Starting",
    description: "Game is about to begin. Get ready!",
    color: "#ffaa33",
    suit: "♥",
  },
  "in-progress": {
    label: "In Progress",
    description: "Game is underway.",
    color: "#e555c7",
    suit: "♠",
  },
};

export function RoomStatus() {
  const config = PHASE_CONFIG[MOCK_STATUS.phase];

  return (
    <section aria-labelledby="status-heading" className="glow-panel p-5 relative">
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.color}55, transparent)`,
        }}
        aria-hidden="true"
      />

      <h2
        id="status-heading"
        className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          style={{
            color: config.color,
            filter: `drop-shadow(0 0 5px ${config.color})`,
          }}
        >
          {config.suit}
        </span>
        Game Status
      </h2>

      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl"
          style={{
            background: `rgba(${hexToRgb(config.color)}, 0.08)`,
            border: `1px solid rgba(${hexToRgb(config.color)}, 0.22)`,
            color: config.color,
            filter: `drop-shadow(0 0 8px ${config.color})`,
          }}
          aria-hidden="true"
        >
          {config.suit}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`glow-badge ${MOCK_STATUS.phase === "waiting"
                  ? "glow-badge--waiting"
                  : "glow-badge--progress"
                }`}
            >
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{config.description}</p>
        </div>
      </div>

      {MOCK_STATUS.phase === "in-progress" && (
        <>
          <div className="glow-divider" />
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Round", value: MOCK_STATUS.round ?? "—" },
              { label: "Trick", value: MOCK_STATUS.trick ?? "—" },
              { label: "Trump", value: MOCK_STATUS.trump ?? "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-md p-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <dt className="text-xs text-slate-500 uppercase tracking-wider">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm font-bold text-slate-50">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}