import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectMongo } from './lib/mongoose.js';
import { connectRedis } from './lib/redisClient.js';
import healthRouter from './routes/health.js';

const PORT = process.env.PORT || 5000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);

async function bootstrap(): Promise<void> {
    await connectMongo();
    await connectRedis();

    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

export { app, io };
