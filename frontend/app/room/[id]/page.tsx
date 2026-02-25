'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppState } from '@/hooks/useAppState';
import { RoomHeader } from '@/components/room/RoomHeader';
import { PlayerRoster } from '@/components/room/PlayerRoster';
import { RoomStatus } from '@/components/room/RoomStatus';
import { RoomActions } from '@/components/room/RoomActions';
import { GameBoard } from '@/components/game/GameBoard';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { RetryPanel } from '@/components/feedback/RetryPanel';
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
  useEffect(() => {
    return () => {
      dispatchers.room.leaveRoom();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!connection.isConnected) {
    return (
      <main className="lobby-bg flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <LoadingState
            variant={connection.isConnecting ? 'socket-connecting' : 'reconnecting'}
            label={
              connection.reconnectAttempt > 0
                ? `Reconnect attempt ${connection.reconnectAttempt}…`
                : connection.isConnecting
                  ? 'Connecting…'
                  : 'Disconnected from server'
            }
          />
        </div>
      </main>
    );
  }

  // ── Room join error ────────────────────────────────────────────────────────
  if (room.error) {
    return (
      <main className="lobby-bg flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <RetryPanel
            title="Couldn't join room"
            description={room.error.message}
            retryLabel="Try Again"
            onRetry={() => dispatchers.room.joinRoom(id)}
            secondaryLabel="Back to Lobby"
            onSecondary={() => router.push('/lobby')}
          />
        </div>
      </main>
    );
  }

  // ── Joining / hydrating ────────────────────────────────────────────────────
  if (room.isLoading || !room.room) {
    return (
      <main className="lobby-bg flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <LoadingState variant="room-hydrating" />
        </div>
      </main>
    );
  }

  const gameIsActive = game.derived.readiness.gameIsActive;

  return (
    <main className="lobby-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl flex flex-col gap-6">

        {/* Mid-session reconnect warning — inline, non-blocking */}
        {!connection.isConnected && (
          <ErrorBanner
            category="transport"
            message={
              connection.reconnectAttempt > 0
                ? `Reconnecting… (attempt ${connection.reconnectAttempt})`
                : 'Connection lost. Reconnecting…'
            }
          />
        )}

        <RoomHeader roomId={id} room={room.room} />

        {gameIsActive ? (
          <GameBoard />
        ) : (
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