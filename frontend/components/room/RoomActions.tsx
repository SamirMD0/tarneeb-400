'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/hooks/useAppState';
import '@/styles/cards.css';

export function RoomActions() {
  const router = useRouter();
  const { dispatchers, room } = useAppState();
  const [isReady, setIsReady] = useState(false);

  function handleToggleReady() {
    setIsReady((prev) => !prev);
    // ready_up is not yet in the socket contract — tracked as a local UI state.
    // When the backend adds a ready_up event, replace this with dispatchers.room.readyUp().
  }

  function handleStartGame() {
    dispatchers.room.startGame();
  }

  function handleLeave() {
    dispatchers.room.leaveRoom();
    router.push('/lobby');
  }

  // The host can start when all seats are filled (simple heuristic until backend exposes readiness)
  const allPlayersJoined =
    room.room !== null &&
    room.room.players.length >= room.room.config.maxPlayers;

  return (
    <section aria-labelledby="actions-heading" className="glow-panel p-5 relative">
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(85,170,255,0.4), transparent)',
        }}
        aria-hidden="true"
      />

      <h2
        id="actions-heading"
        className="text-sm font-semibold text-slate-50 mb-5 flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          style={{ color: '#55aaff', filter: 'drop-shadow(0 0 5px #55aaff)' }}
        >
          ♥
        </span>
        Actions
      </h2>

      <div className="flex flex-col gap-3">
        {/* Ready toggle */}
        <button
          type="button"
          onClick={handleToggleReady}
          className="glow-btn"
          style={
            isReady
              ? {
                  background: 'linear-gradient(135deg, #0d7a4a 0%, #065c37 100%)',
                  border: '1px solid rgba(85,255,170,0.4)',
                  color: '#55ffaa',
                  boxShadow: '0 0 14px rgba(85,255,170,0.3)',
                  width: '100%',
                }
              : {
                  background: 'linear-gradient(135deg, #c040aa 0%, #8833cc 100%)',
                  border: '1px solid rgba(229,85,199,0.45)',
                  color: '#fff',
                  boxShadow: '0 0 14px rgba(229,85,199,0.35)',
                  width: '100%',
                }
          }
          aria-pressed={isReady}
        >
          {isReady ? '✓ Ready' : 'Mark as Ready'}
        </button>

        {/* Start game (host action) */}
        <button
          type="button"
          onClick={handleStartGame}
          disabled={!allPlayersJoined}
          className="glow-btn glow-btn--secondary"
          title={
            allPlayersJoined
              ? 'Start the game'
              : 'Waiting for all players to join'
          }
        >
          Start Game
        </button>

        <div className="glow-divider" style={{ margin: '0.25rem 0' }} />

        {/* Leave room */}
        <button
          type="button"
          onClick={handleLeave}
          className="glow-btn"
          style={{
            background: 'rgba(255,85,119,0.07)',
            border: '1px solid rgba(255,85,119,0.22)',
            color: '#ff5577',
            width: '100%',
          }}
        >
          Leave Room
        </button>
      </div>

      {!isReady && (
        <p className="mt-4 text-center text-xs text-slate-600">
          Mark yourself ready when you're set to play.
        </p>
      )}
    </section>
  );
}