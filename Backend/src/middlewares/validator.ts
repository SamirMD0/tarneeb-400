// Backend/src/middleware/validator.ts - Phase 19: Request Validation

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';
import type { Suit } from '../types/game.types.js';
import type { RoomConfig } from '../types/room.types.js';

/**
 * Zod Schemas for API Validation
 */

// Room Configuration Schema
export const RoomConfigSchema = z.object({
    maxPlayers: z.number().int().min(4).max(4),
    targetScore: z.number().int().min(1).max(200).optional().default(41),
    allowBots: z.boolean().optional().default(false),
    timePerTurn: z.number().int().min(10).max(300).optional(),
}) satisfies z.ZodType<RoomConfig>;

// Create Room Payload
export const CreateRoomSchema = z.object({
    config: RoomConfigSchema,
    playerName: z.string().min(1).max(50).optional(),
});

// Join Room Payload
export const JoinRoomSchema = z.object({
    roomId: z.string().min(1),
    playerName: z.string().min(1).max(50).optional(),
});

// Game Action Schemas
const SuitSchema = z.enum(['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']) satisfies z.ZodType<Suit>;

const CardSchema = z.object({
    suit: SuitSchema,
    rank: z.enum(['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']),
});

export const BidActionSchema = z.object({
    type: z.literal('BID'),
    playerId: z.string(),
    value: z.number().int().min(7).max(13),
});

export const PassActionSchema = z.object({
    type: z.literal('PASS'),
    playerId: z.string(),
});

export const SetTrumpActionSchema = z.object({
    type: z.literal('SET_TRUMP'),
    suit: SuitSchema,
});

export const PlayCardActionSchema = z.object({
    type: z.literal('PLAY_CARD'),
    playerId: z.string(),
    card: CardSchema,
});

export const EndTrickActionSchema = z.object({
    type: z.literal('END_TRICK'),
});

export const EndRoundActionSchema = z.object({
    type: z.literal('END_ROUND'),
});

export const StartBiddingActionSchema = z.object({
    type: z.literal('START_BIDDING'),
});

export const ResetGameActionSchema = z.object({
    type: z.literal('RESET_GAME'),
});

export const GameActionSchema = z.discriminatedUnion('type', [
    BidActionSchema,
    PassActionSchema,
    SetTrumpActionSchema,
    PlayCardActionSchema,
    EndTrickActionSchema,
    EndRoundActionSchema,
    StartBiddingActionSchema,
    ResetGameActionSchema,
]);

// Socket Event Schemas
export const PlaceBidSchema = z.object({
    value: z.number().int().min(7).max(13),
});

export const SetTrumpSchema = z.object({
    suit: SuitSchema,
});

export const PlayCardSchema = z.object({
    card: CardSchema,
});

/**
 * Express Middleware Factory for Request Validation
 */

type ValidationTarget = 'body' | 'query' | 'params';

export function validate<T>(
    schema: ZodSchema<T>,
    target: ValidationTarget = 'body'
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = req[target];
            const validated = schema.parse(data);
            req[target] = validated;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details = error.issues.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));

                next(
                    new ValidationError('Request validation failed', {
                        target,
                        errors: details,
                    })
                );
            } else {
                next(error);
            }
        }
    };
}

/**
 * Socket Event Validation Helper
 * Returns validated data or throws ValidationError
 */
export function validateSocketPayload<T>(schema: ZodSchema<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            const details = error.issues.map((err) => ({
                path: err.path.join('.'),
                message: err.message,
            }));

            throw new ValidationError('Socket payload validation failed', {
                errors: details,
            });
        }
        throw error;
    }
}

/**
 * Sanitize string input (remove potential XSS)
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
        const value = sanitized[key];

        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value) as T[Extract<keyof T, string>];
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value as Record<string, unknown>) as T[Extract<
                keyof T,
                string
            >];
        }
    }

    return sanitized;
}