// Backend/src/utils/errors.ts - Phase 19: Custom Error Hierarchy

/**
 * Base error class for all application errors
 * Provides consistent structure for error handling
 */
/**
 * Base error class for all application errors
 * Provides consistent structure for error handling
 */
export abstract class GameError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number,
        code: string,
        isOperational = true,
        details?: unknown
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;

        Error.captureStackTrace(this);
    }
}

// Alias for backward compatibility if needed, but we should migrate
export type BaseError = GameError;

/**
 * 400 Bad Request - Client sent invalid data
 */
export class ValidationError extends GameError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', true, details);
    }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends GameError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED', true);
    }
}

// Alias for backward compatibility
export const AuthError = UnauthorizedError;

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends GameError {
    constructor(message: string = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN', true);
    }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends GameError {
    constructor(resource: string = 'Resource', id?: string) {
        const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
        super(message, 404, 'NOT_FOUND', true);
    }
}

/**
 * 409 Conflict - Resource state conflict
 */
export class ConflictError extends GameError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT', true);
    }
}

/**
 * 422 State Error - Invalid state transition
 */
export class StateError extends GameError {
    constructor(message: string, details?: unknown) {
        super(message, 422, 'STATE_ERROR', true, details);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends GameError {
    constructor(message: string = 'Too many requests, please try again later') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
    }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalError extends GameError {
    constructor(message: string = 'Internal server error', details?: unknown) {
        super(message, 500, 'INTERNAL_ERROR', false, details);
    }
}

/**
 * 500 Game Engine Error - Game state corruption or invalid transition
 */
export class GameEngineError extends GameError {
    constructor(message: string, details?: unknown) {
        super(message, 500, 'GAME_ENGINE_ERROR', false, details);
    }
}

/**
 * 503 Service Unavailable - External dependency failure
 */
export class ServiceUnavailableError extends GameError {
    constructor(service: string) {
        super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', true);
    }
}

/**
 * Helper to check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
    if (error instanceof GameError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Convert any error to GameError for consistent handling
 */
export function normalizeError(error: unknown): GameError {
    if (error instanceof GameError) {
        return error;
    }

    if (error instanceof Error) {
        return new InternalError(error.message, {
            originalError: error.name,
            stack: error.stack,
        });
    }

    return new InternalError('Unknown error occurred', { error });
}

/**
 * Generic business logic error with custom code
 */
export class BusinessError extends GameError {
    constructor(message: string, code: string, statusCode: number = 400) {
        super(message, statusCode, code, true);
    }
}
