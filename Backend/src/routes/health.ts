import { Router, Request, Response } from 'express';
import { pingMongo } from '../lib/mongoose.js';
import { pingRedis } from '../lib/redisClient.js';

const router = Router();

interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    mongo: boolean;
    redis: boolean;
    timestamp: string;
}

router.get('/health', async (_req: Request, res: Response) => {
    const [mongoOk, redisOk] = await Promise.all([pingMongo(), pingRedis()]);

    const health: HealthStatus = {
        status: mongoOk && redisOk ? 'healthy' : 'unhealthy',
        mongo: mongoOk,
        redis: redisOk,
        timestamp: new Date().toISOString(),
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

export default router;
