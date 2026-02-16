"use client";

import { useState } from "react";
import "@/styles/cards.css";

export interface CardData {
    id: string;
    rank: string;
    suit: "♠" | "♥" | "♦" | "♣";
}

const SUIT_COLORS: Record<string, string> = {
    "♠": "#e555c7",
    "♥": "#ff5577",
    "♦": "#55aaff",
    "♣": "#55ffaa",
};

interface HandCardsProps {
    cards: CardData[];
    onSelect?: (card: CardData) => void;
}

export function HandCards({ cards, onSelect }: HandCardsProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const total = cards.length;
    const maxFan = 4; // max rotation per side in degrees
    const step = total > 1 ? (maxFan * 2) / (total - 1) : 0;

    function handleClick(card: CardData) {
        const next = selectedId === card.id ? null : card.id;
        setSelectedId(next);
        if (next && onSelect) onSelect(card);
        console.log("[HandCards] selected:", next ? card : "none");
    }

    return (
        <div className="hand-cards" role="list" aria-label="Your hand">
            {cards.map((card, i) => {
                const rotation = total > 1 ? -maxFan + step * i : 0;
                const color = SUIT_COLORS[card.suit] ?? "#e555c7";
                const isSelected = selectedId === card.id;

                return (
                    <button
                        key={card.id}
                        type="button"
                        role="listitem"
                        className={`hand-cards__card glowing-card--interactive${isSelected ? " hand-cards__card--selected" : ""
                            }`}
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            zIndex: isSelected ? 10 : i,
                        } as React.CSSProperties}
                        onClick={() => handleClick(card)}
                        aria-label={`${card.rank} of ${card.suit}`}
                        data-selected={isSelected}
                    >
                        <div
                            className="glowing-card"
                            style={
                                {
                                    "--gc-color": color,
                                } as React.CSSProperties
                            }
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
                    </button>
                );
            })}
        </div>
    );
}
