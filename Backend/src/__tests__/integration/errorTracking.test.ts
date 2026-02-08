// Backend/src/__tests__/integration/errorTracking.test.ts - Phase 20: Error Tracking Tests

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import { validateEnv } from '../../lib/env.js';
import { metrics, getMetrics, resetMetrics } from '../../lib/metrics.js';
import { logger } from '../../lib/logger.js';
import { errorHandler } from '../../middlewares/errorHandler.js';
import {
    ValidationError,
    NotFoundError,
    InternalError,
    RateLimitError,
} from '../../utils/errors.js';

describe('Error Tracking Integration Tests', () => {
    let app: express.Application;

    before(() => {
        // Initialize environment before running tests
        process.env.NODE_ENV = 'test';
        process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.PORT = '5001';
        process.env.CORS_ORIGIN = '*';
        process.env.LOG_ERRORS = 'false';
        process.env.EXPOSE_STACK_TRACES = 'true';
        
        validateEnv();
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());
        resetMetrics();
    });

    afterEach(() => {
        resetMetrics();
    });

    describe('Error Metrics Tracking', () => {
        it('should track validation errors in metrics', async () => {
            app.get('/test', (req, res, next) => {
                next(new ValidationError('Test validation error'));
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(400);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find VALIDATION_ERROR metric in output');
            const count = match[1] as string;
            assert.strictEqual(parseInt(count, 10), 1, 'Should have exactly 1 VALIDATION_ERROR tracked');
        });

        it('should track not found errors in metrics', async () => {
            app.get('/test', (req, res, next) => {
                next(new NotFoundError('Room', '123'));
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(404);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="NOT_FOUND",severity="operational"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find NOT_FOUND metric in output');
            const count = match[1] as string;
            assert.strictEqual(parseInt(count, 10), 1, 'Should have exactly 1 NOT_FOUND error tracked');
        });

        it('should track internal errors in metrics', async () => {
            app.get('/test', (req, res, next) => {
                next(new InternalError('Test internal error'));
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(500);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="INTERNAL_ERROR",severity="internal"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find INTERNAL_ERROR metric in output');
            const count = match[1] as string;
            assert.strictEqual(parseInt(count, 10), 1, 'Should have exactly 1 INTERNAL_ERROR tracked');
        });

        it('should track rate limit errors in metrics', async () => {
            app.get('/test', (req, res, next) => {
                next(new RateLimitError());
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(429);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="RATE_LIMIT_EXCEEDED",severity="operational"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find RATE_LIMIT_EXCEEDED metric in output');
            const count = match[1] as string;
            assert.strictEqual(parseInt(count, 10), 1, 'Should have exactly 1 RATE_LIMIT_EXCEEDED error tracked');
        });

        it('should distinguish between operational and internal errors', async () => {
            app.get('/operational', (req, res, next) => {
                next(new ValidationError('Operational error'));
            });
            app.get('/internal', (req, res, next) => {
                next(new InternalError('Internal error'));
            });
            app.use(errorHandler);

            await request(app).get('/operational').expect(400);
            await request(app).get('/internal').expect(500);

            const metricsOutput = await getMetrics();
            
            const operationalMatch = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            const internalMatch = metricsOutput.match(/tarneeb_errors_total\{code="INTERNAL_ERROR",severity="internal"\}\s+(\d+)/);
            
            assert.ok(operationalMatch !== null, 'Should find operational error metric');
            assert.ok(internalMatch !== null, 'Should find internal error metric');
            
            const operationalCount = operationalMatch[1] as string;
            const internalCount = internalMatch[1] as string;
            
            assert.strictEqual(parseInt(operationalCount, 10), 1, 'Should have 1 operational error');
            assert.strictEqual(parseInt(internalCount, 10), 1, 'Should have 1 internal error');
        });
    });

    describe('Error Counter Increment', () => {
        it('should increment error counter for each error', async () => {
            app.get('/test', (req, res, next) => {
                next(new ValidationError('Test error'));
            });
            app.use(errorHandler);

            // Make 3 requests
            await request(app).get('/test').expect(400);
            await request(app).get('/test').expect(400);
            await request(app).get('/test').expect(400);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find VALIDATION_ERROR metric');
            const count = match[1] as string;
            assert.strictEqual(parseInt(count, 10), 3, 'Should have exactly 3 errors tracked');
        });

        it('should track different error types separately', async () => {
            app.get('/validation', (req, res, next) => {
                next(new ValidationError('Validation error'));
            });
            app.get('/notfound', (req, res, next) => {
                next(new NotFoundError('Resource'));
            });
            app.use(errorHandler);

            await request(app).get('/validation').expect(400);
            await request(app).get('/validation').expect(400);
            await request(app).get('/notfound').expect(404);

            const metricsOutput = await getMetrics();
            
            const validationMatch = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            const notFoundMatch = metricsOutput.match(/tarneeb_errors_total\{code="NOT_FOUND",severity="operational"\}\s+(\d+)/);
            
            assert.ok(validationMatch !== null, 'Should find VALIDATION_ERROR metric');
            assert.ok(notFoundMatch !== null, 'Should find NOT_FOUND metric');
            
            const validationCount = validationMatch[1] as string;
            const notFoundCount = notFoundMatch[1] as string;
            
            assert.strictEqual(parseInt(validationCount, 10), 2, 'Should have 2 validation errors');
            assert.strictEqual(parseInt(notFoundCount, 10), 1, 'Should have 1 not found error');
        });
    });

    describe('Error Response Format', () => {
        it('should include error code in metrics', async () => {
            app.get('/test', (req, res, next) => {
                const error = new ValidationError('Custom error');
                next(error);
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(400);

            const metricsOutput = await getMetrics();
            assert.ok(
                metricsOutput.includes('code="VALIDATION_ERROR"'),
                'Metrics should include error code label'
            );
        });

        it('should include severity in metrics', async () => {
            app.get('/test', (req, res, next) => {
                next(new ValidationError('Test error'));
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(400);

            const metricsOutput = await getMetrics();
            assert.ok(
                metricsOutput.includes('severity="operational"'),
                'Metrics should include severity label'
            );
        });
    });

    describe('Metrics Reset', () => {
        it('should reset error counters when metrics are reset', async () => {
            app.get('/test', (req, res, next) => {
                next(new ValidationError('Test error'));
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(400);

            // Reset metrics
            resetMetrics();

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            
            // After reset, the metric might not exist or should be 0
            if (match !== null) {
                const count = match[1] as string;
                assert.strictEqual(
                    parseInt(count, 10),
                    0,
                    'Error counter should be 0 after reset'
                );
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle unknown error types', async () => {
            app.get('/test', (req, res, next) => {
                next(new Error('Unknown error'));
            });
            app.use(errorHandler);

            await request(app).get('/test').expect(500);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="INTERNAL_ERROR",severity="internal"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should track unknown errors as INTERNAL_ERROR');
            const count = match[1] as string;
            assert.strictEqual(parseInt(count, 10), 1, 'Should have 1 internal error');
        });
    });
});