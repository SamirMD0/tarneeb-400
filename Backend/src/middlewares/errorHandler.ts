// Backend/src/middleware/errorHandler.ts - Phase 19: Global Error Handler

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { BaseError, isOperationalError, normalizeError } from '../utils/errors.js';
import { ZodError } from 'zod';
import { getEnv } from '../lib/env.js';

/**
 * Error Response Format
 */
interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
        stack?: string;
    };
    timestamp: string;
    path: string;
}

/**
 * Global Express Error Handler
 * Must be the last middleware in the chain
 */
export const errorHandler: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Convert to BaseError for consistent handling
    const normalizedError = normalizeError(err);

    // Log error
    logError(normalizedError, req);

    // Build error response
    const response: ErrorResponse = {
        error: {
            code: normalizedError.code,
            message: normalizedError.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
    };

    // Include details in non-production or for operational errors
    if (getEnv().EXPOSE_STACK_TRACES || getEnv().NODE_ENV !== 'production') {
        response.error.details = normalizedError.details;
        response.error.stack = normalizedError.stack;
    }

    // Send response
    res.status(normalizedError.statusCode).json(response);
};

/**
 * Log error to console with context
 */
function logError(error: BaseError, req: Request): void {
    if (!getEnv().LOG_ERRORS) {
        return;
    }

    const logData = {
        timestamp: new Date().toISOString(),
        error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            isOperational: error.isOperational,
        },
        request: {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        },
        details: error.details,
    };

    if (error.statusCode >= 500) {
        console.error('❌ SERVER ERROR:', JSON.stringify(logData, null, 2));
        console.error('Stack:', error.stack);
    } else if (error.statusCode >= 400) {
        console.warn('⚠️  CLIENT ERROR:', JSON.stringify(logData, null, 2));
    }
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(error: Error): void {
    console.error('💥 UNCAUGHT EXCEPTION:', error);
    console.error('Stack:', error.stack);

    // In production, attempt graceful shutdown
    if (getEnv().NODE_ENV === 'production') {
        console.error('Shutting down due to uncaught exception...');
        process.exit(1);
    }
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
    console.error('💥 UNHANDLED REJECTION:', reason);

    // In production, attempt graceful shutdown
    if (getEnv().NODE_ENV === 'production') {
        console.error('Shutting down due to unhandled rejection...');
        process.exit(1);
    }
}

/**
 * 404 Handler - Route Not Found
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
    });
}