import "@/styles/cards.css";

interface RoomHeaderProps {
  roomId: string;
}

export function RoomHeader({ roomId }: RoomHeaderProps) {
  return (
    <div className="relative">
      <div
        className="glow-panel px-6 py-5 flex items-center justify-between"
      >
        {/* Top shimmer */}
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(229,85,199,0.45), transparent)",
          }}
          aria-hidden="true"
        />

        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="text-xl leading-none"
            style={{ filter: "drop-shadow(0 0 8px #e555c7)" }}
          >
            ♠
          </span>
          <div>
            <h1
              className="text-lg font-bold tracking-tight"
              style={{
                background: "linear-gradient(90deg, #e555c7 0%, #55aaff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Room
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest mt-0.5">
              #{roomId.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="glow-badge glow-badge--waiting text-xs"
            aria-label="Room status: waiting for players"
          >
            Waiting
          </span>
        </div>
      </div>
    </div>
  );
}