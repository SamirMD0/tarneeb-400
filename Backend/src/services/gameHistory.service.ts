// Backend/src/services/gameHistory.service.ts - Phase 15: Game Persistence Layer

import { GameModel, UserModel, type IGame } from '../models/index.js';
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

        await UserModel.findOneAndUpdate(
            { socketId: player.id },
            {
                $inc: {
                    gamesPlayed: 1,
                    wins: isWinner ? 1 : 0,
                },
                $setOnInsert: {
                    socketId: player.id,
                    username: player.id, // Default username to socketId if new
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
    const users = await UserModel.find({ gamesPlayed: { $gt: 0 } })
        .sort({ wins: -1, gamesPlayed: 1 })
        .limit(limit)
        .lean()
        .exec();

    return users.map((user) => ({
        userId: user.socketId,
        username: user.username,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        winRate: user.gamesPlayed > 0 ? (user.wins / user.gamesPlayed) * 100 : 0,
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
    const user = await UserModel.findOne({ socketId: userId }).lean().exec();

    if (!user) return null;

    return {
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        winRate: user.gamesPlayed > 0 ? (user.wins / user.gamesPlayed) * 100 : 0,
    };
}
