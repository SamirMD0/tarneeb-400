import type { SerializedRoom, LobbyPlayer } from '@/types/room.types';
import '@/styles/cards.css';

interface PlayerRosterProps {
  room: SerializedRoom;
}

const SUIT_COLORS: Record<number, string> = {
  0: '#e555c7',
  1: '#55aaff',
  2: '#55ffaa',
  3: '#ffaa33',
};

const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'] as const;

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function PlayerRoster({ room }: PlayerRosterProps) {
  // Pad to maxPlayers slots with nulls for empty seats
  const maxPlayers = room.config.maxPlayers;
  const slots: (LobbyPlayer | null)[] = Array.from({ length: maxPlayers }, (_, i) =>
    room.players[i] ?? null,
  );

  return (
    <section aria-labelledby="roster-heading" className="glow-panel p-5 relative">
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(229,85,199,0.35), transparent)',
        }}
        aria-hidden="true"
      />

      <h2
        id="roster-heading"
        className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          style={{ color: '#e555c7', filter: 'drop-shadow(0 0 5px #e555c7)' }}
        >
          ♣
        </span>
        Players
        <span className="text-xs text-slate-600 font-normal">
          ({room.players.length} / {maxPlayers})
        </span>
      </h2>

      <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((player, i) => (
          <li key={player?.id ?? `empty-${i}`}>
            <div
              className="rounded-lg p-3 flex items-center gap-3 transition-all"
              style={{
                background: player
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(255,255,255,0.015)',
                border: player
                  ? `1px solid rgba(${hexToRgb(SUIT_COLORS[i])}, 0.2)`
                  : '1px dashed rgba(255,255,255,0.07)',
              }}
            >
              {/* Avatar / empty seat */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base"
                style={
                  player
                    ? {
                        background: `rgba(${hexToRgb(SUIT_COLORS[i])}, 0.1)`,
                        border: `1px solid rgba(${hexToRgb(SUIT_COLORS[i])}, 0.25)`,
                        color: SUIT_COLORS[i],
                        filter: `drop-shadow(0 0 5px ${SUIT_COLORS[i]})`,
                      }
                    : {
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px dashed rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.15)',
                      }
                }
                aria-hidden="true"
              >
                {player ? SUIT_SYMBOLS[i] : '·'}
              </div>

              <div className="min-w-0 flex-1">
                {player ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-50 truncate">
                        {player.name}
                      </p>
                    </div>
                    <p
                      className="text-xs mt-0.5"
                      style={
                        player.isConnected
                          ? { color: '#55ffaa', textShadow: '0 0 6px #55ffaa' }
                          : { color: '#475569' }
                      }
                    >
                      {player.isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-600 italic">Empty seat</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}