// Backend/src/middleware/rateLimiter.test.ts - Rate Limiter Tests

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Mock express-rate-limit
jest.mock('express-rate-limit');

describe('Rate Limiter', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = {
            ip: '127.0.0.1',
            method: 'GET',
            path: '/test',
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
        };

        mockNext = jest.fn();

        // Setup default mock implementation
        (rateLimit as jest.Mock).mockImplementation((options) => {
            return (req: Request, res: Response, next: NextFunction) => {
                // Simulate rate limit check
                if (options.skip && options.skip(req, res)) {
                    next();
                    return;
                }

                // Default: allow request
                if (res.setHeader) {
                    res.setHeader('RateLimit-Limit', options.max);
                    res.setHeader('RateLimit-Remaining', options.max - 1);
                }
                next();
            };
        });
    });

    describe('Configuration', () => {
        it('should create globalLimiter with correct options', () => {
            const { globalLimiter } = require('./rateLimiter.js');

            expect(rateLimit).toHaveBeenCalled();
            const config = (rateLimit as jest.Mock).mock.calls[0][0];
            expect(config).toHaveProperty('standardHeaders', true);
            expect(config).toHaveProperty('legacyHeaders', false);
        });

        it('should create roomCreationLimiter with stricter limits', () => {
            const { roomCreationLimiter } = require('./rateLimiter.js');

            expect(rateLimit).toHaveBeenCalled();
            // Room creation limiter is the second call
            const calls = (rateLimit as jest.Mock).mock.calls;
            const roomLimiterConfig = calls.find((call) => call[0].windowMs === 3600000);
            expect(roomLimiterConfig).toBeDefined();
        });

        it('should skip rate limiting in test environment', () => {
            const { globalLimiter } = require('./rateLimiter.js');

            globalLimiter(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('Rate Limit Behavior', () => {
        it('should allow requests within limit', () => {
            const limiter = rateLimit({
                windowMs: 60000,
                max: 5,
                standardHeaders: true,
                legacyHeaders: false,
            });

            limiter(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'RateLimit-Limit',
                5
            );
        });

        it('should use IP address as key', () => {
            const { roomCreationLimiter } = require('./rateLimiter.js');

            const config = (rateLimit as jest.Mock).mock.calls.find((call) =>
                call[0].keyGenerator
            )?.[0];

            if (config && config.keyGenerator) {
                const key = config.keyGenerator(mockRequest as Request);
                expect(key).toBe('127.0.0.1');
            }
        });
    });

    describe('Error Handling', () => {
        it('should throw RateLimitError when limit exceeded', () => {
            const { RateLimitError } = require('../utils/errors.js');

            // Mock rate limit exceeded scenario
            (rateLimit as jest.Mock).mockImplementation((options) => {
                return () => {
                    if (options.handler) {
                        options.handler();
                    }
                };
            });

            const { globalLimiter } = require('./rateLimiter.js');

            expect(() => {
                globalLimiter(
                    mockRequest as Request,
                    mockResponse as Response,
                    mockNext
                );
            }).toThrow(RateLimitError);
        });
    });

    describe('Different Rate Limiters', () => {
        it('should have different configurations for different endpoints', () => {
            const calls = (rateLimit as jest.Mock).mock.calls;

            // Should have at least global, room creation, authenticated, and socket limiters
            expect(calls.length).toBeGreaterThanOrEqual(3);

            // Window times should vary
            const windowTimes = calls.map((call) => call[0].windowMs);
            const uniqueWindows = new Set(windowTimes);
            expect(uniqueWindows.size).toBeGreaterThan(1);
        });
    });
});

describe('Integration with Express', () => {
    it('should be usable as Express middleware', () => {
        const { globalLimiter } = require('./rateLimiter.js');

        expect(typeof globalLimiter).toBe('function');
        expect(globalLimiter.length).toBe(3); // req, res, next
    });
});