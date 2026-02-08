import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

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

// Phase 17/20: Socket.IO setup with handlers
import { initializeSocketServer } from './sockets/socketServer.js';
import { registerHandlers } from './sockets/socketHandlers.js';

// Phase 19: Fail-fast environment validation
const env = validateEnv();
const PORT = env.PORT;

// Phase 19: Process-level error handlers
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

const app = express();
const httpServer = createServer(app);

// Phase 17/20: Initialize Socket.IO and register handlers
const io = initializeSocketServer(httpServer);
registerHandlers(io); // ✅ CRITICAL: Register socket handlers for Phase 20 monitoring

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

// Phase 20: Request duration middleware with FIXED cardinality
app.use((req, res, next) => {
    // ✅ FIX: Use req.route?.path (bounded) instead of req.path (unbounded)
    // req.path can be ANY user input: /users/123, /users/456, etc. = infinite cardinality
    // req.route?.path is the Express route pattern: /users/:id = bounded cardinality
    const route = req.route?.path || req.path.split('/').slice(0, 3).join('/') || 'unknown';
    
    const end = httpRequestDuration.startTimer({
        method: req.method,
        route: route
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
