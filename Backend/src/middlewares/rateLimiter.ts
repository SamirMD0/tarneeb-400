import { rateLimit } from 'express-rate-limit';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Global Rate Limiter (restored)
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});

// 1. Room Creation Limiter (HTTP/Socket shared concept, mostly for HTTP currently)
export const roomCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 room creations per hour
    message: 'Too many rooms created from this IP, please try again after an hour',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 2. Authenticated Actions Limiter (General API protection)
export const authenticatedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Socket Connection Limiter
// Uses rate-limiter-flexible for high performance
export const socketConnectionLimiter = new RateLimiterMemory({
    points: 10, // 10 connections
    duration: 60, // per 60 seconds
});