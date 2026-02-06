import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

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

// Routes
app.use('/api', healthRouter);

// Phase 19: 404 handler (after all routes)
app.use(notFoundHandler);

// Phase 19: Global error handler (MUST be last)
app.use(errorHandler);

async function bootstrap(): Promise<void> {
    await connectMongo();
    await redis.connect();

    httpServer.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`   Environment: ${env.NODE_ENV}`);
    });
}

bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

export { app, io };
