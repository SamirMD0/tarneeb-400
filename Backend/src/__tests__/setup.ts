// Backend/src/__tests__/setup.ts
import { mock } from 'node:test';

// 1. Set Environment Variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGO_URI = 'mongodb://localhost:27017/tarneeb_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.CORS_ORIGIN = '*';
process.env.LOG_ERRORS = 'false'; // Keep logs clean during tests
process.env.EXPOSE_STACK_TRACES = 'true';

// 2. Define Reusable Mocks
const mockMongoose = {
    connect: async () => mockMongoose,
    connection: {
        readyState: 1,
        host: 'localhost',
        db: {
            admin: () => ({
                ping: async () => ({ ok: 1 }), // Fixes Health Check
                serverInfo: async () => ({ version: '7.0.0' }),
                serverStatus: async () => ({ connections: { current: 5 } })
            })
        }
    },
    disconnect: async () => {},
    Schema: class {},
    model: () => ({
        find: async () => [],
        findOne: async () => null,
        create: async () => ({}),
    })
};

const mockRedis = {
    createClient: () => ({
        on: () => {},
        connect: async () => {},
        isOpen: true, // Fixes Health Check
        ping: async () => 'PONG',
        get: async () => null,
        set: async () => 'OK',
        del: async () => 1,
        quit: async () => {},
        duplicate: () => mockRedis.createClient()
    })
};

// 3. Register Global Module Mocks
// This intercepts 'mongoose' and 'redis' imports EVERYWHERE in the app
// @ts-ignore - mock.module is experimental in Node 22
if (typeof mock.module === 'function') {
    // @ts-ignore
    mock.module('mongoose', { 
        defaultExport: mockMongoose,
        namedExports: mockMongoose 
    });
    
    // @ts-ignore
    mock.module('redis', { 
        namedExports: mockRedis 
    });
}

export const DEFAULT_TIMEOUT = 10000;