// Backend/src/monitoring/healthCheck.ts - Phase 20: Health Check Endpoints

import { Router, Request, Response } from 'express';
import { pingMongo, getMongoStats, type MongoStats } from '../lib/mongoose.js';
import { redis, type RedisHealthStats } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Server start time for uptime calculation
 */
const startTime = Date.now();

/**
 * Full health status including dependency checks and stats
 */
interface FullHealthStatus {
    status: 'ok' | 'degraded';
    uptime: number;
    mongodb: 'up' | 'down';
    redis: 'up' | 'down';
    timestamp: string;
    mongoStats?: MongoStats;
    redisStats?: RedisHealthStats;
}

/**
 * Health check result cache to reduce DB probe load.
 * Under Kubernetes with 5s probe intervals × N replicas, the /health
 * endpoint makes at most 1 full probe per HEALTH_CACHE_TTL_MS window.
 */
interface CachedHealth {
    data: FullHealthStatus;
    expiresAt: number;
}
let healthCache: CachedHealth | null = null;
const HEALTH_CACHE_TTL_MS = 5000; // 5 seconds

/**
 * Reset the health cache. FOR TEST USE ONLY.
 */
export function clearHealthCache(): void {
    healthCache = null;
}

/**
 * GET /health - Full health check with dependency status and stats
 * Use for debugging and detailed monitoring.
 * Results are cached for HEALTH_CACHE_TTL_MS to reduce DB/Redis probe load.
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
    const now = Date.now();

    // Return cached response if still valid
    if (healthCache && now < healthCache.expiresAt) {
        const statusCode = healthCache.data.status === 'ok' ? 200 : 503;
        res.status(statusCode).json(healthCache.data);
        return;
    }

    const [mongoOk, redisOk, mongoStats, redisStats] = await Promise.all([
        pingMongo(),
        redis.ping(),
        getMongoStats(),
        redis.getStats(),
    ]);

    const health: FullHealthStatus = {
        status: mongoOk && redisOk ? 'ok' : 'degraded',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        mongodb: mongoOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
        timestamp: new Date().toISOString(),
        mongoStats,
        redisStats,
    };

    // Cache the result
    healthCache = { data: health, expiresAt: now + HEALTH_CACHE_TTL_MS };

    const statusCode = health.status === 'ok' ? 200 : 503;

    if (health.status === 'degraded') {
        logger.warn('Health check degraded', { mongodb: mongoOk, redis: redisOk });
    }

    res.status(statusCode).json(health);
});

/**
 * GET /health/live - Liveness probe
 * Returns 200 if the server is running (no dependency checks)
 * Used by Kubernetes/Docker to determine if the container should be restarted
 */
router.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

/**
 * GET /health/ready - Readiness probe
 * Returns 200 only if all dependencies are available
 * Used by Kubernetes/load balancers to route traffic
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
    const [mongoOk, redisOk] = await Promise.all([pingMongo(), redis.ping()]);

    if (mongoOk && redisOk) {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    } else {
        res.status(503).json({
            status: 'not_ready',
            mongodb: mongoOk ? 'up' : 'down',
            redis: redisOk ? 'up' : 'down',
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
