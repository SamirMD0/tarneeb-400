// Backend/src/middleware/errorHandler.ts - Phase 19: Global Error Handler

import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { GameError, isOperationalError, normalizeError } from '../utils/errors.js';
import { ZodError } from 'zod';
import { getEnv } from '../lib/env.js';
import { logger, logError } from '../lib/logger.js';
import { metrics } from '../lib/metrics.js';

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

    // Track error metric
    metrics.errorOccurred(normalizedError.code, normalizedError.isOperational);

    // Log error
    logErrorInternal(normalizedError, req);

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
function logErrorInternal(error: GameError, req: Request): void {
    if (!getEnv().LOG_ERRORS) {
        return;
    }

    const logData = {
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        request: {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        },
        details: error.details,
    };

    if (error.statusCode >= 500) {
        logger.error(error.message, {
            ...logData,
            stack: error.stack
        });
    } else if (error.statusCode >= 400) {
        logger.warn(error.message, logData);
    }
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(error: Error): void {
    logError.uncaught(error);
    metrics.errorOccurred('UNCAUGHT_EXCEPTION', false);

    // In production, attempt graceful shutdown
    if (getEnv().NODE_ENV === 'production') {
        logger.error('Shutting down due to uncaught exception...');
        process.exit(1);
    }
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
    logError.unhandledRejection(reason);
    metrics.errorOccurred('UNHANDLED_REJECTION', false);

    // In production, attempt graceful shutdown
    if (getEnv().NODE_ENV === 'production') {
        logger.error('Shutting down due to unhandled rejection...');
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