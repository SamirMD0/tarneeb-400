import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Phase 20: Logging & Monitoring
import { logger, lifecycle, logError } from './lib/logger.js';
import { getMetrics, getMetricsContentType, httpRequestDuration } from './lib/metrics.js';

// Phase 19: Environment validation
import { validateEnv, getEnv } from './lib/env.js';

// Phase 19: Security middleware
import { globalLimiter } from './middlewares/rateLimiter.js';
import {
    sanitizeMongoQueries,
    sanitizeXSS,
    preventHPP,
    securityHeaders,
} from './middlewares/sanitization.js';
import {
    errorHandler,
    notFoundHandler,
    handleUncaughtException,
    handleUnhandledRejection,
} from './middlewares/errorHandler.js';

import { connectMongo } from './lib/mongoose.js';
import { redis } from './lib/redis.js';
import healthRouter from './routes/health.js';

// Phase 19: Fail-fast environment validation
const env = validateEnv();
const PORT = env.PORT;

// Phase 19: Process-level error handlers
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
    },
});

// Phase 19: Security headers (must be first)
app.use(securityHeaders);

// CORS & body parsing
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// Phase 19: Rate limiting
app.use(globalLimiter);

// Phase 19: Input sanitization
app.use(sanitizeMongoQueries);
app.use(sanitizeXSS);
app.use(preventHPP);

// Phase 20: Request duration middleware
app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({
        method: req.method,
        route: req.path
    });

    res.on('finish', () => {
        end({ status_code: String(res.statusCode) });
    });

    next();
});

// Routes
app.use('/api', healthRouter);

// Phase 20: Metrics Endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', getMetricsContentType());
        res.end(await getMetrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// Phase 19: 404 handler (after all routes)
app.use(notFoundHandler);

// Phase 19: Global error handler (MUST be last)
app.use(errorHandler);

async function bootstrap(): Promise<void> {
    try {
        await connectMongo();
        logger.info('Connected to MongoDB');

        await redis.connect();
        logger.info('Connected to Redis');

        httpServer.listen(PORT, () => {
            logger.info(`✅ Server running on port ${PORT}`, {
                environment: env.NODE_ENV,
                port: PORT
            });
            lifecycle.serverStart(Number(PORT));
        });
    } catch (err) {
        logger.error('Failed to initialize server dependencies', { error: err });
        process.exit(1);
    }
}

bootstrap().catch((err) => {
    logError.uncaught(err);
    process.exit(1);
});

export { app, io };
