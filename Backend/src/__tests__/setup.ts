// Backend/src/__tests__/setup.ts - Test Configuration
import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGO_URI = 'mongodb://localhost:27017/tarneeb_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.CORS_ORIGIN = '*';
process.env.LOG_ERRORS = 'false';
process.env.EXPOSE_STACK_TRACES = 'true';

// Increase timeout for integration tests
jest.setTimeout(10000);