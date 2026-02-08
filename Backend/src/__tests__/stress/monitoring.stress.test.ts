// Backend/src/__tests__/integration/monitoring.stress.test.ts - Phase 20: Stress Tests

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import { validateEnv } from '../../lib/env.js';
import { metrics, getMetrics, resetMetrics, httpRequestDuration } from '../../lib/metrics.js';
import { errorHandler } from '../../middlewares/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';

describe('Monitoring Stress Tests', () => {
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
        
        // Add request duration tracking middleware
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
        
        resetMetrics();
    });

    afterEach(() => {
        resetMetrics();
    });

    describe('High Volume Error Tracking', () => {
        it('should handle 100 concurrent errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new ValidationError('Test error'));
            });
            app.use(errorHandler);

            const requests = Array(100).fill(null).map(() =>
                request(app).get('/test').expect(400)
            );

            await Promise.all(requests);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find VALIDATION_ERROR metric');
            const count = match[1] as string;
            assert.strictEqual(
                parseInt(count, 10),
                100,
                'Should track all 100 errors correctly'
            );
        });

        it('should handle 1000 sequential errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new ValidationError('Test error'));
            });
            app.use(errorHandler);

            for (let i = 0; i < 1000; i++) {
                await request(app).get('/test').expect(400);
            }

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find VALIDATION_ERROR metric');
            const count = match[1] as string;
            assert.strictEqual(
                parseInt(count, 10),
                1000,
                'Should track all 1000 errors correctly'
            );
        });
    });

    describe('Request Duration Tracking Under Load', () => {
        it('should track request durations for 50 concurrent requests', async () => {
            app.get('/test', (req, res) => {
                res.status(200).json({ success: true });
            });

            const requests = Array(50).fill(null).map(() =>
                request(app).get('/test').expect(200)
            );

            await Promise.all(requests);

            const metricsOutput = await getMetrics();
            const match = metricsOutput.match(/tarneeb_http_request_duration_seconds_count\{method="GET",route="\/test",status_code="200"\}\s+(\d+)/);
            
            assert.ok(match !== null, 'Should find request duration metric');
            const count = match[1] as string;
            assert.strictEqual(
                parseInt(count, 10),
                50,
                'Should track all 50 request durations'
            );
        });

        it('should track histogram buckets correctly', async () => {
            app.get('/test', (req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app).get('/test').expect(200);

            const metricsOutput = await getMetrics();
            
            // Check that histogram buckets exist
            assert.ok(
                metricsOutput.includes('tarneeb_http_request_duration_seconds_bucket'),
                'Should include histogram buckets'
            );
            
            // Check for various bucket thresholds
            assert.ok(
                metricsOutput.includes('le="0.005"'),
                'Should include 5ms bucket'
            );
            assert.ok(
                metricsOutput.includes('le="0.01"'),
                'Should include 10ms bucket'
            );
            assert.ok(
                metricsOutput.includes('le="+Inf"'),
                'Should include infinity bucket'
            );
        });
    });

    describe('Mixed Load Scenarios', () => {
        it('should handle mixed success and error requests', async () => {
            app.get('/success', (req, res) => {
                res.status(200).json({ success: true });
            });
            app.get('/error', (req, res, next) => {
                next(new ValidationError('Test error'));
            });
            app.use(errorHandler);

            const requests = [
                ...Array(50).fill(null).map(() => request(app).get('/success').expect(200)),
                ...Array(50).fill(null).map(() => request(app).get('/error').expect(400)),
            ];

            await Promise.all(requests);

            const metricsOutput = await getMetrics();
            
            const successMatch = metricsOutput.match(/tarneeb_http_request_duration_seconds_count\{method="GET",route="\/success",status_code="200"\}\s+(\d+)/);
            const errorMatch = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            
            assert.ok(successMatch !== null, 'Should find success request metric');
            assert.ok(errorMatch !== null, 'Should find error metric');
            
            const successCount = successMatch[1] as string;
            const errorCount = errorMatch[1] as string;
            
            assert.strictEqual(parseInt(successCount, 10), 50, 'Should track 50 successful requests');
            assert.strictEqual(parseInt(errorCount, 10), 50, 'Should track 50 errors');
        });

        it('should handle rapid error type switching', async () => {
            let counter = 0;
            app.get('/test', (req, res, next) => {
                if (counter++ % 2 === 0) {
                    next(new ValidationError('Validation error'));
                } else {
                    res.status(200).json({ success: true });
                }
            });
            app.use(errorHandler);

            const requests = Array(100).fill(null).map(() =>
                request(app).get('/test')
            );

            await Promise.all(requests);

            const metricsOutput = await getMetrics();
            
            const errorMatch = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            const successMatch = metricsOutput.match(/tarneeb_http_request_duration_seconds_count\{method="GET",route="\/test",status_code="200"\}\s+(\d+)/);
            
            assert.ok(errorMatch !== null, 'Should find error metric');
            assert.ok(successMatch !== null, 'Should find success metric');
            
            const errorCount = errorMatch[1] as string;
            const successCount = successMatch[1] as string;
            
            // Should have roughly 50 of each (allowing for race conditions)
            const errorTotal = parseInt(errorCount, 10);
            const successTotal = parseInt(successCount, 10);
            
            assert.ok(
                errorTotal >= 45 && errorTotal <= 55,
                `Error count ${errorTotal} should be around 50`
            );
            assert.ok(
                successTotal >= 45 && successTotal <= 55,
                `Success count ${successTotal} should be around 50`
            );
        });
    });

    describe('Memory and Performance', () => {
        it('should not leak memory with many requests', async () => {
            app.get('/test', (req, res) => {
                res.status(200).json({ success: true });
            });

            const initialMemory = process.memoryUsage().heapUsed;

            // Make 1000 requests
            for (let i = 0; i < 1000; i++) {
                await request(app).get('/test').expect(200);
                
                // Force garbage collection periodically if available
                if (i % 100 === 0 && global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

            assert.ok(
                memoryIncreaseMB < 50,
                `Memory increase ${memoryIncreaseMB.toFixed(2)}MB should be less than 50MB`
            );
        });

        it('should maintain performance under sustained load', async () => {
            app.get('/test', (req, res) => {
                res.status(200).json({ success: true });
            });

            const startTime = Date.now();
            const requests = Array(100).fill(null).map(() =>
                request(app).get('/test').expect(200)
            );

            await Promise.all(requests);
            const duration = Date.now() - startTime;

            assert.ok(
                duration < 5000,
                `100 concurrent requests should complete in less than 5s, took ${duration}ms`
            );
        });
    });

    describe('Metrics Endpoint Performance', () => {
        it('should serve metrics quickly under load', async () => {
            // Generate some metrics
            app.get('/test', (req, res) => {
                res.status(200).json({ success: true });
            });

            const setupRequests = Array(100).fill(null).map(() =>
                request(app).get('/test').expect(200)
            );
            await Promise.all(setupRequests);

            // Time metrics retrieval
            const startTime = Date.now();
            await getMetrics();
            const duration = Date.now() - startTime;

            assert.ok(
                duration < 100,
                `Metrics retrieval should take less than 100ms, took ${duration}ms`
            );
        });

        it('should handle concurrent metrics requests', async () => {
            app.get('/test', (req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app).get('/test').expect(200);

            const metricsRequests = Array(10).fill(null).map(() =>
                getMetrics()
            );

            const results = await Promise.all(metricsRequests);
            
            assert.strictEqual(
                results.length,
                10,
                'Should handle 10 concurrent metrics requests'
            );
            
            // All results should be valid
            results.forEach((result, index) => {
                assert.ok(
                    result.includes('tarneeb_http_request_duration_seconds'),
                    `Result ${index} should contain valid metrics`
                );
            });
        });
    });

    describe('Error Recovery', () => {
        it('should continue tracking after errors', async () => {
            app.get('/error', (req, res, next) => {
                next(new ValidationError('Test error'));
            });
            app.get('/success', (req, res) => {
                res.status(200).json({ success: true });
            });
            app.use(errorHandler);

            // Generate errors
            await Promise.all(
                Array(50).fill(null).map(() => request(app).get('/error').expect(400))
            );

            // Then successful requests
            await Promise.all(
                Array(50).fill(null).map(() => request(app).get('/success').expect(200))
            );

            const metricsOutput = await getMetrics();
            
            const errorMatch = metricsOutput.match(/tarneeb_errors_total\{code="VALIDATION_ERROR",severity="operational"\}\s+(\d+)/);
            const successMatch = metricsOutput.match(/tarneeb_http_request_duration_seconds_count\{method="GET",route="\/success",status_code="200"\}\s+(\d+)/);
            
            assert.ok(errorMatch !== null, 'Should track errors');
            assert.ok(successMatch !== null, 'Should track successes after errors');
            
            const errorCount = errorMatch[1] as string;
            const successCount = successMatch[1] as string;
            
            assert.strictEqual(parseInt(errorCount, 10), 50, 'Should have 50 errors');
            assert.strictEqual(parseInt(successCount, 10), 50, 'Should have 50 successes');
        });
    });
});