import "@/styles/cards.css";
import { useAppState } from '@/hooks/useAppState';

const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"] as const;

const SEAT_COLORS: Record<number, string> = {
    0: "#e555c7",
    1: "#55aaff",
    2: "#55ffaa",
    3: "#ffaa33",
};

export interface PlayerSeatData {
    id: string;
    username: string | null;
    tricksWon: number;
    score: number;
    currentBid: number | undefined;
    isActive: boolean;
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

    return (
        <div
            className={`player-seat${player.isActive ? " player-seat--active" : ""}${isEmpty ? " player-seat--empty" : ""
                }`}
            style={{ "--seat-color": color } as React.CSSProperties}
            aria-label={
                isEmpty
                    ? "Empty seat"
                    : `${player.username}${player.isActive ? ", current turn" : ""}`
            }
        >
            <div className="player-seat__avatar" aria-hidden="true">
                {isEmpty ? "·" : suit}
            </div>

            <p className="player-seat__name">
                {isEmpty ? "Empty" : player.username}
            </p>

            {isEmpty && (
                <button
                    type="button"
                    onClick={() => dispatchers.room.addBot()}
                    className="pointer-events-auto mt-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-white/20"
                >
                    + Bot
                </button>
            )}

            {!isEmpty && (
                <div className="flex flex-col items-center">
                    <p className="player-seat__tricks">
                        {player.tricksWon} trick{player.tricksWon !== 1 ? "s" : ""}
                    </p>
                    <p className="text-[10px] text-white/70">
                        Score: {player.score}
                    </p>
                    {player.currentBid !== undefined && (
                        <p className="mt-0.5 text-xs font-bold text-yellow-300 drop-shadow-md">
                            {player.currentBid === 0 ? "Pass" : `Bid: ${player.currentBid}`}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
