// Backend/src/middleware/sanitization.ts - Phase 19: Input Sanitization

import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import { getEnv } from '../lib/env.js';

/**
 * MongoDB Query Injection Prevention
 * Removes keys starting with '$' or containing '.'
 */
export const sanitizeMongoQueries = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        if (getEnv().LOG_ERRORS) {
            console.warn(`⚠️  Sanitized MongoDB operator in ${req.method} ${req.path}: ${key}`);
        }
    },
});

/**
 * XSS Prevention Middleware
 * Sanitizes all string inputs in body, query, and params
 */
export function sanitizeXSS(req: Request, res: Response, next: NextFunction): void {
    // Sanitize body
    if (req.body) {
        req.body = sanitizeValue(req.body) as Record<string, unknown>;
    }

    // Sanitize query
    if (req.query) {
        const sanitizedQuery = sanitizeValue(req.query) as Record<string, any>;
        const queryObj = req.query as unknown as Record<string, any>;

        for (const key of Object.keys(queryObj)) {
            delete queryObj[key];
        }
        Object.assign(queryObj, sanitizedQuery);
    }

    // Sanitize params
    if (req.params) {
        req.params = sanitizeValue(req.params) as Record<string, string>;
    }

    next();
}

/**
 * Recursively sanitize values
 */
function sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
        return sanitizeString(value);
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (value && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
    }

    return value;
}

/**
 * Sanitize individual string
 */
function sanitizeString(input: string): string {
    return (
        input
            // Remove HTML tags
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            // Remove javascript: protocol
            .replace(/javascript:/gi, '')
            // Remove event handlers
            .replace(/on\w+\s*=/gi, '')
            // Trim whitespace
            .trim()
    );
}

/**
 * HTTP Parameter Pollution Prevention
 * Ensures no duplicate query parameters except whitelisted ones
 */
const ALLOWED_DUPLICATES = ['sort', 'fields', 'filter'];

export function preventHPP(req: Request, res: Response, next: NextFunction): void {
    if (!req.query) {
        return next();
    }

    const seen = new Set<string>();

    for (const key of Object.keys(req.query)) {
        if (seen.has(key) && !ALLOWED_DUPLICATES.includes(key)) {
            // Take only the first occurrence
            const value = req.query[key];
            req.query[key] = Array.isArray(value) ? value[0] : value;
        }
        seen.add(key);
    }

    next();
}

/**
 * Content Security Policy Headers
 * Prevent various client-side attacks
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    );

    next();
}