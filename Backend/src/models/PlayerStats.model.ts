// Backend/src/models/PlayerStats.model.ts
// Dedicated model for gameplay statistics (separate from auth users)

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlayerStats extends Document {
  socketId: string;
  username: string;
  gamesPlayed: number;
  wins: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerStatsSchema = new Schema<IPlayerStats>(
  {
    socketId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'player_stats',
  }
);

// Index to optimize leaderboard queries (wins desc, then gamesPlayed asc)
PlayerStatsSchema.index({ wins: -1, gamesPlayed: 1 });

export const PlayerStatsModel: Model<IPlayerStats> =
  (mongoose.models.PlayerStats as Model<IPlayerStats> | undefined) ??
  mongoose.model<IPlayerStats>('PlayerStats', PlayerStatsSchema);
