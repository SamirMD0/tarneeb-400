// Backend/src/middleware/rateLimiter.ts - Phase 19: Rate Limiting

import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../utils/errors.js';
import { getEnv } from '../lib/env.js';

/**
 * Custom error handler for rate limit middleware
 */
function rateLimitHandler(): void {
    throw new RateLimitError();
}

/**
 * Global rate limiter for all API routes
 * Default: 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
    windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
    max: getEnv().RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: rateLimitHandler,
    skip: (req) => {
        // Skip rate limiting in test environment
        return getEnv().NODE_ENV === 'test';
    },
});

/**
 * Strict rate limiter for room creation
 * Default: 3 rooms per hour per IP
 */
export const roomCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: () => getEnv().ROOM_CREATION_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => getEnv().NODE_ENV === 'test',
    keyGenerator: (req) => {
        // Use IP address as key
        return req.ip || 'unknown';
    },
});

/**
 * Moderate rate limiter for authenticated operations
 * 200 requests per 15 minutes
 */
export const authenticatedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => getEnv().NODE_ENV === 'test',
});

/**
 * Socket connection rate limiter
 * Applied per IP address
 * 10 connections per minute
 */
export const socketConnectionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => getEnv().NODE_ENV === 'test',
});