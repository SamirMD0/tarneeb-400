'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppState } from '@/hooks/useAppState';
import { RoomHeader } from '@/components/room/RoomHeader';
import { PlayerRoster } from '@/components/room/PlayerRoster';
import { RoomStatus } from '@/components/room/RoomStatus';
import { RoomActions } from '@/components/room/RoomActions';
import { GameBoard } from '@/components/game/GameBoard';
import '@/styles/cards.css';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { dispatchers, room, game, connection } = useAppState();

  // Emit join_room when connected and not yet in a room
  useEffect(() => {
    if (connection.isConnected && !room.roomId) {
      dispatchers.room.joinRoom(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.isConnected, id]);

  // Leave room on unmount (route navigation away)
  // Uses empty dep array intentionally — leaveRoom is stable (useCallback over socket singleton)
  useEffect(() => {
    return () => {
      dispatchers.room.leaveRoom();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (!connection.isConnected) {
    return (
      <main className="lobby-bg flex min-h-screen items-center justify-center">
        <div className="glow-panel px-8 py-10 text-center max-w-sm">
          <span
            className="text-3xl"
            aria-hidden="true"
            style={{ filter: 'drop-shadow(0 0 10px #e555c7)', opacity: 0.6 }}
          >
            ♠
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-50">
            {connection.isConnecting ? 'Connecting…' : 'Disconnected'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {connection.reconnectAttempt > 0
              ? `Reconnect attempt ${connection.reconnectAttempt}…`
              : 'Waiting for connection.'}
          </p>
        </div>
      </main>
    );
  }

  if (room.error) {
    return (
      <main className="lobby-bg flex min-h-screen items-center justify-center">
        <div className="glow-panel px-8 py-10 text-center max-w-sm">
          <p className="text-sm font-semibold text-red-400">{room.error.message}</p>
          <button
            type="button"
            className="glow-btn glow-btn--secondary mt-6"
            onClick={() => router.push('/lobby')}
          >
            Back to Lobby
          </button>
        </div>
      </main>
    );
  }

  if (room.isLoading || !room.room) {
    return (
      <main className="lobby-bg flex min-h-screen items-center justify-center">
        <div className="glow-panel px-8 py-10 text-center max-w-sm">
          <span
            className="text-3xl"
            aria-hidden="true"
            style={{ filter: 'drop-shadow(0 0 10px #e555c7)', opacity: 0.6 }}
          >
            ♠
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-50">
            Joining room…
          </p>
        </div>
      </main>
    );
  }

  const gameIsActive = game.derived.readiness.gameIsActive;

  return (
    <main className="lobby-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl flex flex-col gap-6">
        <RoomHeader roomId={id} room={room.room} />

        {gameIsActive ? (
          // ── Active game — show full board ───────────────────────────────────
          <GameBoard />
        ) : (
          // ── Waiting room — show roster + actions ────────────────────────────
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <RoomStatus room={room.room} derived={game.derived} />
              <PlayerRoster room={room.room} />
            </div>
            <div>
              <RoomActions />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}