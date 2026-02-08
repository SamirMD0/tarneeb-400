// Backend/src/middleware/sanitization.test.ts - Sanitization Tests

import { Request, Response, NextFunction } from 'express';
import { test, suite, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { sanitizeXSS, preventHPP, securityHeaders, sanitizeMongoQueries } from '../sanitization.js';

suite('sanitizeXSS', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            body: {},
            query: {},
            params: {},
        };
        mockResponse = {};
        mockNext = mock.fn() as unknown as NextFunction;
    });

    suite('Body Sanitization', () => {
        test('should remove script tags from body strings', () => {
            mockRequest.body = {
                name: '<script>alert("xss")</script>John',
                bio: 'Hello<b>World</b>',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.equal(String((mockRequest.body as any).name).includes('<script>'), false);
            assert.equal(String((mockRequest.body as any).name).includes('John'), true);
        });

        test('should remove javascript: protocol', () => {
            mockRequest.body = {
                url: 'javascript:alert(1)',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.equal(String((mockRequest.body as any).url).includes('javascript:'), false);
        });

        test('should remove event handlers', () => {
            mockRequest.body = {
                input: 'onclick=alert(1) value',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.equal(String((mockRequest.body as any).input).includes('onclick='), false);
        });

        test('should sanitize nested objects', () => {
            mockRequest.body = {
                user: {
                    name: '<img src=x onerror=alert(1)>',
                    profile: {
                        bio: '<script>xss</script>',
                    },
                },
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.equal(String((mockRequest.body as any).user.name).includes('<img'), false);
            assert.equal(String((mockRequest.body as any).user.profile.bio).includes('<script>'), false);
        });

        test('should preserve safe values', () => {
            mockRequest.body = {
                name: 'John Doe',
                age: 30,
                active: true,
                tags: ['tag1', 'tag2'],
            };

            const original = JSON.parse(JSON.stringify(mockRequest.body));

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.equal((mockRequest.body as any).name, original.name);
            assert.equal((mockRequest.body as any).age, original.age);
            assert.equal((mockRequest.body as any).active, original.active);
        });
    });

    suite('Query Sanitization', () => {
        test('should sanitize query parameters', () => {
            mockRequest.query = {
                search: '<script>alert(1)</script>query',
                page: '1',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.equal(String((mockRequest.query as any).search).includes('<script>'), false);
            assert.equal((mockRequest.query as any).page, '1');
        });
    });

    suite('Params Sanitization', () => {
        test('should sanitize route parameters', () => {
            mockRequest.params = {
                id: '<script>123</script>',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            assert.equal(String((mockRequest.params as any).id).includes('<script>'), false);
        });
    });

    test('should call next after sanitization', () => {
        sanitizeXSS(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.equal((mockNext as any).mock.callCount(), 1);
        assert.equal((mockNext as any).mock.calls[0].arguments.length, 0);
    });
});

suite('preventHPP', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = { query: {} };
        mockResponse = {};
        mockNext = mock.fn() as unknown as NextFunction;
    });

    test('should keep single query parameters unchanged', () => {
        mockRequest.query = {
            page: '1',
            limit: '10',
        };

        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.deepEqual(mockRequest.query, {
            page: '1',
            limit: '10',
        });
    });

    test('should take first value of duplicate parameters', () => {
        mockRequest.query = {
            page: ['1', '2', '3'],
        };

        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.equal((mockRequest.query as any).page, '1');
    });

    test('should allow whitelisted duplicate parameters', () => {
        mockRequest.query = {
            sort: ['name', 'date'],
        };

        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Whitelisted params can remain as arrays
        assert.equal(Array.isArray((mockRequest.query as any).sort), true);
    });

    test('should handle mixed single and duplicate parameters', () => {
        mockRequest.query = {
            page: '1',
            filter: ['a', 'b'],
            sort: ['name'],
        };

        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.equal((mockRequest.query as any).page, '1');
        assert.equal((mockRequest.query as any).filter, 'a');
        assert.equal((mockRequest.query as any).sort, 'name');
    });

    test('should call next after processing', () => {
        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.equal((mockNext as any).mock.callCount(), 1);
    });
});

suite('securityHeaders', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let setHeaderMock: any;

    beforeEach(() => {
        setHeaderMock = mock.fn();
        mockRequest = {};
        mockResponse = {
            setHeader: setHeaderMock,
        };
        mockNext = mock.fn() as unknown as NextFunction;
    });

    test('should set X-Frame-Options header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.deepEqual(setHeaderMock.mock.calls[0].arguments, ['X-Frame-Options', 'DENY']);
    });

    test('should set X-Content-Type-Options header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.deepEqual(setHeaderMock.mock.calls[1].arguments, ['X-Content-Type-Options', 'nosniff']);
    });

    test('should set X-XSS-Protection header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.deepEqual(setHeaderMock.mock.calls[2].arguments, ['X-XSS-Protection', '1; mode=block']);
    });

    test('should set Referrer-Policy header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.deepEqual(setHeaderMock.mock.calls[3].arguments, ['Referrer-Policy', 'strict-origin-when-cross-origin']);
    });

    test('should set Content-Security-Policy header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        const args = setHeaderMock.mock.calls[4].arguments;
        assert.equal(args[0], 'Content-Security-Policy');
        assert.equal(String(args[1]).includes("default-src 'self'"), true);
    });

    test('should call next after setting headers', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        assert.equal((mockNext as any).mock.callCount(), 1);
    });

    test('should set all security headers', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Should set at least 5 security headers
        assert.equal(setHeaderMock.mock.callCount(), 5);
    });
});

suite('MongoDB Sanitization', () => {
    test('should be exported for use', () => {
        assert.ok(sanitizeMongoQueries);
        assert.equal(typeof sanitizeMongoQueries, 'function');
    });
});