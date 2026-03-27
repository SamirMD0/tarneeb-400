// Backend/src/services/gameHistory.service.ts - Phase 15: Game Persistence Layer

import { GameModel, PlayerStatsModel, type IGame } from '../models/index.js';
import type { GameState } from '../game/state.js';
import type { LeaderboardEntry } from '../types/player.types.js';
import type { RoundSnapshot } from '../types/game.types.js';

/**
 * Saves a completed game to MongoDB and updates player statistics.
 * Should be called when GameEngine.isGameOver() returns true.
 */
export async function saveGame(
    roomId: string,
    gameState: GameState,
    winner: 1 | 2,
    startedAt: Date,
    rounds: RoundSnapshot[] = []
): Promise<IGame> {
    const playerIds = gameState.players.map((p) => p.id);

    const game = new GameModel({
        roomId,
        playerIds,
        winner,
        finalScore: {
            team1: gameState.teams[1].score,
            team2: gameState.teams[2].score,
        },
        rounds,
        startedAt,
        endedAt: new Date(),
    });

    await game.save();

    // Update user statistics for all players
    const winningTeam = winner;
    const updatePromises = gameState.players.map(async (player) => {
        const isWinner = player.teamId === winningTeam;

        await PlayerStatsModel.findOneAndUpdate(
            { socketId: player.id },
            {
                $inc: {
                    gamesPlayed: 1,
                    wins: isWinner ? 1 : 0,
                },
                $setOnInsert: {
                    socketId: player.id,
                    username: player.id, // PlayerState has no name; default username to socketId
                    createdAt: new Date(),
                },
            },
            { upsert: true, new: true }
        );
    });

    await Promise.all(updatePromises);

    return game;
}

/**
 * Retrieves game history for a specific user (as player participant).
 * Returns most recent games first.
 */
export async function getGameHistory(
    userId: string,
    limit: number = 20,
    skip: number = 0
): Promise<IGame[]> {
    const games = await GameModel.find({ playerIds: userId })
        .sort({ endedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

    return games as unknown as IGame[];
}

/**
 * Retrieves leaderboard sorted by wins (descending), then by games played (ascending).
 * Returns top players with calculated win rate.
 */
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const players = await PlayerStatsModel.find({ gamesPlayed: { $gt: 0 } })
        .sort({ wins: -1, gamesPlayed: 1 })
        .limit(limit)
        .lean()
        .exec();

    return players.map((p) => ({
        userId: p.socketId,
        username: p.username,
        gamesPlayed: p.gamesPlayed,
        wins: p.wins,
        winRate: p.gamesPlayed > 0 ? (p.wins / p.gamesPlayed) * 100 : 0,
    }));
}

/**
 * Gets a user's stats by their socket ID.
 */
export async function getUserStats(userId: string): Promise<{
    gamesPlayed: number;
    wins: number;
    winRate: number;
} | null> {
    const stats = await PlayerStatsModel.findOne({ socketId: userId }).lean().exec();

    if (!stats) return null;

    return {
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        winRate: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0,
    };
}
