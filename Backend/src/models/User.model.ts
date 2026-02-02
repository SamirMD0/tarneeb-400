// Backend/src/models/User.model.ts - Phase 15: User Profile Persistence

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    socketId: string;
    username: string;
    gamesPlayed: number;
    wins: number;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    socketId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, trim: true, maxlength: 50 },
    gamesPlayed: { type: Number, required: true, default: 0, min: 0 },
    wins: { type: Number, required: true, default: 0, min: 0 },
    createdAt: { type: Date, required: true, default: Date.now },
}, {
    timestamps: false,
    collection: 'users',
});

// Compound index for leaderboard sorting
UserSchema.index({ wins: -1, gamesPlayed: 1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
