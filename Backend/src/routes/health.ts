import { Router, Request, Response } from 'express';
import { pingMongo, getMongoStats, type MongoStats } from '../lib/mongoose.js';
import { redis, type RedisHealthStats } from '../lib/redis.js';

const router = Router();

interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    mongo: boolean;
    redis: boolean;
    timestamp: string;
    mongoStats?: MongoStats;
    redisStats?: RedisHealthStats;
    uptime: number;
}

router.get('/health', async (_req: Request, res: Response) => {
    const [mongoOk, redisOk, mongoStats, redisStats] = await Promise.all([
        pingMongo(),
        redis.ping(),
        getMongoStats(),
        redis.getStats(),
    ]);

    const health: HealthStatus = {
        status: mongoOk && redisOk ? 'healthy' : 'unhealthy',
        mongo: mongoOk,
        redis: redisOk,
        timestamp: new Date().toISOString(),
        mongoStats,
        redisStats,
        uptime: process.uptime(),
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

export default router;
