"use client";

import "@/styles/cards.css";
import { PlayerSeat, type PlayerSeatData } from "./PlayerSeat";
import { HandCards, type CardData } from "./HandCards";
import { TrickArea, type TrickCard } from "./TrickArea";
import { BiddingPanel } from "./BiddingPanel";
import { TrumpSelector } from "./TrumpSelector";

/* ─── Mock data ──────────────────────────────────────────────────────── */

type GamePhase = "bidding" | "trump-selection" | "playing";

const MOCK_PHASE: GamePhase = "playing";

const MOCK_PLAYERS: PlayerSeatData[] = [
    { id: "p1", username: "Ahmad", tricksWon: 2, isActive: false, seatIndex: 0 },
    { id: "p2", username: "Nour", tricksWon: 1, isActive: false, seatIndex: 1 },
    { id: "p3", username: "Layla", tricksWon: 0, isActive: true, seatIndex: 2 },
    { id: "p4", username: null, tricksWon: 0, isActive: false, seatIndex: 3 },
];

const MOCK_HAND: CardData[] = [
    { id: "c1", rank: "A", suit: "♠" },
    { id: "c2", rank: "K", suit: "♥" },
    { id: "c3", rank: "10", suit: "♦" },
    { id: "c4", rank: "7", suit: "♣" },
    { id: "c5", rank: "Q", suit: "♠" },
    { id: "c6", rank: "J", suit: "♥" },
    { id: "c7", rank: "9", suit: "♦" },
];

const MOCK_TRICK: (TrickCard | null)[] = [
    { id: "t1", rank: "K", suit: "♠", playedBy: "Ahmad", isWinner: true },
    { id: "t2", rank: "10", suit: "♠", playedBy: "Nour" },
    null,
    null,
];

/* ─── Component ──────────────────────────────────────────────────────── */

export function GameBoard() {
    const [top, right, bottom, left] = MOCK_PLAYERS;

    return (
        <div className="flex flex-col gap-6">
            {/* Table layout */}
            <div className="glow-panel p-4 relative overflow-visible">
                {/* Top shimmer */}
                <div
                    className="absolute top-0 left-6 right-6 h-px"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent, rgba(229,85,199,0.35), transparent)",
                    }}
                    aria-hidden="true"
                />

                <div className="game-table">
                    {/* Top seat (partner / opponent) */}
                    <div className="game-table__top">
                        <PlayerSeat player={top} />
                    </div>

                    {/* Left seat */}
                    <div className="game-table__left">
                        <PlayerSeat player={left} />
                    </div>

                    {/* Center – trick area */}
                    <div className="game-table__center">
                        <TrickArea cards={MOCK_TRICK} />
                    </div>

                    {/* Right seat */}
                    <div className="game-table__right">
                        <PlayerSeat player={right} />
                    </div>

                    {/* Bottom seat (current player) */}
                    <div className="game-table__bottom">
                        <PlayerSeat player={bottom} />
                    </div>
                </div>
            </div>

            {/* Current player's hand */}
            {MOCK_PHASE === "playing" && <HandCards cards={MOCK_HAND} />}

            {/* Bidding panel (shown during bidding phase) */}
            {MOCK_PHASE === "bidding" && (
                <BiddingPanel
                    currentBid={9}
                    currentBidder="Ahmad"
                    isMyTurn={true}
                />
            )}

            {/* Trump selector (shown after bid winner is decided) */}
            {MOCK_PHASE === "trump-selection" && (
                <TrumpSelector isActive={true} />
            )}
        </div>
    );
}
