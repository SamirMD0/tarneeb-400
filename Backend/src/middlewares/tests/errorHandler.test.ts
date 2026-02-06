// Backend/src/middleware/errorHandler.test.ts - Error Handler Tests

import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../errorHandler.js';
import {
    ValidationError,
    NotFoundError,
    AuthError,
    RateLimitError,
    InternalError,
} from '../../utils/errors.js';

describe('errorHandler', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn(() => ({ json: jsonMock }));

        mockRequest = {
            path: '/test',
            method: 'POST',
            ip: '127.0.0.1',
            get: jest.fn(),
        };

        mockResponse = {
            status: statusMock,
        } as Partial<Response>;

        mockNext = jest.fn();
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

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input',
                    }),
                    timestamp: expect.any(String),
                    path: '/test',
                })
            );
        });

        it('should return 401 for AuthError', () => {
            const error = new AuthError();

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'UNAUTHORIZED',
                    }),
                })
            );
        });

        it('should return 404 for NotFoundError', () => {
            const error = new NotFoundError('Room', '123');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'NOT_FOUND',
                        message: "Room with ID '123' not found",
                    }),
                })
            );
        });

        it('should return 429 for RateLimitError', () => {
            const error = new RateLimitError();

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(statusMock).toHaveBeenCalledWith(429);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'RATE_LIMIT_EXCEEDED',
                    }),
                })
            );
        });

        it('should return 500 for InternalError', () => {
            const error = new InternalError('Something broke');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'INTERNAL_ERROR',
                    }),
                })
            );
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

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'INTERNAL_ERROR',
                        message: 'Unknown error',
                    }),
                })
            );
        });

        it('should handle non-Error objects', () => {
            const error = 'string error';

            errorHandler(
                error as any,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(statusMock).toHaveBeenCalledWith(500);
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

            const response = jsonMock.mock.calls[0][0];
            expect(response.error.details).toBeDefined();
            expect(response.error.details).toEqual({ fields: ['name', 'email'] });
        });

        it('should include stack trace when EXPOSE_STACK_TRACES=true', () => {
            const error = new InternalError('Test error');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            const response = jsonMock.mock.calls[0][0];
            expect(response.error.stack).toBeDefined();
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

            const response = jsonMock.mock.calls[0][0];
            expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should include request path', () => {
            const customMockRequest = {
                path: '/api/rooms/123',
                method: 'POST',
                ip: '127.0.0.1',
                get: jest.fn(),
            };
            const error = new NotFoundError('Room');

            errorHandler(
                error,
                customMockRequest as unknown as Request,
                mockResponse as Response,
                mockNext
            );

            const response = jsonMock.mock.calls[0][0];
            expect(response.path).toBe('/api/rooms/123');
        });
    });
});

describe('notFoundHandler', () => {
    it('should return 404 with route information', () => {
        const mockRequest = {
            method: 'GET',
            path: '/api/unknown',
        } as Request;

        const jsonMock = jest.fn();
        const mockResponse = {
            status: jest.fn(() => ({ json: jsonMock })),
        } as unknown as Response;

        notFoundHandler(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.objectContaining({
                    code: 'NOT_FOUND',
                    message: 'Route GET /api/unknown not found',
                }),
            })
        );
    });
});