// Backend/src/models/Game.model.ts - Phase 15: Game History Persistence

import mongoose, { Schema, Document } from 'mongoose';
import type { Suit } from '../types/game.types.js';

// SubDocument schema for round history
export interface IRoundSnapshot {
    roundNumber: number;
    bidderId: string;
    bidValue: number;
    trumpSuit: Suit;
    tricksWon: { team1: number; team2: number };
    scoreDeltas: { team1: number; team2: number };
}

const RoundSnapshotSchema = new Schema<IRoundSnapshot>({
    roundNumber: { type: Number, required: true },
    bidderId: { type: String, required: true },
    bidValue: { type: Number, required: true, min: 7, max: 13 },
    trumpSuit: { type: String, required: true, enum: ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'] },
    tricksWon: {
        team1: { type: Number, required: true, default: 0 },
        team2: { type: Number, required: true, default: 0 },
    },
    scoreDeltas: {
        team1: { type: Number, required: true },
        team2: { type: Number, required: true },
    },
}, { _id: false });

// Main game document interface
export interface IGame extends Document {
    roomId: string;
    playerIds: string[];
    winner: 1 | 2;
    finalScore: { team1: number; team2: number };
    rounds: IRoundSnapshot[];
    startedAt: Date;
    endedAt: Date;
}

const GameSchema = new Schema<IGame>({
    roomId: { type: String, required: true, index: true },
    playerIds: {
        type: [String],
        required: true,
        validate: {
            validator: (v: string[]) => v.length === 4,
            message: 'Game must have exactly 4 players',
        },
    },
    winner: { type: Number, required: true, enum: [1, 2] },
    finalScore: {
        team1: { type: Number, required: true },
        team2: { type: Number, required: true },
    },
    rounds: { type: [RoundSnapshotSchema], default: [] },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true, default: Date.now },
}, {
    timestamps: false,
    collection: 'games',
});

// Index for player history queries
GameSchema.index({ playerIds: 1 });

export const GameModel = mongoose.model<IGame>('Game', GameSchema);
