// Backend/src/game/engine.ts - Phase 15: GameEngine with roomId for persistence

import { GameState, createInitialGameState, PlayerState } from "./state.js";
import { GameAction } from "./actions.js";
import { applyAction } from "./reducer.js";
import type { RoundSnapshot } from "../types/game.types.js";
import { logger } from "../lib/logger.js";
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

    constructor(
        playerIds: string[],
        roomId?: string,
        private readonly onGameOver?: (
            state: GameState,
            winner: 1 | 2,
            startedAt: Date,
            rounds: RoundSnapshot[]
        ) => Promise<void>
    ) {
        this.state = createInitialGameState(playerIds);
        this.roomId = roomId ?? 'unknown';
        this.startedAt = new Date();
    }

    /**
     * Factory: Hydrate a GameEngine from a previously saved GameState
     * Validates shape before assigning to avoid corrupt engine state.
     */
    public static fromState(
        state: GameState,
        playerIds: string[],
        roomId: string,
        onGameOver?: (
            state: GameState,
            winner: 1 | 2,
            startedAt: Date,
            rounds: RoundSnapshot[]
        ) => Promise<void>
    ): GameEngine {
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

        const engine = new GameEngine(playerIds, roomId, onGameOver);
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
            if (action.type === 'END_ROUND') {
                this.rounds.push({
                    roundNumber: this.currentRoundNumber++,
                    bidderId: 'all', // Hack to satisfy type if it demands string
                    bidValue: 0, 
                    trumpSuit: prevState.trumpSuit,
                    tricksWon: {
                        team1: prevState.teams[1].tricksWon,
                        team2: prevState.teams[2].tricksWon,
                    },
                    scoreDeltas: {
                        team1: this.state.players.filter(p=>p.teamId===1).map(p=>p.score).reduce((a,b)=>a+b,0) - prevState.players.filter(p=>p.teamId===1).map(p=>p.score).reduce((a,b)=>a+b,0),
                        team2: this.state.players.filter(p=>p.teamId===2).map(p=>p.score).reduce((a,b)=>a+b,0) - prevState.players.filter(p=>p.teamId===2).map(p=>p.score).reduce((a,b)=>a+b,0),
                    },
                });
            }

            // Phase 15: Persist game when it ends
            if (this.isGameOver() && !this.hasPersisted && this.onGameOver) {
                this.hasPersisted = true;
                this.onGameOver(this.state, this.getWinner()!, this.startedAt, this.rounds)
                    .catch(err => logger.error('Failed to persist game via callback', { roomId: this.roomId, error: err }));
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
        for (const player of this.state.players) {
            if (player.score >= 41) {
                // Check partner's score > 0
                const partner = this.state.players.find(
                    p => p.teamId === player.teamId && p.id !== player.id
                );
                if (partner && partner.score > 0) return true;
            }
        }
        return false;
    }

    public getWinner(): 1 | 2 | undefined {
        for (const player of this.state.players) {
            if (player.score >= 41) {
                const partner = this.state.players.find(
                    p => p.teamId === player.teamId && p.id !== player.id
                );
                if (partner && partner.score > 0) return player.teamId;
            }
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
}
