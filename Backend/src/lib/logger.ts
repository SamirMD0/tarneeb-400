// Backend/src/lib/logger.ts - Phase 20: Structured Logging

import winston from 'winston';
import { getEnv } from './env.js';

/**
 * Sensitive fields to redact from logs
 */
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'hand',        // Player hand (cards)
    'cards',       // Card data
    'playerHands', // All player hands
];

/**
 * Recursively redact sensitive fields from an object
 */
function redactSensitive(obj: unknown, depth = 0): unknown {
    // Prevent infinite recursion
    if (depth > 10) return '[MAX_DEPTH]';

    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') return obj;

    if (Array.isArray(obj)) {
        return obj.map((item) => redactSensitive(item, depth + 1));
    }

    if (typeof obj === 'object') {
        const redacted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
                redacted[key] = '[REDACTED]';
            } else {
                redacted[key] = redactSensitive(value, depth + 1);
            }
        }
        return redacted;
    }

    return obj;
}

/**
 * Custom format for redacting sensitive data
 */
const redactFormat = winston.format((info) => {
    // Redact sensitive fields from the message metadata
    if (info.meta && typeof info.meta === 'object') {
        info.meta = redactSensitive(info.meta);
    }

    // Redact from any additional properties
    const redacted = { ...info };
    for (const key of Object.keys(redacted)) {
        if (!['level', 'message', 'timestamp', 'service'].includes(key)) {
            if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
                redacted[key] = '[REDACTED]';
            } else {
                redacted[key] = redactSensitive(redacted[key]);
            }
        }
    }

    return redacted;
});

/**
 * Create Winston logger instance
 */
function createLogger(): winston.Logger {
    // Use process.env directly to avoid strict validation dependency during tests/early boot
    const isProduction = process.env.NODE_ENV === 'production';

    // Define formats
    const baseFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        redactFormat()
    );

    // Console format: colorized for dev, JSON for prod
    const consoleFormat = isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
        );

    // Transports
    const transports: winston.transport[] = [
        new winston.transports.Console({
            format: consoleFormat,
        }),
    ];

    // File transport for production
    if (isProduction) {
        transports.push(
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.json(),
                maxsize: 5 * 1024 * 1024, // 5MB
                maxFiles: 5,
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
                format: winston.format.json(),
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
            })
        );
    }

    return winston.createLogger({
        level: isProduction ? 'info' : 'debug',
        format: baseFormat,
        defaultMeta: { service: 'tarneeb-backend' },
        transports,
        // Don't exit on error
        exitOnError: false,
    });
}

// Singleton logger instance
export const logger = createLogger();

/**
 * Helper to log with additional context
 */
export function logWithContext(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    context?: Record<string, unknown>
): void {
    if (context) {
        logger.log(level, message, { meta: context });
    } else {
        logger.log(level, message);
    }
}

/**
 * Log lifecycle events
 */
export const lifecycle = {
    serverStart: (port: number): void => {
        logger.info('Server started', { port, pid: process.pid });
    },
    serverShutdown: (reason: string): void => {
        logger.info('Server shutting down', { reason });
    },
    roomCreated: (roomId: string, hostId: string): void => {
        logger.info('Room created', { roomId, hostId });
    },
    roomDestroyed: (roomId: string, reason: string): void => {
        logger.info('Room destroyed', { roomId, reason });
    },
    playerJoined: (roomId: string, playerId: string): void => {
        logger.info('Player joined room', { roomId, playerId });
    },
    playerLeft: (roomId: string, playerId: string, reason: string): void => {
        logger.info('Player left room', { roomId, playerId, reason });
    },
    gameStarted: (roomId: string, playerCount: number): void => {
        logger.info('Game started', { roomId, playerCount });
    },
    gameEnded: (roomId: string, winningTeam: number, finalScore: number[]): void => {
        logger.info('Game ended', { roomId, winningTeam, finalScore });
    },
};

/**
 * Log errors with proper context
 */
export const logError = {
    operational: (code: string, message: string, details?: unknown): void => {
        logger.warn('Operational error', { code, message, details: redactSensitive(details) });
    },
    internal: (error: Error, context?: Record<string, unknown>): void => {
        logger.error('Internal error', {
            message: error.message,
            stack: error.stack,
            context: redactSensitive(context),
        });
    },
    uncaught: (error: Error): void => {
        logger.error('Uncaught exception', {
            message: error.message,
            stack: error.stack,
        });
    },
    unhandledRejection: (reason: unknown): void => {
        logger.error('Unhandled promise rejection', { reason });
    },
};

export default logger;
