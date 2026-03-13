// Backend/src/models/User.model.ts
// Player profile & lightweight stats for leaderboards and auth.

import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  // Identity (socket-based or full account)
  socketId?: string;
  name?: string;      // alias: username
  username?: string;  // input alias for name
  email?: string;
  password?: string;
  // Statistics
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    // Optional identity for ephemeral/guest users connecting via sockets
    socketId: { type: String },

    // Display name. Accepts input via alias "username" in create/update payloads
    name: {
      type: String,
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [50, 'Name must be at most 50 characters'],
      alias: 'username',
      required: false,
    },

    // Email/password are optional here to support tests that upsert by socketId
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      required: false,
      index: true,
      unique: false,
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
      required: false,
    },

    // Stats
    gamesPlayed: { type: Number, default: 0 },
    wins:        { type: Number, default: 0 },
    totalScore:  { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'users',
    strict: true,
  }
);

// Backward-compatibility alias for any legacy code using gamesWon
UserSchema.virtual('gamesWon')
  .get(function(this: any) { return this.wins; })
  .set(function(this: any, v: number) { this.wins = v; });

// Ensure unique index on socketId exists
UserSchema.index({ socketId: 1 }, { unique: true, sparse: true });

// Hash password before saving (only if provided/changed)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password as string, salt);
  next();
});

// Instance method for password comparison
UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password as string);
};

export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>('User', UserSchema);
