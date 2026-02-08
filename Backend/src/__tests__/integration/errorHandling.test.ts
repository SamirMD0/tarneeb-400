// Backend/src/__tests__/integration/errorHandling.test.ts - Integration Tests

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import express, { Express } from 'express';
import request from 'supertest';
import { validateEnv } from '../../lib/env.js';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler.js';
import { validate, CreateRoomSchema } from '../../middlewares/validator.js';
import { globalLimiter, roomCreationLimiter } from '../../middlewares/rateLimiter.js';
import {
    sanitizeMongoQueries,
    sanitizeXSS,
    preventHPP,
} from '../../middlewares/sanitization.js';
import {
    ValidationError,
    NotFoundError,
    RateLimitError,
} from '../../utils/errors.js';

describe('Error Handling Integration Tests', () => {
    let app: Express;

    before(() => {
        // Initialize environment before running any tests
        process.env.NODE_ENV = 'test';
        process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.PORT = '5001';
        process.env.CORS_ORIGIN = '*';
        process.env.LOG_ERRORS = 'false';
        process.env.EXPOSE_STACK_TRACES = 'true';
        process.env.RATE_LIMIT_WINDOW_MS = '900000';
        process.env.RATE_LIMIT_MAX_REQUESTS = '100';
        process.env.ROOM_CREATION_LIMIT = '3';
        
        validateEnv();
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());

        // Apply security middleware
        app.use(sanitizeMongoQueries);
        app.use(sanitizeXSS);
        app.use(preventHPP);
    });

    describe('Validation Errors', () => {
        beforeEach(() => {
            app.post(
                '/rooms',
                validate(CreateRoomSchema, 'body'),
                (req, res) => {
                    res.status(201).json({ success: true, data: req.body });
                }
            );

            app.use(errorHandler);
        });

        it('should return 400 for invalid room configuration', async () => {
            const response = await request(app)
                .post('/rooms')
                .send({
                    config: {
                        maxPlayers: 5, // Invalid: should be 4
                    },
                })
                .expect(400);

            assert.ok(response.body.error, 'Should have error object');
            assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR');
            assert.strictEqual(response.body.error.message, 'Request validation failed');
            assert.ok(response.body.error.details, 'Should have error details');
        });

        it('should accept valid room configuration', async () => {
            const response = await request(app)
                .post('/rooms')
                .send({
                    config: {
                        maxPlayers: 4,
                        targetScore: 41,
                    },
                })
                .expect(201);

            assert.strictEqual(response.body.success, true);
        });

        it('should provide detailed validation errors', async () => {
            const response = await request(app)
                .post('/rooms')
                .send({
                    config: {
                        maxPlayers: 3,
                        targetScore: 300,
                    },
                })
                .expect(400);

            assert.ok(response.body.error.details.errors, 'Should have detailed errors');
            assert.ok(Array.isArray(response.body.error.details.errors), 'Errors should be array');
            assert.ok(
                response.body.error.details.errors.length >= 2,
                'Should have at least 2 validation errors'
            );
        });
    });

    describe('Not Found Errors', () => {
        beforeEach(() => {
            app.get('/rooms/:id', (req, res, next) => {
                next(new NotFoundError('Room', req.params.id));
            });

            app.use(errorHandler);
        });

        it('should return 404 for non-existent room', async () => {
            const response = await request(app)
                .get('/rooms/nonexistent')
                .expect(404);

            assert.ok(response.body.error, 'Should have error object');
            assert.strictEqual(response.body.error.code, 'NOT_FOUND');
            assert.ok(
                response.body.error.message.includes('nonexistent'),
                'Error message should include room ID'
            );
            assert.strictEqual(response.body.path, '/rooms/nonexistent');
        });
    });

    describe('XSS Protection', () => {
        beforeEach(() => {
            app.post('/echo', (req, res) => {
                res.json({ received: req.body });
            });

            app.use(errorHandler);
        });

        it('should sanitize script tags from request body', async () => {
            const response = await request(app)
                .post('/echo')
                .send({
                    name: '<script>alert("xss")</script>John',
                })
                .expect(200);

            assert.ok(!response.body.received.name.includes('<script>'), 'Should remove script tags');
            assert.ok(response.body.received.name.includes('John'), 'Should keep valid content');
        });

        it('should remove javascript: protocol', async () => {
            const response = await request(app)
                .post('/echo')
                .send({
                    url: 'javascript:alert(1)',
                })
                .expect(200);

            assert.ok(!response.body.received.url.includes('javascript:'), 'Should remove javascript: protocol');
        });

        it('should sanitize nested objects', async () => {
            const response = await request(app)
                .post('/echo')
                .send({
                    user: {
                        name: '<img src=x onerror=alert(1)>',
                        bio: '<b>Hello</b>',
                    },
                })
                .expect(200);

            assert.ok(!response.body.received.user.name.includes('<img'), 'Should remove img tags');
            assert.ok(!response.body.received.user.bio.includes('<b>'), 'Should remove b tags');
        });
    });

    describe('MongoDB Injection Protection', () => {
        beforeEach(() => {
            app.get('/users', (req, res) => {
                res.json({ query: req.query });
            });

            app.use(errorHandler);
        });

        it('should sanitize MongoDB operators in query', async () => {
            const response = await request(app)
                .get('/users')
                .query({ name: { $ne: null } })
                .expect(200);

            // MongoDB operators should be replaced
            const queryStr = JSON.stringify(response.body.query);
            assert.ok(!queryStr.includes('$ne'), 'Should sanitize $ne operator');
        });

        it('should sanitize dot notation attacks', async () => {
            const response = await request(app)
                .get('/users')
                .query({ 'user.password': 'exposed' })
                .expect(200);

            const queryStr = JSON.stringify(response.body.query);
            // Dots in keys should be replaced
            assert.ok(!queryStr.match(/user\.password/), 'Should sanitize dot notation');
        });
    });

    describe('HTTP Parameter Pollution', () => {
        beforeEach(() => {
            app.get('/items', (req, res) => {
                res.json({ query: req.query });
            });

            app.use(errorHandler);
        });

        it('should prevent duplicate parameters', async () => {
            const response = await request(app)
                .get('/items?page=1&page=2')
                .expect(200);

            // Should only keep first value
            assert.strictEqual(response.body.query.page, '1');
        });

        it('should allow whitelisted duplicate parameters', async () => {
            const response = await request(app)
                .get('/items?sort=name&sort=date')
                .expect(200);

            // 'sort' is whitelisted, can be array
            assert.ok(Array.isArray(response.body.query.sort), 'Sort should be an array');
        });
    });

    describe('404 Handler', () => {
        beforeEach(() => {
            app.get('/existing', (req, res) => {
                res.json({ exists: true });
            });

            app.use(notFoundHandler);
        });

        it('should return 404 for unknown routes', async () => {
            const response = await request(app)
                .get('/unknown')
                .expect(404);

            assert.ok(response.body.error, 'Should have error object');
            assert.strictEqual(response.body.error.code, 'NOT_FOUND');
            assert.ok(
                response.body.error.message.includes('GET /unknown'),
                'Error should include method and path'
            );
        });

        it('should not affect existing routes', async () => {
            await request(app).get('/existing').expect(200);
        });
    });

    describe('Error Response Format', () => {
        beforeEach(() => {
            app.get('/error', (req, res, next) => {
                next(new ValidationError('Test error'));
            });

            app.use(errorHandler);
        });

        it('should include timestamp in ISO format', async () => {
            const response = await request(app).get('/error').expect(400);

            assert.ok(response.body.timestamp, 'Should have timestamp');
            assert.ok(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.body.timestamp),
                'Timestamp should be in ISO format'
            );
        });

        it('should include request path', async () => {
            const response = await request(app).get('/error').expect(400);

            assert.strictEqual(response.body.path, '/error');
        });

        it('should include error code', async () => {
            const response = await request(app).get('/error').expect(400);

            assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR');
        });

        it('should include error message', async () => {
            const response = await request(app).get('/error').expect(400);

            assert.strictEqual(response.body.error.message, 'Test error');
        });
    });

    describe('Unhandled Errors', () => {
        beforeEach(() => {
            app.get('/crash', (req, res, next) => {
                next(new Error('Unexpected error'));
            });

            app.use(errorHandler);
        });

        it('should return 500 for unknown errors', async () => {
            const response = await request(app).get('/crash').expect(500);

            assert.ok(response.body.error, 'Should have error object');
            assert.strictEqual(response.body.error.code, 'INTERNAL_ERROR');
            assert.strictEqual(response.body.error.message, 'Unexpected error');
        });
    });

    describe('Multiple Middleware Integration', () => {
        beforeEach(() => {
            app.post(
                '/secure',
                validate(CreateRoomSchema, 'body'),
                (req, res) => {
                    res.json({ success: true });
                }
            );

            app.use(errorHandler);
        });

        it('should apply all security layers', async () => {
            const response = await request(app)
                .post('/secure')
                .send({
                    config: {
                        maxPlayers: '<script>4</script>',
                        playerName: 'javascript:alert(1)John',
                    },
                })
                .expect(400); // Validation will fail due to type mismatch

            // XSS should be sanitized before validation
            // Even though validation fails, no XSS should pass through
            assert.ok(response.body.error, 'Should have validation error');
        });
    });
});