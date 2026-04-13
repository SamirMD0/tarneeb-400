'use client';

import type { GamePhase } from '@/types/game.types';

interface GameStatusBarProps {
  phase: GamePhase | null;
  team1Score: number;
  team2Score: number;
  highestBid: number;
  bidsPlaced: number; // count of playerBids entries
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  DEALING:  { label: 'Dealing',  color: '#55aaff' },
  BIDDING:  { label: 'Bidding',  color: '#ffaa33' },
  PLAYING:  { label: 'Playing',  color: '#e555c7' },
  SCORING:  { label: 'Scoring',  color: '#55ffaa' },
  GAME_OVER:{ label: 'Game Over',color: '#ff5577' },
};

export function GameStatusBar({
  phase,
  team1Score,
  team2Score,
  highestBid,
  bidsPlaced,
}: GameStatusBarProps) {
  if (!phase) return null;
  const phaseInfo = PHASE_LABELS[phase] ?? { label: phase, color: '#94a3b8' };

  return (
    <div
      className="game-status-bar"
      role="status"
      aria-label="Game status"
    >
      {/* Phase pill */}
      <div className="game-status-bar__pill" style={{ '--pill-color': phaseInfo.color } as React.CSSProperties}>
        <span className="game-status-bar__dot" aria-hidden="true" />
        {phaseInfo.label}
      </div>

      {/* Trump */}
      <div className="game-status-bar__trump" aria-label="Trump suit: Hearts">
        <span className="game-status-bar__trump-label">Trump</span>
        <span className="game-status-bar__trump-suit">♥</span>
      </div>

      {/* Scores */}
      <div className="game-status-bar__scores">
        <span className="game-status-bar__team" aria-label={`Team 1 score: ${team1Score}`}>
          T1 <strong>{team1Score}</strong>
        </span>
        <span className="game-status-bar__sep" aria-hidden="true">vs</span>
        <span className="game-status-bar__team" aria-label={`Team 2 score: ${team2Score}`}>
          T2 <strong>{team2Score}</strong>
        </span>
      </div>

      {/* Bid info during bidding */}
      {phase === 'BIDDING' && (
        <div className="game-status-bar__bid-info" aria-label={`${bidsPlaced} of 4 players have bid`}>
          <span className="game-status-bar__bid-count">{bidsPlaced} / 4 bid</span>
          {highestBid > 0 && (
            <span className="game-status-bar__high-bid">High: {highestBid}</span>
          )}
        </div>
      )}

      {/* Win target reminder */}
      <div className="game-status-bar__target" aria-label="Win at 41 points">
        <span>Win @ 41</span>
      </div>
    </div>
  );
}
