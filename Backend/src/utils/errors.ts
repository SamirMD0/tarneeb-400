// Backend/src/utils/errors.ts - Phase 19: Custom Error Hierarchy

/**
 * Base error class for all application errors
 * Provides consistent structure for error handling
 */
export class BaseError extends Error {
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

/**
 * 400 Bad Request - Client sent invalid data
 */
export class ValidationError extends BaseError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', true, details);
    }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class AuthError extends BaseError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED', true);
    }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends BaseError {
    constructor(message: string = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN', true);
    }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends BaseError {
    constructor(resource: string = 'Resource', id?: string) {
        const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
        super(message, 404, 'NOT_FOUND', true);
    }
}

/**
 * 409 Conflict - Resource state conflict
 */
export class ConflictError extends BaseError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT', true);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends BaseError {
    constructor(message: string = 'Too many requests, please try again later') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
    }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalError extends BaseError {
    constructor(message: string = 'Internal server error', details?: unknown) {
        super(message, 500, 'INTERNAL_ERROR', false, details);
    }
}

/**
 * 500 Game Engine Error - Game state corruption or invalid transition
 */
export class GameEngineError extends BaseError {
    constructor(message: string, details?: unknown) {
        super(message, 500, 'GAME_ENGINE_ERROR', false, details);
    }
}

/**
 * 503 Service Unavailable - External dependency failure
 */
export class ServiceUnavailableError extends BaseError {
    constructor(service: string) {
        super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', true);
    }
}

/**
 * Helper to check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
    if (error instanceof BaseError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Convert any error to BaseError for consistent handling
 */
export function normalizeError(error: unknown): BaseError {
    if (error instanceof BaseError) {
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