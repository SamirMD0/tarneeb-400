// Backend/src/models/User.model.ts
// Player profile and statistics schema, extended with auth credentials.
// Password is hashed via bcrypt before save — never stored in plaintext.

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  // Statistics
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [32, 'Name must be at most 32 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
    // Stats
    gamesPlayed: { type: Number, default: 0 },
    gamesWon:    { type: Number, default: 0 },
    totalScore:  { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method for password comparison
UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Prevent password leakage in JSON serialization
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

import type { Model } from 'mongoose';

export const  UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>('User', UserSchema);