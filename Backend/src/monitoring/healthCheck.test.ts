// Backend/src/monitoring/healthCheck.test.ts - Phase 20: Health Check Tests

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { validateEnv } from '../lib/env.js';

// Set env vars before imports that depend on them
before(() => {
    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PORT = '5001';
    process.env.CORS_ORIGIN = '*';
    process.env.LOG_ERRORS = 'false';
    process.env.EXPOSE_STACK_TRACES = 'true';
    
    validateEnv();
});

import express from 'express';
import request from 'supertest';
import healthRouter from './healthCheck.js';
import { getMetrics } from '../lib/metrics.js';

describe('Health Check Endpoints', () => {
    let app: express.Application;

    before(() => {
        app = express();
        app.use('/api', healthRouter);
        app.get('/metrics', async (req, res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.send(await getMetrics());
        });
    });

    it('should expose /metrics endpoint', async () => {
        const res = await request(app).get('/metrics');
        assert.strictEqual(res.status, 200);
        assert.ok(res.text.includes('tarneeb_active_rooms_total'));
    });

    it('should expose /api/health endpoint', async () => {
        const res = await request(app).get('/api/health');
        // It might be 503 if mongo/redis are down in test env, but it should respond with json
        assert.ok(res.status === 200 || res.status === 503);
        assert.ok(res.body.status);
    });

    it('should have correct response structure for /api/health', async () => {
        const res = await request(app).get('/api/health');
        
        assert.ok(res.body.status !== undefined, 'Should have status field');
        assert.ok(res.body.uptime !== undefined, 'Should have uptime field');
        assert.ok(res.body.mongodb !== undefined, 'Should have mongodb field');
        assert.ok(res.body.redis !== undefined, 'Should have redis field');
        assert.ok(res.body.timestamp !== undefined, 'Should have timestamp field');
    });

    it('should expose /api/health/live endpoint', async () => {
        const res = await request(app).get('/api/health/live');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, 'ok');
    });

    it('should expose /api/health/ready endpoint', async () => {
        const res = await request(app).get('/api/health/ready');
        // May be 200 or 503 depending on dependencies
        assert.ok(res.status === 200 || res.status === 503);
        assert.ok(res.body.status !== undefined);
    });

    it('should return ISO timestamp format', async () => {
        const res = await request(app).get('/api/health/live');
        assert.strictEqual(res.status, 200);
        
        const timestamp = res.body.timestamp;
        assert.ok(timestamp, 'Should have timestamp');
        assert.ok(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp),
            'Timestamp should be in ISO format'
        );
    });

    it('should include uptime in seconds', async () => {
        const res = await request(app).get('/api/health');
        
        if (res.status === 200) {
            assert.ok(typeof res.body.uptime === 'number', 'Uptime should be a number');
            assert.ok(res.body.uptime >= 0, 'Uptime should be non-negative');
        }
    });

    it('should handle concurrent health checks', async () => {
        const requests = Array(10).fill(null).map(() =>
            request(app).get('/api/health/live')
        );

        const results = await Promise.all(requests);
        
        results.forEach((res, index) => {
            assert.strictEqual(
                res.status,
                200,
                `Request ${index} should return 200`
            );
            assert.strictEqual(
                res.body.status,
                'ok',
                `Request ${index} should have ok status`
            );
        });
    });
});