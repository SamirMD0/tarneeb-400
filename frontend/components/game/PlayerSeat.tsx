import "@/styles/cards.css";
import { useAppState } from '@/hooks/useAppState';

const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"] as const;

const SEAT_COLORS: Record<number, string> = {
  0: "#e555c7",
  1: "#55aaff",
  2: "#55ffaa",
  3: "#ffaa33",
};

// Team accent colors for the top border band
const TEAM_COLORS: Record<1 | 2, string> = {
  1: "#e555c7",  // pink – team 1
  2: "#55aaff",  // blue – team 2
};

export interface PlayerSeatData {
  id: string;
  username: string | null;
  tricksWon: number;
  score: number;
  currentBid: number | undefined;
  isActive: boolean;
  isMe: boolean;
  teamId: 1 | 2;
  seatIndex: number;
}

interface PlayerSeatProps {
  player: PlayerSeatData;
}

export function PlayerSeat({ player }: PlayerSeatProps) {
  const { dispatchers } = useAppState();
  const color = SEAT_COLORS[player.seatIndex] ?? SEAT_COLORS[0];
  const suit = SUIT_SYMBOLS[player.seatIndex] ?? "♠";
  const isEmpty = !player.username;
  const teamColor = TEAM_COLORS[player.teamId];

  return (
    <div
      className={[
        'player-seat',
        player.isActive ? 'player-seat--active' : '',
        isEmpty       ? 'player-seat--empty'  : '',
        player.isMe   ? 'player-seat--me'     : '',
      ].filter(Boolean).join(' ')}
      style={{ '--seat-color': color, '--team-color': teamColor } as React.CSSProperties}
      aria-label={
        isEmpty
          ? 'Empty seat'
          : `${player.username}${player.isMe ? ', you' : ''}${player.isActive ? ', current turn' : ''}`
      }
    >
      {/* Team accent bar */}
      <div className="player-seat__team-bar" aria-hidden="true" />

      {/* Avatar */}
      <div className="player-seat__avatar" aria-hidden="true">
        {isEmpty ? '·' : suit}
      </div>

      {/* Name row */}
      <div className="player-seat__name-row">
        <p className="player-seat__name">
          {isEmpty ? 'Empty' : player.username}
        </p>
        {player.isMe && !isEmpty && (
          <span className="player-seat__you-badge" aria-label="This is you">YOU</span>
        )}
      </div>

      {/* Empty seat action */}
      {isEmpty && (
        <button
          type="button"
          onClick={() => dispatchers.room.addBot()}
          className="player-seat__add-bot"
          aria-label="Add a bot to this seat"
        >
          + Bot
        </button>
      )}

      {/* Active player stats */}
      {!isEmpty && (
        <div className="player-seat__stats">
          {/* Score — primary stat */}
          <div className="player-seat__score-block">
            <span className="player-seat__score-value">{player.score}</span>
            <span className="player-seat__score-label">pts</span>
          </div>

          {/* Divider */}
          <div className="player-seat__stat-div" aria-hidden="true" />

          {/* Tricks */}
          <div className="player-seat__tricks-block">
            <span className="player-seat__tricks-value">{player.tricksWon}</span>
            <span className="player-seat__tricks-label">tricks</span>
          </div>

          {/* Current bid */}
          {player.currentBid !== undefined && (
            <div className="player-seat__bid-badge" aria-label={`Bid: ${player.currentBid === 0 ? 'Pass' : player.currentBid}`}>
              {player.currentBid === 0 ? 'Pass' : `Bid ${player.currentBid}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
