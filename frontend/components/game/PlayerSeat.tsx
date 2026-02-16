import "@/styles/cards.css";

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
    isActive: boolean;
    seatIndex: number;
}

interface PlayerSeatProps {
    player: PlayerSeatData;
}

export function PlayerSeat({ player }: PlayerSeatProps) {
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

            {!isEmpty && (
                <p className="player-seat__tricks">
                    {player.tricksWon} trick{player.tricksWon !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}
