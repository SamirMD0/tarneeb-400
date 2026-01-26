import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not defined');
}

const isProduction = process.env.NODE_ENV === 'production';

const redisClient: RedisClientType = createClient({
    url: REDIS_URL,
    socket: {
        tls: isProduction, // TLS for Upstash (rediss://)
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis max reconnection attempts reached');
                return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
        },
    },
});

redisClient.on('connect', () => {
    console.log('Redis client connected');
});

redisClient.on('ready', () => {
    console.log('Redis client ready');
});

redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
});

let isConnected = false;

export async function connectRedis(): Promise<RedisClientType> {
    if (isConnected) {
        return redisClient;
    }

    try {
        await redisClient.connect();
        isConnected = true;
        return redisClient;
    } catch (error) {
        console.error('Redis connection error:', error);
        throw error;
    }
}

export async function disconnectRedis(): Promise<void> {
    if (!isConnected) return;
    await redisClient.quit();
    isConnected = false;
    console.log('Redis disconnected');
}

export async function pingRedis(): Promise<boolean> {
    try {
        const pong = await redisClient.ping();
        return pong === 'PONG';
    } catch {
        return false;
    }
}

export { redisClient };
