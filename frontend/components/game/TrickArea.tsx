import "@/styles/cards.css";

export interface TrickCard {
    id: string;
    rank: string;
    suit: "♠" | "♥" | "♦" | "♣";
    playedBy: string;
    isWinner?: boolean;
}

const SUIT_COLORS: Record<string, string> = {
    "♠": "#e555c7",
    "♥": "#ff5577",
    "♦": "#55aaff",
    "♣": "#55ffaa",
};

/** Compass position label for each slot index. */
const POSITIONS = ["n", "e", "s", "w"] as const;

interface TrickAreaProps {
    /** Up to 4 cards in the current trick, ordered by seat index (top, right, bottom, left). */
    cards: (TrickCard | null)[];
}

export function TrickArea({ cards }: TrickAreaProps) {
    /** Pad to 4 slots. */
    const slots = [0, 1, 2, 3].map((i) => cards[i] ?? null);

    return (
        <div className="trick-area" aria-label="Current trick">
            {slots.map((card, i) => {
                const pos = POSITIONS[i];

                if (!card) {
                    return (
                        <div
                            key={pos}
                            className={`trick-area__slot trick-area__slot--${pos}`}
                        >
                            <div
                                className="trick-area__ghost"
                                style={
                                    {
                                        "--gc-width": "4.5rem",
                                        "--gc-height": "6.5rem",
                                    } as React.CSSProperties
                                }
                                aria-hidden="true"
                            />
                        </div>
                    );
                }

                const color = SUIT_COLORS[card.suit] ?? "#e555c7";

                return (
                    <div
                        key={pos}
                        className={`trick-area__slot trick-area__slot--${pos}${card.isWinner ? " trick-area__winner" : ""
                            }`}
                    >
                        <div
                            className="glowing-card"
                            style={
                                {
                                    "--gc-color": color,
                                    "--gc-blur": "1rem",
                                    "--gc-box-blur": "0.6rem",
                                    "--gc-width": "4.5rem",
                                    "--gc-height": "6.5rem",
                                } as React.CSSProperties
                            }
                            aria-label={`${card.rank} of ${card.suit} played by ${card.playedBy}`}
                        >
                            <div className="glowing-card__corner">
                                <span className="glowing-card__rank">{card.rank}</span>
                                <span className="glowing-card__suit-small">{card.suit}</span>
                            </div>
                            <span className="glowing-card__suit-center">{card.suit}</span>
                            <div
                                className="glowing-card__corner glowing-card__corner--bottom"
                                aria-hidden="true"
                            >
                                <span className="glowing-card__rank">{card.rank}</span>
                                <span className="glowing-card__suit-small">{card.suit}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
