// Backend/src/middlewares/tests/errorHandler.test.ts - Error Handler Tests (node:test version)

import { Request, Response, NextFunction } from 'express';
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { errorHandler, notFoundHandler } from '../errorHandler.js';
import {
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    RateLimitError,
    InternalError,
} from '../../utils/errors.js';

describe('errorHandler', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: any;
    let statusMock: any;

    beforeEach(() => {
        jsonMock = mock.fn();
        statusMock = mock.fn(() => ({ json: jsonMock }));

        mockRequest = {
            path: '/test',
            method: 'POST',
            ip: '127.0.0.1',
            get: mock.fn() as any,
        };

        mockResponse = {
            status: statusMock,
        } as Partial<Response>;

        mockNext = mock.fn() as any;
    });

    describe('Known Errors', () => {
        it('should return 400 for ValidationError', () => {
            const error = new ValidationError('Invalid input', { field: 'name' });

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.strictEqual(statusMock.mock.callCount(), 1);
            assert.deepStrictEqual(statusMock.mock.calls[0].arguments, [400]);
            
            assert.strictEqual(jsonMock.mock.callCount(), 1);
            const response = jsonMock.mock.calls[0].arguments[0];
            assert.strictEqual(response.error.code, 'VALIDATION_ERROR');
            assert.strictEqual(response.error.message, 'Invalid input');
            assert.ok(response.timestamp);
            assert.strictEqual(response.path, '/test');
        });

        it('should return 401 for UnauthorizedError', () => {
            const error = new UnauthorizedError();

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.strictEqual(statusMock.mock.callCount(), 1);
            assert.deepStrictEqual(statusMock.mock.calls[0].arguments, [401]);
            
            const response = jsonMock.mock.calls[0].arguments[0];
            assert.strictEqual(response.error.code, 'UNAUTHORIZED');
        });

        it('should return 404 for NotFoundError', () => {
            const error = new NotFoundError('Room', '123');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.strictEqual(statusMock.mock.callCount(), 1);
            assert.deepStrictEqual(statusMock.mock.calls[0].arguments, [404]);
            
            const response = jsonMock.mock.calls[0].arguments[0];
            assert.strictEqual(response.error.code, 'NOT_FOUND');
            assert.strictEqual(response.error.message, "Room with ID '123' not found");
        });

        it('should return 429 for RateLimitError', () => {
            const error = new RateLimitError();

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.strictEqual(statusMock.mock.callCount(), 1);
            assert.deepStrictEqual(statusMock.mock.calls[0].arguments, [429]);
            
            const response = jsonMock.mock.calls[0].arguments[0];
            assert.strictEqual(response.error.code, 'RATE_LIMIT_EXCEEDED');
        });

        it('should return 500 for InternalError', () => {
            const error = new InternalError('Something broke');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.strictEqual(statusMock.mock.callCount(), 1);
            assert.deepStrictEqual(statusMock.mock.calls[0].arguments, [500]);
            
            const response = jsonMock.mock.calls[0].arguments[0];
            assert.strictEqual(response.error.code, 'INTERNAL_ERROR');
        });
    });

    describe('Unknown Errors', () => {
        it('should convert generic Error to InternalError', () => {
            const error = new Error('Unknown error');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.strictEqual(statusMock.mock.callCount(), 1);
            assert.deepStrictEqual(statusMock.mock.calls[0].arguments, [500]);
            
            const response = jsonMock.mock.calls[0].arguments[0];
            assert.strictEqual(response.error.code, 'INTERNAL_ERROR');
            assert.strictEqual(response.error.message, 'Unknown error');
        });

        it('should handle non-Error objects', () => {
            const error = 'string error';

            errorHandler(
                error as any,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.strictEqual(statusMock.mock.callCount(), 1);
            assert.deepStrictEqual(statusMock.mock.calls[0].arguments, [500]);
        });
    });

    describe('Error Details', () => {
        it('should include error details in test environment', () => {
            const error = new ValidationError('Invalid', {
                fields: ['name', 'email'],
            });

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            const response = jsonMock.mock.calls[0].arguments[0];
            assert.ok(response.error.details, 'Should have error details');
            assert.deepStrictEqual(response.error.details, { fields: ['name', 'email'] });
        });

        it('should include stack trace when EXPOSE_STACK_TRACES=true', () => {
            const error = new InternalError('Test error');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            const response = jsonMock.mock.calls[0].arguments[0];
            assert.ok(response.error.stack, 'Should have stack trace');
        });
    });

    describe('Response Format', () => {
        it('should include timestamp in ISO format', () => {
            const error = new ValidationError('Test');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            const response = jsonMock.mock.calls[0].arguments[0];
            assert.ok(response.timestamp, 'Should have timestamp');
            assert.match(response.timestamp, /^\d{4}-\d{2}-\d{2}T/, 'Timestamp should be ISO format');
        });

        it('should include request path', () => {
            const customMockRequest = {
                path: '/api/rooms/123',
                method: 'POST',
                ip: '127.0.0.1',
                get: mock.fn() as any,
            };
            const error = new NotFoundError('Room');

            errorHandler(
                error,
                customMockRequest as unknown as Request,
                mockResponse as Response,
                mockNext
            );

            const response = jsonMock.mock.calls[0].arguments[0];
            assert.strictEqual(response.path, '/api/rooms/123');
        });
    });
});

describe('notFoundHandler', () => {
    it('should return 404 with route information', () => {
        const mockRequest = {
            method: 'GET',
            path: '/api/unknown',
        } as Request;

        const jsonMock = mock.fn();
        const statusMock = mock.fn(() => ({ json: jsonMock }));
        const mockResponse = {
            status: statusMock,
        } as unknown as Response;

        notFoundHandler(mockRequest, mockResponse);

        assert.strictEqual(statusMock.mock.callCount(), 1);
        assert.deepStrictEqual(statusMock.mock.calls[0]?.arguments, [404]);
        
        const response = jsonMock.mock.calls[0]?.arguments[0];
        assert.strictEqual(response.error.code, 'NOT_FOUND');
        assert.strictEqual(response.error.message, 'Route GET /api/unknown not found');
    });
});