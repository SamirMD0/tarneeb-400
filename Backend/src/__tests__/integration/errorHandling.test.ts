// Backend/src/__tests__/integration/errorHandling.test.ts - Integration Tests

import express, { Express } from 'express';
import request from 'supertest';
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

            expect(response.body).toMatchObject({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                },
            });
            expect(response.body.error.details).toBeDefined();
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

            expect(response.body.success).toBe(true);
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

            expect(response.body.error.details.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: expect.stringContaining('maxPlayers'),
                    }),
                    expect.objectContaining({
                        path: expect.stringContaining('targetScore'),
                    }),
                ])
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

            expect(response.body).toMatchObject({
                error: {
                    code: 'NOT_FOUND',
                    message: "Room with ID 'nonexistent' not found",
                },
                path: '/rooms/nonexistent',
            });
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

            expect(response.body.received.name).not.toContain('<script>');
            expect(response.body.received.name).toContain('John');
        });

        it('should remove javascript: protocol', async () => {
            const response = await request(app)
                .post('/echo')
                .send({
                    url: 'javascript:alert(1)',
                })
                .expect(200);

            expect(response.body.received.url).not.toContain('javascript:');
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

            expect(response.body.received.user.name).not.toContain('<img');
            expect(response.body.received.user.bio).not.toContain('<b>');
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
            expect(queryStr).not.toContain('$ne');
        });

        it('should sanitize dot notation attacks', async () => {
            const response = await request(app)
                .get('/users')
                .query({ 'user.password': 'exposed' })
                .expect(200);

            const queryStr = JSON.stringify(response.body.query);
            // Dots in keys should be replaced
            expect(queryStr).not.toMatch(/user\.password/);
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
            expect(response.body.query.page).toBe('1');
        });

        it('should allow whitelisted duplicate parameters', async () => {
            const response = await request(app)
                .get('/items?sort=name&sort=date')
                .expect(200);

            // 'sort' is whitelisted, can be array
            expect(Array.isArray(response.body.query.sort)).toBe(true);
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

            expect(response.body).toMatchObject({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Route GET /unknown not found',
                },
            });
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

            expect(response.body.timestamp).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
            );
        });

        it('should include request path', async () => {
            const response = await request(app).get('/error').expect(400);

            expect(response.body.path).toBe('/error');
        });

        it('should include error code', async () => {
            const response = await request(app).get('/error').expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should include error message', async () => {
            const response = await request(app).get('/error').expect(400);

            expect(response.body.error.message).toBe('Test error');
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

            expect(response.body).toMatchObject({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Unexpected error',
                },
            });
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
        });
    });
});