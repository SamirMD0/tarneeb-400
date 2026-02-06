// Backend/src/middleware/sanitization.test.ts - Sanitization Tests

import { Request, Response, NextFunction } from 'express';
import { sanitizeXSS, preventHPP, securityHeaders } from '../sanitization.js';

describe('sanitizeXSS', () => {
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
        mockNext = jest.fn();
    });

    describe('Body Sanitization', () => {
        it('should remove script tags from body strings', () => {
            mockRequest.body = {
                name: '<script>alert("xss")</script>John',
                bio: 'Hello<b>World</b>',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body.name).not.toContain('<script>');
            expect(mockRequest.body.name).toContain('John');
        });

        it('should remove javascript: protocol', () => {
            mockRequest.body = {
                url: 'javascript:alert(1)',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body.url).not.toContain('javascript:');
        });

        it('should remove event handlers', () => {
            mockRequest.body = {
                input: 'onclick=alert(1) value',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body.input).not.toContain('onclick=');
        });

        it('should sanitize nested objects', () => {
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

            expect(mockRequest.body.user.name).not.toContain('<img');
            expect(mockRequest.body.user.profile.bio).not.toContain('<script>');
        });

        it('should preserve safe values', () => {
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

            expect(mockRequest.body.name).toBe(original.name);
            expect(mockRequest.body.age).toBe(original.age);
            expect(mockRequest.body.active).toBe(original.active);
        });
    });

    describe('Query Sanitization', () => {
        it('should sanitize query parameters', () => {
            mockRequest.query = {
                search: '<script>alert(1)</script>query',
                page: '1',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.query.search).not.toContain('<script>');
            expect(mockRequest.query.page).toBe('1');
        });
    });

    describe('Params Sanitization', () => {
        it('should sanitize route parameters', () => {
            mockRequest.params = {
                id: '<script>123</script>',
            };

            sanitizeXSS(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.params.id).not.toContain('<script>');
        });
    });

    it('should call next after sanitization', () => {
        sanitizeXSS(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
    });
});

describe('preventHPP', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = { query: {} };
        mockResponse = {};
        mockNext = jest.fn();
    });

    it('should keep single query parameters unchanged', () => {
        mockRequest.query = {
            page: '1',
            limit: '10',
        };

        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockRequest.query).toEqual({
            page: '1',
            limit: '10',
        });
    });

    it('should take first value of duplicate parameters', () => {
        mockRequest.query = {
            page: ['1', '2', '3'],
        };

        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockRequest.query.page).toBe('1');
    });

    it('should allow whitelisted duplicate parameters', () => {
        mockRequest.query = {
            sort: ['name', 'date'],
        };

        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Whitelisted params can remain as arrays
        expect(Array.isArray(mockRequest.query.sort)).toBe(true);
    });

    it('should handle mixed single and duplicate parameters', () => {
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

        expect(mockRequest.query.page).toBe('1');
    });

    it('should call next after processing', () => {
        preventHPP(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
    });
});

describe('securityHeaders', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let setHeaderMock: jest.Mock;

    beforeEach(() => {
        setHeaderMock = jest.fn();
        mockRequest = {};
        mockResponse = {
            setHeader: setHeaderMock,
        };
        mockNext = jest.fn();
    });

    it('should set X-Frame-Options header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(setHeaderMock).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-Content-Type-Options header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(setHeaderMock).toHaveBeenCalledWith(
            'X-Content-Type-Options',
            'nosniff'
        );
    });

    it('should set X-XSS-Protection header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(setHeaderMock).toHaveBeenCalledWith(
            'X-XSS-Protection',
            '1; mode=block'
        );
    });

    it('should set Referrer-Policy header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(setHeaderMock).toHaveBeenCalledWith(
            'Referrer-Policy',
            'strict-origin-when-cross-origin'
        );
    });

    it('should set Content-Security-Policy header', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(setHeaderMock).toHaveBeenCalledWith(
            'Content-Security-Policy',
            expect.stringContaining("default-src 'self'")
        );
    });

    it('should call next after setting headers', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should set all security headers', () => {
        securityHeaders(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Should set at least 5 security headers
        expect(setHeaderMock).toHaveBeenCalledTimes(5);
    });
});

describe('MongoDB Sanitization', () => {
    it('should be exported for use', () => {
        const { sanitizeMongoQueries } = require('./sanitization.js');
        expect(sanitizeMongoQueries).toBeDefined();
        expect(typeof sanitizeMongoQueries).toBe('function');
    });
});