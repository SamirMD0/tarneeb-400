import { GameState, createInitialGameState, PlayerState } from "./state.js";
import { GameAction } from "./actions.js";
import { applyAction } from "./reducer.js";
import { getPlayerIndex } from "./rules.js";

type GameListener = (state: GameState) => void;

export class GameEngine {
    private state: GameState;
    private listeners: GameListener[] = [];

    constructor(playerIds: string[]) {
        this.state = createInitialGameState(playerIds);
    }

    public getState(): Readonly<GameState> {
        return this.state;
    }

    public dispatch(action: GameAction): boolean {
        const prevState = this.state;
        const nextState = applyAction(this.state, action);

        // If state reference changed, it means action was valid and applied
        if (nextState !== prevState) {
            this.state = nextState;
            this.notifyListeners();
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
        // (This rule assumes game ends on a bid round, so there IS a bidder)
        if (this.state.bidderId) {
            const bidder = this.state.players.find(p => p.id === this.state.bidderId);
            if (bidder) return bidder.teamId;
        }

        // Fallback (should theoretically not happen in standard play if 41 is reached via bidding round)
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
