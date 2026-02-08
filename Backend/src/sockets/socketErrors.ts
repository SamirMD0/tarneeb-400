import { GameError, StateError, ValidationError, UnauthorizedError, RateLimitError, InternalError } from '../utils/errors.js';
import { ZodError } from 'zod';

export interface SocketErrorResponse {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
}

/**
 * Standardize socket errors
 * Converts unknown errors/exceptions into structured SocketErrorResponse
 */
export function toSocketError(error: unknown): SocketErrorResponse {
    const timestamp = new Date().toISOString();

    // Already a structured GameError
    if (error instanceof GameError) {
        return {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp
        };
    }

    // Zod Validation Errors
    if (error instanceof ZodError) {
        return {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request payload',
            details: error.format(), // Use format() or issues instead of errors
            timestamp
        };
    }

    // Standard Error object
    if (error instanceof Error) {
        return {
            code: 'INTERNAL_ERROR',
            message: error.message,
            details: { stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined },
            timestamp
        };
    }

    // Unknown fallback
    return {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        details: { original: error },
        timestamp
    };
}
