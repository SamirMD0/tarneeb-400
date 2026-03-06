// Backend/src/game/engine.ts - Phase 15: GameEngine with roomId for persistence

import { GameState, createInitialGameState, PlayerState } from "./state.js";
import { GameAction } from "./actions.js";
import { applyAction } from "./reducer.js";
import { saveGame } from "../services/gameHistory.service.js";
import type { RoundSnapshot } from "../types/game.types.js";
import { logger } from "../lib/logger.js";
import { metrics } from "../lib/metrics.js";
import { withTimingSync } from "../monitoring/performance.js";

type GameListener = (state: GameState) => void;

export class GameEngine {
    private state: GameState;
    private readonly roomId: string;
    private readonly startedAt: Date;
    private listeners: GameListener[] = [];
    private rounds: RoundSnapshot[] = [];
    private currentRoundNumber = 1;
    private hasPersisted = false;

    constructor(playerIds: string[], roomId?: string) {
        this.state = createInitialGameState(playerIds);
        this.roomId = roomId ?? 'unknown';
        this.startedAt = new Date();
    }

    /**
     * Factory: Hydrate a GameEngine from a previously saved GameState
     * Validates shape before assigning to avoid corrupt engine state.
     */
    public static fromState(state: GameState, playerIds: string[], roomId: string): GameEngine {
        // Basic runtime validation of the serialized state
        const phases = new Set(['DEALING', 'BIDDING', 'PLAYING', 'SCORING', 'GAME_OVER']);
        if (!state || typeof state !== 'object') throw new Error('Invalid GameState: not an object');
        if (!Array.isArray(state.players) || state.players.length !== 4) throw new Error('Invalid GameState: players must be length 4');
        if (!state.teams || typeof state.teams !== 'object' || !state.teams[1] || !state.teams[2]) throw new Error('Invalid GameState: missing teams');
        if (!Array.isArray(state.deck) || !Array.isArray(state.trick)) throw new Error('Invalid GameState: deck/trick must be arrays');
        if (typeof state.currentPlayerIndex !== 'number' || state.currentPlayerIndex < 0 || state.currentPlayerIndex > 3) throw new Error('Invalid GameState: currentPlayerIndex');
        if (!phases.has(state.phase as any)) throw new Error('Invalid GameState: phase');

        // Ensure player IDs are present and match provided set
        const stateIds = state.players.map(p => p.id).sort();
        const inputIds = [...playerIds].sort();
        if (stateIds.length !== inputIds.length || !stateIds.every((v, i) => v === inputIds[i])) {
            throw new Error('Invalid GameState: player IDs do not match provided playerIds');
        }

        const engine = new GameEngine(playerIds, roomId);
        // Assign validated state safely inside class
        engine.state = state;
        return engine;
    }

    public getRoomId(): string {
        return this.roomId;
    }

    public getState(): Readonly<GameState> {
        return this.state;
    }

    public dispatch(action: GameAction): boolean {
        const prevState = this.state;

        // Phase 20: Measure reducer performance
        const { result: nextState } = withTimingSync(
            `reducer:${action.type}`,
            () => applyAction(this.state, action),
            {
                slowThresholdMs: 10,
                metricType: 'game_action'
            }
        );

        // If state reference changed, it means action was valid and applied
        if (nextState !== prevState) {
            this.state = nextState;
            this.notifyListeners();

            // Track round snapshots for history
            if (action.type === 'END_ROUND' && prevState.bidderId && prevState.highestBid && prevState.trumpSuit) {
                this.rounds.push({
                    roundNumber: this.currentRoundNumber++,
                    bidderId: prevState.bidderId,
                    bidValue: prevState.highestBid,
                    trumpSuit: prevState.trumpSuit,
                    tricksWon: {
                        team1: prevState.teams[1].tricksWon,
                        team2: prevState.teams[2].tricksWon,
                    },
                    scoreDeltas: {
                        team1: this.state.teams[1].score - prevState.teams[1].score,
                        team2: this.state.teams[2].score - prevState.teams[2].score,
                    },
                });
            }

            // Phase 15: Persist game when it ends
            if (this.isGameOver() && !this.hasPersisted && process.env.NODE_ENV !== 'test') {
                this.persistGame();
            }

            return true;
        }

        return false;
    }

    public getCurrentPlayer(): PlayerState {
        const player = this.state.players[this.state.currentPlayerIndex];
        if (!player) {
            throw new Error(`Invalid player index: ${this.state.currentPlayerIndex}`);
        }
        return player;
    }

    public isGameOver(): boolean {
        const { 1: team1, 2: team2 } = this.state.teams;
        return team1.score >= 41 || team2.score >= 41;
    }

    public getWinner(): 1 | 2 | undefined {
        if (!this.isGameOver()) return undefined;

        const { 1: team1, 2: team2 } = this.state.teams;

        if (team1.score > team2.score) return 1;
        if (team2.score > team1.score) return 2;

        // Tie-breaker: If scores are equal, the bidding team wins
        if (this.state.bidderId) {
            const bidder = this.state.players.find(p => p.id === this.state.bidderId);
            if (bidder) return bidder.teamId;
        }

        return undefined;
    }

    public subscribe(listener: GameListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }

    /**
     * Persist game to MongoDB when game ends
     */
    private async persistGame(): Promise<void> {
        const winner = this.getWinner();
        if (!winner) return;

        this.hasPersisted = true;

        try {
            await saveGame(
                this.roomId,
                this.state,
                winner,
                this.startedAt,
                this.rounds
            );
            logger.info(`Game persisted successfully`, { roomId: this.roomId });
            metrics.gameCompleted(winner);
        } catch (error) {
            // Don't throw - game can continue even if persistence fails
            logger.error(`Failed to persist game`, { roomId: this.roomId, error });
        }
    }
}
