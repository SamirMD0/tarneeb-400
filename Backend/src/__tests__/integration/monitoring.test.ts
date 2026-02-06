// Backend/src/__tests__/integration/monitoring.test.ts

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
// Set env vars before imports that depend on them
process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';

import request from 'supertest';
import express from 'express';
import { logger } from '../../lib/logger.js';
import { metrics, getMetrics } from '../../lib/metrics.js';
import healthRouter from '../../monitoring/healthCheck.js';

describe('Monitoring Integration', () => {
    let app: express.Application;

    before(() => {
        app = express();
        app.use('/api', healthRouter);
        app.get('/metrics', async (req, res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.send(await getMetrics());
        });

        // Mock error route
        app.get('/error', (req, res) => {
            metrics.errorOccurred('TEST_ERROR', true);
            res.status(500).send('Error');
        });
    });

    it('should expose /metrics endpoint', async () => {
        const res = await request(app).get('/metrics');
        assert.strictEqual(res.status, 200);
        assert.ok(res.text.includes('tarneeb_active_rooms_total'));
    });

    it('should expose /api/health endpoint', async () => {
        const res = await request(app).get('/api/health');
        // It might be 503 if mongo/redis are down in test env, but it should respond json
        assert.ok(res.status === 200 || res.status === 503);
        assert.ok(res.body.status);
    });

    it('should track errors in metrics', async () => {
        await request(app).get('/error');

        const res = await request(app).get('/metrics');
        assert.ok(res.text.includes('tarneeb_errors_total'));
        assert.ok(res.text.includes('code="TEST_ERROR"'));
    });
});
