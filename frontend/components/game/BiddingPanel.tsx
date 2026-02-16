"use client";

import { useState } from "react";
import "@/styles/cards.css";

interface BiddingPanelProps {
    /** The current highest bid value, or null if no bids yet. */
    currentBid: number | null;
    /** Username of the current highest bidder. */
    currentBidder: string | null;
    /** Whether it is the local player's turn to bid. */
    isMyTurn: boolean;
}

const BID_VALUES = [7, 8, 9, 10, 11, 12, 13] as const;

export function BiddingPanel({
    currentBid,
    currentBidder,
    isMyTurn,
}: BiddingPanelProps) {
    const [selectedBid, setSelectedBid] = useState<number | null>(null);

    const minBid = currentBid ? currentBid + 1 : 7;

    function handleBid() {
        if (!selectedBid) return;
        console.log("[BiddingPanel] bid:", selectedBid);
        setSelectedBid(null);
    }

    function handlePass() {
        console.log("[BiddingPanel] pass");
        setSelectedBid(null);
    }

    return (
        <section aria-labelledby="bidding-heading" className="glow-panel p-5 relative">
            {/* Top shimmer */}
            <div
                className="absolute top-0 left-6 right-6 h-px"
                style={{
                    background:
                        "linear-gradient(90deg, transparent, rgba(229,85,199,0.4), transparent)",
                }}
                aria-hidden="true"
            />

            <h2
                id="bidding-heading"
                className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2"
            >
                <span
                    aria-hidden="true"
                    style={{ color: "#e555c7", filter: "drop-shadow(0 0 5px #e555c7)" }}
                >
                    ♠
                </span>
                Bidding
            </h2>

            {/* Current bid info */}
            {currentBid !== null && currentBidder && (
                <div
                    className="mb-4 rounded-lg px-3 py-2"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <p className="text-xs text-slate-500">
                        Highest bid:{" "}
                        <span className="font-bold text-slate-50">{currentBid}</span>
                        {" by "}
                        <span className="font-semibold text-slate-300">{currentBidder}</span>
                    </p>
                </div>
            )}

            {/* Bid value chips */}
            <div className="bid-values mb-4">
                {BID_VALUES.map((val) => {
                    const isDisabled = !isMyTurn || val < minBid;
                    return (
                        <button
                            key={val}
                            type="button"
                            className={`bid-chip${selectedBid === val ? " bid-chip--selected" : ""}`}
                            disabled={isDisabled}
                            onClick={() => setSelectedBid(val)}
                            aria-pressed={selectedBid === val}
                        >
                            {val}
                        </button>
                    );
                })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                <button
                    type="button"
                    className="glow-btn glow-btn--primary flex-1"
                    disabled={!isMyTurn || !selectedBid}
                    onClick={handleBid}
                >
                    Bid {selectedBid ?? ""}
                </button>
                <button
                    type="button"
                    className="glow-btn glow-btn--secondary flex-1"
                    disabled={!isMyTurn}
                    onClick={handlePass}
                >
                    Pass
                </button>
            </div>

            {!isMyTurn && (
                <p className="mt-3 text-center text-xs text-slate-600">
                    Waiting for other players to bid…
                </p>
            )}
        </section>
    );
}
