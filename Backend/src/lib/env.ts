// Backend/src/lib/env.ts - Phase 19: Environment Variable Validation

import { z } from 'zod';

/**
 * Environment schema - defines all required and optional env vars
 * App will fail to boot if validation fails
 */
const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
    PORT: z.coerce.number().optional().default(5000),

    // MongoDB
    MONGO_URI: z.string().url(),
    MONGO_MAX_POOL_SIZE: z.coerce.number().optional().default(10),
    MONGO_MIN_POOL_SIZE: z.coerce.number().optional().default(2),
    MONGO_RETRY_WRITES: z
        .string()
        .optional()
        .default('true')
        .transform((val) => val !== 'false'),
    MONGO_WRITE_CONCERN: z.string().optional().default('majority'),

    // Redis
    REDIS_URL: z.string().url(),

    // CORS
    CORS_ORIGIN: z.string().optional().default('*'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().optional().default(900000), // 15 min
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().optional().default(100),
    ROOM_CREATION_LIMIT: z.coerce.number().optional().default(3),

    // Security
    ENABLE_STRICT_VALIDATION: z
        .string()
        .optional()
        .default('true')
        .transform((val) => val === 'true'),
    LOG_ERRORS: z
        .string()
        .optional()
        .default('true')
        .transform((val) => val === 'true'),
    EXPOSE_STACK_TRACES: z
        .string()
        .optional()
        .default('false')
        .transform((val) => val === 'true'), // Never in production
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validate environment variables at startup
 * Throws error and exits if validation fails
 */
export function validateEnv(): Env {
    if (validatedEnv) {
        return validatedEnv;
    }

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment configuration:');
        console.error(JSON.stringify(result.error.format(), null, 2));
        process.exit(1);
    }

    validatedEnv = result.data;

    // Override for tests
    if (validatedEnv.NODE_ENV === 'test') {
        validatedEnv.LOG_ERRORS = false;
    }

    console.log('✅ Environment variables validated');
    return validatedEnv;
}

/**
 * Get validated environment variables
 * Throws if not yet validated
 */
export function getEnv(): Env {
    if (!validatedEnv) {
        throw new Error('Environment not validated. Call validateEnv() first.');
    }
    return validatedEnv;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
    return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
    return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
    return getEnv().NODE_ENV === 'test';
}