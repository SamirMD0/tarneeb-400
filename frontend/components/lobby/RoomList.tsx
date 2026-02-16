"use client";

import "@/styles/cards.css";

type RoomPreview = {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: "waiting" | "in-progress";
};

const MOCK_ROOMS: RoomPreview[] = [
  { id: "room-1", name: "Friday Night Tarneeb", players: 2, maxPlayers: 4, status: "waiting" },
  { id: "room-2", name: "Quick 400",            players: 4, maxPlayers: 4, status: "in-progress" },
  { id: "room-3", name: "Beginners Welcome",    players: 1, maxPlayers: 4, status: "waiting" },
];

const SUIT_ICONS = ["♠", "♥", "♦", "♣"] as const;

export function RoomList() {
  return (
    <section aria-labelledby="room-list-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="room-list-heading"
          className="text-base font-semibold text-slate-50"
        >
          Available Rooms
        </h2>
        <span className="text-xs text-slate-600">
          {MOCK_ROOMS.length} room{MOCK_ROOMS.length !== 1 ? "s" : ""}
        </span>
      </div>

      {MOCK_ROOMS.length === 0 ? (
        <div className="glow-panel flex flex-col items-center justify-center px-6 py-14 text-center">
          <span
            className="text-4xl"
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 0 10px #e555c7)", opacity: 0.4 }}
          >
            ♠
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-50">
            No rooms available
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Be the first to create a room and invite others.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {MOCK_ROOMS.map((room, i) => (
            <li key={room.id}>
              <div className="glow-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className="text-base shrink-0"
                      style={{
                        color: room.status === "waiting" ? "#55ffaa" : "#ffaa33",
                        filter: `drop-shadow(0 0 6px ${room.status === "waiting" ? "#55ffaa" : "#ffaa33"})`,
                      }}
                    >
                      {SUIT_ICONS[i % SUIT_ICONS.length]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-50">
                        {room.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {room.players} / {room.maxPlayers} players
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`glow-badge ${
                        room.status === "waiting"
                          ? "glow-badge--waiting"
                          : "glow-badge--progress"
                      }`}
                    >
                      {room.status === "waiting" ? "Waiting" : "In Progress"}
                    </span>

                    <button
                      type="button"
                      disabled={room.status === "in-progress"}
                      aria-label={`Join room ${room.name}`}
                      className="glow-btn glow-btn--primary glow-btn--sm"
                      onClick={() =>
                        console.log("[RoomList] join room:", room.id)
                      }
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}