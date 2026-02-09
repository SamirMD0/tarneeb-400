// Backend/src/middlewares/sanitization.ts - Phase 19: Input Sanitization (FIXED)

import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../lib/env.js';

/**
 * MongoDB Query Injection Prevention
 * Removes keys starting with '$' or containing '.'
 */
export function sanitizeMongoQueries(req: Request, res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeMongoKeys(req.body);
    }

    if (req.query && typeof req.query === 'object') {
        const sanitized = sanitizeMongoKeys(req.query as any) as Record<string, any>;
        Object.defineProperty(req, 'query', {
            value: sanitized,
            writable: true,
            configurable: true,
        });
    }

    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeMongoKeys(req.params) as Record<string, string>;
    }

    next();
}

/**
 * XSS Prevention Middleware
 * Sanitizes all string inputs in body, query, and params
 * 
 * CRITICAL FIX: Cannot reassign req.query (read-only), must modify in place
 */
export function sanitizeXSS(req: Request, res: Response, next: NextFunction): void {
    // Sanitize body - can reassign
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body) as Record<string, unknown>;
    }

    // Sanitize query - MUST modify in place (req.query is read-only)
    if (req.query && typeof req.query === 'object') {
        const sanitized = sanitizeValue(req.query) as Record<string, any>;
        
        // Clear all existing properties
        const existingKeys = Object.keys(req.query);
        for (const key of existingKeys) {
            delete (req.query as any)[key];
        }
        
        // Add sanitized properties back
        for (const [key, value] of Object.entries(sanitized)) {
            (req.query as any)[key] = value;
        }
    }

    // Sanitize params - can reassign
    if (req.params && typeof req.params === 'object') {
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

function sanitizeMongoKeys(value: unknown): any {
    if (Array.isArray(value)) {
        return value.map(sanitizeMongoKeys);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    const out: Record<string, any> = {};
    for (const [rawKey, rawVal] of Object.entries(value as Record<string, any>)) {
        const key = rawKey.startsWith('$') || rawKey.includes('.') || rawKey.includes('[') || rawKey.includes(']')
            ? rawKey.replace(/\$/g, '_').replace(/\./g, '_').replace(/\[|\]/g, '_')
            : rawKey;

        if (key !== rawKey && getEnv().LOG_ERRORS) {
            console.warn(`⚠️  Sanitized MongoDB operator in ${key}`);
        }

        out[key] = sanitizeMongoKeys(rawVal);
    }
    return out;
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
    if (!req.query || typeof req.query !== 'object') {
        return next();
    }
     const sanitizedQuery: Record<string, unknown> = {};
    const seen = new Set<string>();

    for (const key of Object.keys(req.query)) {
         const value = req.query[key];

        if (!ALLOWED_DUPLICATES.includes(key) && Array.isArray(value)) {
            sanitizedQuery[key] = value[0];
            continue;
        }

        if (seen.has(key) && !ALLOWED_DUPLICATES.includes(key)) {
           sanitizedQuery[key] = Array.isArray(value) ? value[0] : value;
        }
        else {
            sanitizedQuery[key] = value;
        }
        seen.add(key);
    }

    Object.defineProperty(req, 'query', {
        value: sanitizedQuery,
        writable: true,
        configurable: true,
    });

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
