"use client";

import { useState } from "react";
import "@/styles/cards.css";

const SUITS = [
    { symbol: "♠" as const, label: "Spades", color: "#e555c7" },
    { symbol: "♥" as const, label: "Hearts", color: "#ff5577" },
    { symbol: "♦" as const, label: "Diamonds", color: "#55aaff" },
    { symbol: "♣" as const, label: "Clubs", color: "#55ffaa" },
];

interface TrumpSelectorProps {
    /** Whether the panel is active (bid winner is choosing trump). */
    isActive: boolean;
}

export function TrumpSelector({ isActive }: TrumpSelectorProps) {
    const [selected, setSelected] = useState<string | null>(null);

    function handleSelect(symbol: string) {
        setSelected(symbol);
        console.log("[TrumpSelector] trump:", symbol);
    }

    return (
        <section
            aria-labelledby="trump-heading"
            className="glow-panel p-5 relative"
        >
            {/* Top shimmer */}
            <div
                className="absolute top-0 left-6 right-6 h-px"
                style={{
                    background:
                        "linear-gradient(90deg, transparent, rgba(85,170,255,0.4), transparent)",
                }}
                aria-hidden="true"
            />

            <h2
                id="trump-heading"
                className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2"
            >
                <span
                    aria-hidden="true"
                    style={{ color: "#55aaff", filter: "drop-shadow(0 0 5px #55aaff)" }}
                >
                    ♦
                </span>
                Choose Trump
            </h2>

            <div className="trump-grid">
                {SUITS.map((s) => {
                    const isSelected = selected === s.symbol;
                    const isDimmed = !isActive || (selected !== null && !isSelected);

                    return (
                        <button
                            key={s.symbol}
                            type="button"
                            className={`trump-btn${isSelected ? " trump-btn--selected" : ""}${isDimmed ? " trump-btn--dimmed" : ""
                                }`}
                            style={{ "--trump-color": s.color } as React.CSSProperties}
                            disabled={!isActive}
                            onClick={() => handleSelect(s.symbol)}
                            aria-label={`Select ${s.label} as trump`}
                            aria-pressed={isSelected}
                        >
                            <span aria-hidden="true">{s.symbol}</span>
                            <span className="trump-btn__label">{s.label}</span>
                        </button>
                    );
                })}
            </div>

            {!isActive && (
                <p className="mt-3 text-center text-xs text-slate-600">
                    Trump selection is not active.
                </p>
            )}

            {isActive && selected && (
                <div className="mt-4 flex justify-center">
                    <button
                        type="button"
                        className="glow-btn glow-btn--primary"
                        onClick={() =>
                            console.log("[TrumpSelector] confirm trump:", selected)
                        }
                    >
                        Confirm{" "}
                        {SUITS.find((s) => s.symbol === selected)?.label ?? selected}
                    </button>
                </div>
            )}
        </section>
    );
}
