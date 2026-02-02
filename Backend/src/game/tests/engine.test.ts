import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { GameEngine } from "../engine.js";
import { GameAction } from "../actions.js"; // ensure this export exists or remove if not needed for types
// createInitialGameState throws if < 4 players, so we need 4 IDs
const MOCK_PLAYERS = ["p1", "p2", "p3", "p4"];

describe("GameEngine", () => {
    it("should initialize with correct state", () => {
        const engine = new GameEngine(MOCK_PLAYERS);
        const state = engine.getState();

        assert.equal(state.players.length, 4);
        assert.equal(state.phase, "DEALING");
        assert.deepEqual(state.players.map(p => p.id), MOCK_PLAYERS);
    });

    it("should dispatch actions and update state", () => {
        const engine = new GameEngine(MOCK_PLAYERS);

        // Initial state is DEALING. ACTION: START_BIDDING
        const success = engine.dispatch({ type: "START_BIDDING" });

        assert.strictEqual(success, true);
        assert.strictEqual(engine.getState().phase, "BIDDING");
    });

    it("should reject invalid actions and not update state", () => {
        const engine = new GameEngine(MOCK_PLAYERS);
        const initialState = engine.getState();

        // Trying to play a card during DEALING phase (should fail)
        // We need a valid card object to pretend, but PLAY_CARD checks phase first anyway
        const invalidAction = {
            type: "PLAY_CARD",
            playerId: "p1",
            card: { suit: "HEARTS", rank: "A" }
        } as any;

        const success = engine.dispatch(invalidAction);

        assert.strictEqual(success, false);
        assert.strictEqual(engine.getState(), initialState); // Reference equality check
    });

    it("should notify subscribers on state change", () => {
        const engine = new GameEngine(MOCK_PLAYERS);
        const listener = mock.fn();

        engine.subscribe(listener);

        engine.dispatch({ type: "START_BIDDING" });

        assert.strictEqual(listener.mock.callCount(), 1);
        // The argument passed to listener should be the new state
        const call = listener.mock.calls[0];
        assert.ok(call, "Expected listener to have been called");
        const callArgs = call.arguments;
        assert.strictEqual((callArgs[0] as any).phase, "BIDDING");
    });

    it("should return correct current player", () => {
        const engine = new GameEngine(MOCK_PLAYERS);
        // In DEALING phase, currentPlayerIndex is 0
        assert.strictEqual(engine.getCurrentPlayer().id, "p1");

        engine.dispatch({ type: "START_BIDDING" });
        // In BIDDING phase initial index is 0
        assert.strictEqual(engine.getCurrentPlayer().id, "p1");
    });

    describe("End Game Conditions", () => {
        it("should detect game over when score >= 41", () => {
            const engine = new GameEngine(MOCK_PLAYERS);

            // Manually mutate state for testing (since we can't easily play a full game here)
            // Accessing private state via simple cast (or we could just rely on dispatch actions if we had a debug action)
            // Since it's a unit test for logic, valid to "mock" internal state or extended class

            // We will cast to any to inject state
            const state = (engine as any).state;
            state.teams[1].score = 41;

            assert.strictEqual(engine.isGameOver(), true);
            assert.strictEqual(engine.getWinner(), 1);
        });

        it("should determine correct winner based on higher score", () => {
            const engine = new GameEngine(MOCK_PLAYERS);
            const state = (engine as any).state;

            state.teams[1].score = 30;
            state.teams[2].score = 42;

            assert.strictEqual(engine.isGameOver(), true);
            assert.strictEqual(engine.getWinner(), 2);
        });

        it("should use bidder as tie-breaker", () => {
            const engine = new GameEngine(MOCK_PLAYERS);
            const state = (engine as any).state;

            state.teams[1].score = 45;
            state.teams[2].score = 45;

            // p1 is on Team 1 (from createInitialGameState logic: idx 0 -> Team 1)
            state.bidderId = "p1";

            assert.strictEqual(engine.isGameOver(), true);
            assert.strictEqual(engine.getWinner(), 1);

            // p2 is on Team 2 (idx 1 -> Team 2)
            state.bidderId = "p2";
            assert.strictEqual(engine.getWinner(), 2);
        });

        it("should return undefined winner if game not over", () => {
            const engine = new GameEngine(MOCK_PLAYERS);
            assert.strictEqual(engine.isGameOver(), false);
            assert.strictEqual(engine.getWinner(), undefined);
        });
    });

    // =================================================================
    // PHASE 13: EDGE CASE HARDENING
    // =================================================================

    describe("Phase 13: State Corruption Safety", () => {
        it("should handle getCurrentPlayer when currentPlayerIndex is at boundary", () => {
            const engine = new GameEngine(MOCK_PLAYERS);
            const state = (engine as any).state;

            // Test boundary index (3 = last valid)
            state.currentPlayerIndex = 3;
            assert.strictEqual(engine.getCurrentPlayer().id, "p4");
        });

        it("should throw error for getCurrentPlayer with invalid index", () => {
            const engine = new GameEngine(MOCK_PLAYERS);
            const state = (engine as any).state;

            // Set invalid index
            state.currentPlayerIndex = 10;

            assert.throws(() => {
                engine.getCurrentPlayer();
            }, /Invalid player index/);
        });

        it("should handle getWinner when both teams have equal high scores", () => {
            const engine = new GameEngine(MOCK_PLAYERS);
            const state = (engine as any).state;

            state.teams[1].score = 50;
            state.teams[2].score = 50;
            state.bidderId = "p3"; // Team 1 member

            assert.strictEqual(engine.isGameOver(), true);
            assert.strictEqual(engine.getWinner(), 1); // Bidder's team wins
        });
    });
});
