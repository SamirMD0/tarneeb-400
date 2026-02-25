'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/hooks/useAppState';
import { EmptyState } from '@/components/feedback/EmptyState';
import '@/styles/cards.css';

const SUIT_ICONS = ['♠', '♥', '♦', '♣'] as const;

export function RoomList() {
  const router = useRouter();
  const { dispatchers, room } = useAppState();

  // Navigate once a join succeeds and roomId is populated
  useEffect(() => {
    if (room.roomId) {
      router.push(`/room/${room.roomId}`);
    }
  }, [room.roomId, router]);

  // Derive visible rooms from the live room snapshot.
  // TODO: wire to a REST GET /rooms endpoint when the backend exposes it.
  const rooms = room.room
    ? [
        {
          id: room.room.id,
          name: `Room ${room.room.id.slice(0, 6).toUpperCase()}`,
          players: room.room.players.length,
          maxPlayers: room.room.config.maxPlayers,
          status: room.room.hasGame ? ('in-progress' as const) : ('waiting' as const),
        },
      ]
    : [];

  function handleJoin(roomId: string) {
    dispatchers.room.joinRoom(roomId);
  }

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
          {rooms.length} room{rooms.length !== 1 ? 's' : ''}
        </span>
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          title="No rooms available"
          description="Be the first to create a room and invite others."
          suit="♠"
          actionLabel="Create a Room"
          onAction={() => {
            // Scroll to the create form — it lives in the same page column
            document.getElementById('create-username')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {rooms.map((r, i) => (
            <li key={r.id}>
              <div className="glow-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className="text-base shrink-0"
                      style={{
                        color: r.status === 'waiting' ? '#55ffaa' : '#ffaa33',
                        filter: `drop-shadow(0 0 6px ${
                          r.status === 'waiting' ? '#55ffaa' : '#ffaa33'
                        })`,
                      }}
                    >
                      {SUIT_ICONS[i % SUIT_ICONS.length]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-50">
                        {r.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.players} / {r.maxPlayers} players
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`glow-badge ${
                        r.status === 'waiting'
                          ? 'glow-badge--waiting'
                          : 'glow-badge--progress'
                      }`}
                    >
                      {r.status === 'waiting' ? 'Waiting' : 'In Progress'}
                    </span>

                    <button
                      type="button"
                      disabled={r.status === 'in-progress' || room.isLoading}
                      aria-label={`Join room ${r.name}`}
                      className="glow-btn glow-btn--primary glow-btn--sm"
                      onClick={() => handleJoin(r.id)}
                    >
                      {room.isLoading ? '…' : 'Join'}
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