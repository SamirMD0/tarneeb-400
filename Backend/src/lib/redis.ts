// Backend/src/lib/redis.ts - Phase 16: Core Redis Infrastructure

import { createClient, RedisClientType } from 'redis';
import 'dotenv/config'; // Ensure env is loaded for tests

const REDIS_URL = process.env.REDIS_URL;

// We allow REDIS_URL to be undefined in test environment if we are mocking logic,
// but for real connection it must verify.
// In this refactor, we defer the check to connect() or keep it top level if critical?
// Top level check throws immediately. This breaks tests if env is missing.
// I'll move it to initialization or just warn/throw if used.
// But prompt requirements "Implement Backend/src/lib/redis.ts ... Phase 16".

// Circuit Breaker State
let failureCount = 0;
let isCircuitOpen = false;
let lastFailureTime = 0;

const MAX_RECONNECT_ATTEMPTS = 10;
const BREAKER_RESET_TIMEOUT = 30000;

// Singleton clients local to module
let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;

function setupClientListeners(client: RedisClientType, name: string) {
    client.on('connect', () => console.log(`${name} Redis client connected`));
    client.on('ready', () => {
        console.log(`${name} Redis client ready`);
        isCircuitOpen = false;
        failureCount = 0;
    });
    client.on('error', (err) => {
        console.error(`${name} Redis client error:`, err);
        handleFailure();
    });
    client.on('reconnecting', () => console.log(`${name} Redis client reconnecting...`));
}

function handleFailure() {
    failureCount++;
    lastFailureTime = Date.now();
    if (failureCount >= 5) {
        isCircuitOpen = true;
        console.warn('Redis circuit breaker OPEN - Operations Disabled');

        setTimeout(() => {
            console.log('Redis circuit breaker RESET - Trying to recover');
            isCircuitOpen = false;
            failureCount = 0;
        }, BREAKER_RESET_TIMEOUT);
    }
}

export interface RedisHealthStats {
    isConnected: boolean;
    circuitOpen: boolean;
    memory?: string;
    keys?: number;
    evicted?: number;
}

// Export a singleton object to allow mocking in tests
export const redis = {
    connect: async (): Promise<void> => {
        if (!process.env.REDIS_URL) throw new Error('REDIS_URL not defined');
        if (publisher?.isOpen && subscriber?.isOpen) return;

        const isProduction = process.env.NODE_ENV === 'production';
        const redisOptions = {
            url: process.env.REDIS_URL,
            socket: {
                tls: isProduction || process.env.REDIS_URL.startsWith('rediss://'),
                reconnectStrategy: (retries: number) => {
                    if (retries > MAX_RECONNECT_ATTEMPTS) {
                        return new Error('Max reconnection attempts reached');
                    }
                    return Math.min(retries * 100, 3000);
                },
            },
        };

        try {
            publisher = createClient(redisOptions) as RedisClientType;
            subscriber = publisher.duplicate() as RedisClientType;

            setupClientListeners(publisher, 'Publisher');
            setupClientListeners(subscriber, 'Subscriber');

            await Promise.all([publisher.connect(), subscriber.connect()]);
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    },

    disconnect: async (): Promise<void> => {
        if (publisher) {
            await publisher.quit();
            publisher = null;
        }
        if (subscriber) {
            await subscriber.quit();
            subscriber = null;
        }
        console.log('Redis disconnected');
    },

    getClient: (): RedisClientType | undefined => {
        if (isCircuitOpen || !publisher?.isOpen) return undefined;
        return publisher;
    },

    getSubscriber: (): RedisClientType | undefined => {
        if (isCircuitOpen || !subscriber?.isOpen) return undefined;
        return subscriber;
    },

    ping: async (): Promise<boolean> => {
        if (isCircuitOpen || !publisher?.isOpen) return false;
        try {
            const pong = await publisher.ping();
            return pong === 'PONG';
        } catch {
            return false;
        }
    },

    getStats: async (): Promise<RedisHealthStats> => {
        const stats: RedisHealthStats = {
            isConnected: !!publisher?.isOpen,
            circuitOpen: isCircuitOpen,
        };

        if (stats.isConnected && !isCircuitOpen && publisher) {
            try {
                const info = await publisher.info('memory');
                const memoryMatch = info.match(/used_memory_human:(\S+)/);
                if (memoryMatch) stats.memory = memoryMatch[1];

                const statsInfo = await publisher.info('stats');
                const evictedMatch = statsInfo.match(/evicted_keys:(\d+)/);
                if (evictedMatch && evictedMatch[1]) stats.evicted = parseInt(evictedMatch[1], 10);

                const keyCount = await publisher.dbSize();
                stats.keys = keyCount;
            } catch (e) {
                console.warn('Failed to fetch Redis detailed stats:', e);
            }
        }
        return stats;
    }
};

// Aliases for backward compatibility if needed, but strictly we should update consumers.
// I will update consumers (`index.ts`, `health.ts`, `roomCache.ts`).
