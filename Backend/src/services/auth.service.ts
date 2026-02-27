// Backend/src/services/auth.service.ts
// Handles user registration and login logic.
// Returns signed JWTs — controller stays thin.

import jwt from 'jsonwebtoken';
import { UserModel as User } from '../models/User.model.js';
import type { RegisterRequest, LoginRequest, AuthResponse, JwtPayload } from '../types/auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change_me_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

function signToken(userId: string, email: string): string {
  const payload: JwtPayload = { userId, email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export const authService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { name, email, password } = data;

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() }).lean().exec();
    if (existing) {
      const err = new Error('An account with this email already exists.');
      (err as any).statusCode = 409;
      throw err;
    }

    const user = new User({ name, email, password });
    await user.save();
    const token = signToken(String(user._id), user.email);

    return {
      token,
      user: { id: String(user._id), name: user.name, email: user.email },
    };
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // select: false on password — must explicitly include it
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').exec();
    if (!user) {
      const err = new Error('Invalid email or password.');
      (err as any).statusCode = 401;
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      (err as any).statusCode = 401;
      throw err;
    }

    const token = signToken(String(user._id), user.email);

    return {
      token,
      user: { id: String(user._id), name: user.name, email: user.email },
    };
  },
};