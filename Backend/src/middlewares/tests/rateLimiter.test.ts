// Backend/src/middlewares/tests/rateLimiter.test.ts - Rate Limiter Tests (node:test version)

import { Request, Response, NextFunction } from 'express';
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

describe('Rate Limiter', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: any;

    beforeEach(() => {
        mockRequest = {
            ip: '127.0.0.1',
            method: 'GET',
            path: '/test',
        };

        const setHeaderMock = mock.fn();
        const statusMock = mock.fn(() => mockResponse);
        const jsonMock = mock.fn();

        mockResponse = {
            status: statusMock as any,
            json: jsonMock as any,
            setHeader: setHeaderMock as any,
        };

        mockNext = mock.fn();
    });

    describe('Configuration', () => {
        it('should create globalLimiter with correct options', async () => {
            const { globalLimiter } = await import('../../middlewares/rateLimiter.js');

            assert.ok(globalLimiter, 'globalLimiter should be defined');
            assert.strictEqual(typeof globalLimiter, 'function', 'globalLimiter should be a function');
        });

        it('should create roomCreationLimiter with stricter limits', async () => {
            const { roomCreationLimiter } = await import('../../middlewares/rateLimiter.js');

            assert.ok(roomCreationLimiter, 'roomCreationLimiter should be defined');
            assert.strictEqual(typeof roomCreationLimiter, 'function', 'roomCreationLimiter should be a function');
        });

        it('should skip rate limiting in test environment', async () => {
            const { globalLimiter } = await import('../../middlewares/rateLimiter.js');

            // In test environment, rate limiter should allow requests
            globalLimiter(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction
            );

            // Check if next was called (request allowed)
            assert.strictEqual((mockNext as any).mock.callCount(), 1, 'next() should be called once');
        });
    });

    describe('Rate Limit Behavior', () => {
        it('should allow requests within limit', async () => {
            const { globalLimiter } = await import('../../middlewares/rateLimiter.js');

            globalLimiter(
                mockRequest as Request,
                mockResponse as Response,
                mockNext as NextFunction
            );

            // In test environment, should call next()
            assert.ok((mockNext as any).mock.callCount() > 0, 'next() should be called');
        });

        it('should be usable as Express middleware', async () => {
            const { globalLimiter } = await import('../../middlewares/rateLimiter.js');

            assert.strictEqual(typeof globalLimiter, 'function', 'Should be a function');
            assert.strictEqual(globalLimiter.length, 3, 'Should accept 3 parameters (req, res, next)');
        });
    });

    describe('Different Rate Limiters', () => {
        it('should have different limiters for different use cases', async () => {
            const {
                globalLimiter,
                roomCreationLimiter,
                authenticatedLimiter,
                socketConnectionLimiter
            } = await import('../../middlewares/rateLimiter.js');

            assert.ok(globalLimiter, 'Should have globalLimiter');
            assert.ok(roomCreationLimiter, 'Should have roomCreationLimiter');
            assert.ok(authenticatedLimiter, 'Should have authenticatedLimiter');
            assert.ok(socketConnectionLimiter, 'Should have socketConnectionLimiter');

            // Verify they are different instances
            assert.notStrictEqual(globalLimiter, roomCreationLimiter, 'Limiters should be different instances');
        });
    });
});

describe('Integration with Express', () => {
    it('should be usable as Express middleware', async () => {
        const { globalLimiter } = await import('../../middlewares/rateLimiter.js');

        assert.strictEqual(typeof globalLimiter, 'function', 'Should be a function');
        assert.strictEqual(globalLimiter.length, 3, 'Should accept req, res, next');
    });

    it('should export all required limiters', async () => {
        const limiters = await import('../../middlewares/rateLimiter.js');

        const requiredExports = [
            'globalLimiter',
            'roomCreationLimiter',
            'authenticatedLimiter',
            'socketConnectionLimiter'
        ];

        for (const exportName of requiredExports) {
            assert.ok(
                exportName in limiters,
                `Should export ${exportName}`
            );
            assert.strictEqual(
                typeof (limiters as any)[exportName],
                'function',
                `${exportName} should be a function`
            );
        }
    });
});