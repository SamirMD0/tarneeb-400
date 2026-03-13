// Backend/src/socket/socketMiddleware.ts - Phase 17: WebSocket Middleware

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData
} from '../types/socket.types.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../lib/metrics.js';
import { getEnv } from '../lib/env.js';
import type { JwtPayload } from '../types/auth.types.js';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type EventHandler = (socket: SocketType, ...args: any[]) => Promise<void> | void;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const RATE_LIMIT_MAX_ACTIONS = 10; // 10 actions per second
const RATE_LIMIT_CLEANUP_INTERVAL = 5000; // Cleanup every 5 seconds

interface RateLimitData {
    count: number;
    resetTime: number;
}

// Store rate limit data per socket
const rateLimitMap = new Map<string, RateLimitData>();

// Cleanup old entries periodically
export const rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [socketId, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(socketId);
        }
    }
}, RATE_LIMIT_CLEANUP_INTERVAL);
rateLimitCleanupTimer.unref();

/**
 * Authentication middleware
 * - Expects a JWT in socket.handshake.auth.token
 * - Verifies the token and extracts userId into socket.data.userId
 * - Rejects connection if token is missing or invalid
 */
export function authMiddleware(socket: SocketType, next: (err?: Error) => void): void {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
        next(Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' }));
        return;
    }

    try {
        const { JWT_SECRET } = getEnv();
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        if (!payload || !payload.userId) {
            next(Object.assign(new Error('INVALID_TOKEN'), { code: 'INVALID_TOKEN' }));
            return;
        }

        // Derive identity exclusively from verified JWT
        socket.data.userId = payload.userId;
        next();
    } catch (err) {
        logger.warn('[Auth] JWT verification failed', { socketId: socket.id, error: err instanceof Error ? err.message : String(err) });
        next(Object.assign(new Error('INVALID_TOKEN'), { code: 'INVALID_TOKEN' }));
    }
}

/**
 * Rate limiting middleware
 * Limits number of events per socket per time window
 */
export function rateLimitMiddleware(socket: SocketType): (handler: EventHandler) => EventHandler {
    return (handler: EventHandler) => {
        return async (...args: any[]) => {
            const now = Date.now();
            const socketId = socket.id;

            let limitData = rateLimitMap.get(socketId);

            // Initialize or reset if window expired
            if (!limitData || now > limitData.resetTime) {
                limitData = {
                    count: 0,
                    resetTime: now + RATE_LIMIT_WINDOW_MS,
                };
                rateLimitMap.set(socketId, limitData);
            }

            // Check if rate limit exceeded
            if (limitData.count >= RATE_LIMIT_MAX_ACTIONS) {
                const timeUntilReset = Math.ceil((limitData.resetTime - now) / 1000);
                socket.emit('error', {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Too many actions. Try again in ${timeUntilReset} seconds.`,
                });
                return;
            }

            // Increment counter
            limitData.count++;

            // Execute handler
            await handler(socket, ...args);
        };
    };
}

/**
 * Error boundary wrapper
 * Catches errors in event handlers and sends structured error responses
 */
export function errorBoundary(handler: EventHandler): EventHandler {
    return async (socket: SocketType, ...args: any[]) => {
        try {
            await handler(socket, ...args);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorCode = (error as any).code || 'INTERNAL_ERROR';

            logger.error(`[Socket Error] Handler failed`, {
                socketId: socket.id,
                error: errorMessage,
                code: errorCode,
                stack: error instanceof Error ? error.stack : undefined
            });

            metrics.errorOccurred(errorCode, errorCode !== 'INTERNAL_ERROR');

            // Send structured error response
            socket.emit('error', {
                code: errorCode,
                message: errorMessage,
            });
        }
    };
}

/**
 * Combined middleware wrapper
 * Applies rate limiting and error boundary to a handler
 */
export function applyMiddleware(socket: SocketType, handler: EventHandler): EventHandler {
    const rateLimit = rateLimitMiddleware(socket);
    return errorBoundary(rateLimit(handler));
}

/**
 * Validation middleware factory
 * Creates a validator that checks payload structure
 */
export function validatePayload<T>(
    schema: (data: unknown) => data is T
): (handler: (socket: SocketType, data: T) => Promise<void> | void) => EventHandler {
    return (handler) => {
        return async (socket: SocketType, data: unknown) => {
            if (!schema(data)) {
                socket.emit('error', {
                    code: 'INVALID_PAYLOAD',
                    message: 'Invalid event payload structure',
                });
                return;
            }

            await handler(socket, data);
        };
    };
}

/**
 * Cleanup rate limit data for disconnected socket
 */
export function cleanupSocketData(socketId: string): void {
    rateLimitMap.delete(socketId);
}

/**
 * Returns the current size of the rate limit map (for testing/monitoring)
 */
export function getRateLimitMapSize(): number {
    return rateLimitMap.size;
}