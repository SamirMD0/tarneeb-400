// Backend/src/lib/mongoose.ts - Phase 15: Production-Grade MongoDB Connection

import mongoose from 'mongoose';

// Environment configuration with defaults
const MONGO_URI = process.env.MONGO_URI;
const MAX_POOL_SIZE = parseInt(process.env.MONGO_MAX_POOL_SIZE ?? '10', 10);
const MIN_POOL_SIZE = parseInt(process.env.MONGO_MIN_POOL_SIZE ?? '2', 10);
const RETRY_WRITES = process.env.MONGO_RETRY_WRITES !== 'false';
const WRITE_CONCERN = process.env.MONGO_WRITE_CONCERN ?? 'majority';

if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not defined');
}

const isProduction = process.env.NODE_ENV === 'production';

const mongooseOptions: mongoose.ConnectOptions = {
    autoIndex: !isProduction,
    maxPoolSize: MAX_POOL_SIZE,
    minPoolSize: MIN_POOL_SIZE,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: RETRY_WRITES,
    w: WRITE_CONCERN as 'majority' | number,
};

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000;

// Connection state event listeners
function setupEventListeners(): void {
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        isConnected = true;
    });
}

// Exponential backoff delay
function getRetryDelay(attempt: number): number {
    return BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
}

export async function connectMongo(): Promise<typeof mongoose> {
    if (isConnected) {
        return mongoose;
    }

    setupEventListeners();

    while (connectionAttempts < MAX_RETRY_ATTEMPTS) {
        try {
            const conn = await mongoose.connect(MONGO_URI as string, mongooseOptions);
            isConnected = true;
            connectionAttempts = 0; // Reset on success
            console.log(`MongoDB connected: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            connectionAttempts++;
            console.error(
                `MongoDB connection attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS} failed:`,
                error
            );

            if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
                console.error('Max MongoDB connection attempts reached. Exiting.');
                process.exit(1);
            }

            const delay = getRetryDelay(connectionAttempts);
            console.log(`Retrying MongoDB connection in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw new Error('MongoDB connection failed');
}

export async function disconnectMongo(): Promise<void> {
    if (!isConnected) return;
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
}

// Graceful shutdown handler
export function setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
        console.log(`${signal} received. Closing MongoDB connection...`);
        await disconnectMongo();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export async function pingMongo(): Promise<boolean> {
    try {
        if (!mongoose.connection.db) return false;
        await mongoose.connection.db.admin().ping();
        return true;
    } catch {
        return false;
    }
}

// Health check stats for enhanced monitoring
export interface MongoStats {
    isConnected: boolean;
    version?: string;
    poolSize: number;
    currentConnections?: number;
    availableConnections?: number;
    host?: string;
}

export async function getMongoStats(): Promise<MongoStats> {
    const stats: MongoStats = {
        isConnected,
        poolSize: MAX_POOL_SIZE,
    };

    if (!mongoose.connection.db) {
        return stats;
    }

    try {
        const adminDb = mongoose.connection.db.admin();
        const serverInfo = await adminDb.serverInfo();
        stats.version = serverInfo.version;
        stats.host = mongoose.connection.host ?? undefined;

        // Get server status for connection pool info
        const serverStatus = await adminDb.serverStatus();
        if (serverStatus.connections) {
            stats.currentConnections = serverStatus.connections.current;
            stats.availableConnections = serverStatus.connections.available;
        }
    } catch {
        // Stats are best-effort, don't fail the health check
    }

    return stats;
}

export { mongoose };
