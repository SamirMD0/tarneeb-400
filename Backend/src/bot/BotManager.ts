// Backend/src/bot/BotManager.ts - AI Bot Manager for Tarneeb

import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import type { Room } from '../rooms/room.js';
import type { Card, Suit, Rank } from '../types/game.types.js';
import type { GameState } from '../game/state.js';
import type { GameAction } from '../game/actions.js';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, SanitizedGameState } from '../types/socket.types.js';
import { logger } from '../lib/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOT_NAMES = ['Bot Alice', 'Bot Bob', 'Bot Carol', 'Bot Dave'];
const BOT_DELAY_MIN_MS = 800;
const BOT_DELAY_MAX_MS = 1500;
const BOT_ID_PREFIX = 'bot_';

const RANK_ORDER: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

/** Strong cards for bidding evaluation */
const STRONG_RANKS: Set<Rank> = new Set(['A', 'K', 'Q']);
/** Medium cards for bidding evaluation */
const MEDIUM_RANKS: Set<Rank> = new Set(['J', '10']);

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface BotState {
    roomId: string;
    playerId: string;
    name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeGameState(state: Readonly<GameState>): SanitizedGameState {
    const { deck, ...safe } = state;
    return safe;
}

function rankValue(rank: Rank): number {
    return RANK_ORDER.length - RANK_ORDER.indexOf(rank);
}

function randomDelay(): number {
    return BOT_DELAY_MIN_MS + Math.floor(Math.random() * (BOT_DELAY_MAX_MS - BOT_DELAY_MIN_MS + 1));
}

// ─── BotManager ───────────────────────────────────────────────────────────────

export class BotManager {
    /** Active bots: botPlayerId → BotState */
    private bots: Map<string, BotState> = new Map();

    /** Active timers per room for cleanup */
    private roomTimers: Map<string, NodeJS.Timeout[]> = new Map();

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Check if a playerId belongs to a bot
     */
    public isBot(playerId: string): boolean {
        return playerId.startsWith(BOT_ID_PREFIX);
    }

    /**
     * Add a single bot to a room in the next available slot.
     * Returns the bot's playerId or null if room is full.
     */
    public async addBot(room: Room): Promise<string | null> {
        if (room.players.size >= 4) return null;

        const playerId = `${BOT_ID_PREFIX}${randomUUID()}`;
        const usedNames = new Set([...room.players.values()].map(p => p.name));
        const name = BOT_NAMES.find(n => !usedNames.has(n)) ?? `Bot_${playerId.substring(4, 10)}`;

        const added = await room.addPlayer(playerId, name, true);
        if (!added) return null;

        this.bots.set(playerId, { roomId: room.id, playerId, name });
        logger.info('Bot added to room', { roomId: room.id, botId: playerId, name });
        return playerId;
    }

    /**
     * Fill a room up to 4 players with bots.
     * Returns array of added bot playerIds.
     */
    public async fillRoom(room: Room): Promise<string[]> {
        const added: string[] = [];
        while (room.players.size < 4) {
            const botId = await this.addBot(room);
            if (!botId) break;
            added.push(botId);
        }
        return added;
    }

    /**
     * Remove a single bot from a room (e.g., when a human joins).
     * Removes the first bot found.
     */
    public async removeBotFromRoom(room: Room): Promise<string | null> {
        for (const [id, player] of room.players) {
            if (this.isBot(id)) {
                await room.removePlayer(id);
                this.bots.delete(id);
                logger.info('Bot removed from room', { roomId: room.id, botId: id });
                return id;
            }
        }
        return null;
    }

    /**
     * Clean up all bots and timers for a room.
     */
    public cleanupRoom(roomId: string): void {
        // Clear timers
        const timers = this.roomTimers.get(roomId);
        if (timers) {
            timers.forEach(t => clearTimeout(t));
            this.roomTimers.delete(roomId);
        }

        // Remove bot entries
        for (const [id, bot] of this.bots) {
            if (bot.roomId === roomId) {
                this.bots.delete(id);
            }
        }

        logger.info('Bots cleaned up for room', { roomId });
    }

    /**
     * Called after every game_state_updated broadcast.
     * If the current active player is a bot, schedule their action.
     */
    public handleGameStateUpdate(room: Room, io: IOServer): void {
        if (!room.gameEngine) return;

        const state = room.gameEngine.getState();
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer) return;

        // Only act if current player is a bot
        if (!this.isBot(currentPlayer.id)) return;

        // Don't schedule if game is over
        if (state.phase === 'GAME_OVER' || state.phase === 'DEALING' || state.phase === 'SCORING') return;

        // Schedule bot action with delay
        const delay = randomDelay();
        const timer = setTimeout(() => {
            this.executeBotTurn(room, io);
        }, delay);

        // Track timer for cleanup
        if (!this.roomTimers.has(room.id)) {
            this.roomTimers.set(room.id, []);
        }
        this.roomTimers.get(room.id)!.push(timer);
    }

    // ── Private: Bot Turn Execution ───────────────────────────────────────

    private executeBotTurn(room: Room, io: IOServer): void {
        if (!room.gameEngine) return;

        const state = room.gameEngine.getState();
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer || !this.isBot(currentPlayer.id)) return;

        const phase = state.phase;

        try {
            if (phase === 'BIDDING') {
                this.executeBiddingTurn(room, io, currentPlayer.id, currentPlayer.hand, state);
            } else if (phase === 'PLAYING') {
                this.executePlayingTurn(room, io, currentPlayer.id, currentPlayer.hand, state);
            }
        } catch (err) {
            logger.error('Bot turn execution failed', {
                roomId: room.id,
                botId: currentPlayer.id,
                phase,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    private executeBiddingTurn(room: Room, io: IOServer, botId: string, hand: Card[], state: GameState): void {
        if (!room.gameEngine) return;

        // Decide bid or pass
        const playerScore = state.players[state.currentPlayerIndex]!.score;
        const bidValue = this.decideBid(hand, playerScore, state.highestBid);

        let action: GameAction;
        if (bidValue !== null) {
            action = { type: 'BID', playerId: botId, value: bidValue };
        } else {
            action = { type: 'PASS', playerId: botId };
        }

        const success = room.gameEngine.dispatch(action);
        if (success) {
            io.to(room.id).emit('game_state_updated', {
                roomId: room.id,
                gameState: sanitizeGameState(room.gameEngine.getState()),
            });
            // Check if next player is also a bot
            this.handleGameStateUpdate(room, io);
        }
    }

    private executePlayingTurn(room: Room, io: IOServer, botId: string, hand: Card[], state: GameState): void {
        if (!room.gameEngine) return;

        const card = this.decideCard(hand, state);
        if (!card) {
            logger.error('Bot could not decide a card to play', { botId, handSize: hand.length });
            return;
        }

        const action: GameAction = { type: 'PLAY_CARD', playerId: botId, card };
        const played = room.gameEngine.dispatch(action);

        if (!played) {
            logger.error('Bot play_card rejected by engine', { botId, card });
            return;
        }

        // Handle END_TRICK / END_ROUND auto-triggers (same as playing.handler.ts)
        let updatedState = room.gameEngine.getState();
        if (updatedState.trick.length === 4) {
            room.gameEngine.dispatch({ type: 'END_TRICK' });
            updatedState = room.gameEngine.getState();

            const totalTricks = updatedState.teams[1].tricksWon + updatedState.teams[2].tricksWon;
            if (totalTricks === 13) {
                room.gameEngine.dispatch({ type: 'END_ROUND' });
                updatedState = room.gameEngine.getState();

                // Queue next round if game hasn't ended
                if (!room.gameEngine.isGameOver()) {
                    const engineRef = room.gameEngine;
                    const roomId = room.id;
                    const timer = setTimeout(() => {
                        if (!engineRef || engineRef.getState().phase !== 'SCORING') return;
                        engineRef.dispatch({ type: 'START_NEXT_ROUND' });

                        const nextState = engineRef.getState();
                        io.to(roomId).emit('game_state_updated', {
                            roomId,
                            gameState: sanitizeGameState(nextState),
                        });

                        // After START_NEXT_ROUND, it goes to DEALING.
                        // Need START_BIDDING to move to BIDDING phase
                        if (nextState.phase === 'DEALING') {
                            engineRef.dispatch({ type: 'START_BIDDING' });
                            io.to(roomId).emit('game_state_updated', {
                                roomId,
                                gameState: sanitizeGameState(engineRef.getState()),
                            });
                        }

                        // Check if next player is a bot
                        this.handleGameStateUpdate(room, io);
                    }, 3000);

                    if (!this.roomTimers.has(room.id)) {
                        this.roomTimers.set(room.id, []);
                    }
                    this.roomTimers.get(room.id)!.push(timer);
                }
            }
        }

        // Broadcast updated state
        io.to(room.id).emit('game_state_updated', {
            roomId: room.id,
            gameState: sanitizeGameState(room.gameEngine.getState()),
        });

        // Emit game_over if applicable
        if (room.gameEngine.isGameOver()) {
            const winner = room.gameEngine.getWinner();
            if (winner) {
                const finalState = room.gameEngine.getState();
                io.to(room.id).emit('game_over', {
                    roomId: room.id,
                    winner,
                    finalScore: {
                        team1: Math.max(...finalState.players.filter(p => p.teamId === 1).map(p => p.score)),
                        team2: Math.max(...finalState.players.filter(p => p.teamId === 2).map(p => p.score)),
                    },
                });
                this.cleanupRoom(room.id);

                // Clear game engine so room reverts to "waiting" state.
                room.gameEngine = undefined;

                // Broadcast room update (now shows as lobby/waiting)
                io.to(room.id).emit('player_joined', {
                    playerId: '',
                    playerName: '',
                    room: {
                        id: room.id,
                        players: Array.from(room.players.values()),
                        config: room.config,
                        hasGame: false,
                        gameState: undefined,
                    },
                });
            }
            return;
        }

        // Check if next player is also a bot (chain bot turns)
        this.handleGameStateUpdate(room, io);
    }

    // ── Private: AI Decision Logic ────────────────────────────────────────

    /**
     * Decide bid value or null (pass).
     *
     * Strategy:
     * - Count strong cards (A, K, Q) and medium cards (J, 10)
     * - 5+ strong → bid 7 or 8
     * - 5+ strong+medium → bid 5 or 6
     * - Otherwise → pass
     * - Never bid at or below current highest bid
     */
    private decideBid(hand: Card[], playerScore: number, highestBid: number = 0): number | null {
        let strongCount = 0;
        let mediumCount = 0;

        for (const card of hand) {
            if (STRONG_RANKS.has(card.rank)) strongCount++;
            if (MEDIUM_RANKS.has(card.rank)) mediumCount++;
        }

        const totalStrong = strongCount + mediumCount;
        let targetBid: number;

        if (strongCount >= 5) {
            targetBid = strongCount >= 7 ? 8 : 7;
        } else if (totalStrong >= 5) {
            targetBid = totalStrong >= 7 ? 6 : 5;
        } else if (totalStrong >= 3) {
            targetBid = 4;
        } else if (totalStrong >= 1) {
            targetBid = 3;
        } else {
            targetBid = 2; // Weakest hands bid 2 minimum
        }

        // Calculate min bid based on player score securely
        const minIndividualBid = playerScore >= 50 ? 5 : playerScore >= 40 ? 4 : playerScore >= 30 ? 3 : 2;

        // Clamp to valid range — bid at least the score-based minimum
        const bid = Math.max(targetBid, minIndividualBid);
        if (bid > 13) return 13;

        return bid;
    }

    /**
     * Decide which card to play.
     *
     * Strategy:
     * - If leading (trick empty): play highest card
     * - If following suit: play highest if likely to win, else play lowest
     * - If can't follow suit: play lowest trump if holding trump and no trump in trick yet,
     *   otherwise play lowest card overall
     */
    private decideCard(hand: Card[], state: GameState): Card | null {
        if (hand.length === 0) return null;

        const trick = state.trick;
        const trumpSuit = 'HEARTS';

        // ── Leading the trick ──
        if (trick.length === 0) {
            return this.highestCard(hand);
        }

        // ── Following ──
        const leadSuit = trick[0]!.suit;
        const suitCards = hand.filter(c => c.suit === leadSuit);

        if (suitCards.length > 0) {
            // Must follow suit
            // Check if we can beat the current best card in the trick
            const bestInTrick = this.bestTrickCard(trick, leadSuit);

            // Try to win: play highest card of suit that beats current best
            const winners = suitCards.filter(c => {
                // Compare: if same suit, higher rank wins
                if (bestInTrick.suit === c.suit) {
                    return rankValue(c.rank) > rankValue(bestInTrick.rank);
                }
                // bestInTrick is trump and our card is lead suit (non-trump) → can't win
                if (bestInTrick.suit === trumpSuit && c.suit !== trumpSuit) {
                    return false;
                }
                return false;
            });

            if (winners.length > 0) {
                // Play the lowest winning card (economize)
                return this.lowestCard(winners);
            } else {
                // Can't win, play lowest of suit
                return this.lowestCard(suitCards);
            }
        }

        // ── Can't follow suit ──
        const trumpCards = hand.filter(c => c.suit === trumpSuit);
        const trickHasTrump = trick.some(c => c.suit === trumpSuit);

        if (trumpCards.length > 0 && !trickHasTrump) {
            // Play lowest trump to win
            return this.lowestCard(trumpCards);
        }

        // Play lowest card overall (discard)
        return this.lowestCard(hand);
    }

    // ── Card Utilities ────────────────────────────────────────────────────

    private highestCard(cards: Card[]): Card {
        return cards.reduce((best, c) => rankValue(c.rank) > rankValue(best.rank) ? c : best, cards[0]!);
    }

    private lowestCard(cards: Card[]): Card {
        return cards.reduce((best, c) => rankValue(c.rank) < rankValue(best.rank) ? c : best, cards[0]!);
    }

    /**
     * Find the card currently winning the trick.
     */
    private bestTrickCard(trick: Card[], leadSuit: Suit): Card {
        let best = trick[0]!;
        const trumpSuit = 'HEARTS';
        for (let i = 1; i < trick.length; i++) {
            const card = trick[i]!;
            // Trump beats non-trump
            if (card.suit === trumpSuit && best.suit !== trumpSuit) {
                best = card;
            } else if (card.suit === best.suit && rankValue(card.rank) > rankValue(best.rank)) {
                // Same suit: higher rank wins
                best = card;
            } else if (best.suit !== trumpSuit && best.suit !== leadSuit && card.suit === leadSuit) {
                // best is off-suit non-trump, card is lead suit
                best = card;
            }
        }
        return best;
    }
}

// Singleton instance
export const botManager = new BotManager();
