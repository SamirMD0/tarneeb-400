// Backend/src/middleware/validator.test.ts - Validator Tests

import { Request, Response, NextFunction } from 'express';
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
    validate,
    validateSocketPayload,
    RoomConfigSchema,
    GameActionSchema,
    BidActionSchema,
    PlayCardActionSchema,
    sanitizeString,
    sanitizeObject,
} from '../validator.js';
import { ValidationError } from '../../utils/errors.js';

describe('validate middleware', () => {
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

    describe('Body Validation', () => {
        it('should validate valid body data', () => {

            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            mockRequest.body = { name: 'John', age: 30 };

            const middleware = validate(schema, 'body');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            assert.equal((mockNext as any).mock.callCount(), 1);
            assert.equal((mockNext as any).mock.calls[0].arguments.length, 0);
            assert.deepEqual(mockRequest.body, { name: 'John', age: 30 });
        });

        it('should reject invalid body data', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            mockRequest.body = { name: 'John', age: 'invalid' };

            const middleware = validate(schema, 'body');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            assert.equal((mockNext as any).mock.callCount(), 1);
            const error = (mockNext as any).mock.calls[0].arguments[0];
            assert.ok(error instanceof ValidationError);
            assert.equal(error.message, 'Request validation failed');
            assert.equal((error as any).details.target, 'body');
        });

        it('should provide detailed error information', () => {
            const schema = z.object({
                email: z.string().email(),
                age: z.number().min(18),
            });

            mockRequest.body = { email: 'invalid', age: 10 };

            const middleware = validate(schema, 'body');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            const error = (mockNext as any).mock.calls[0].arguments[0];
            assert.ok(error instanceof ValidationError);
            assert.equal(Array.isArray((error as any).details.errors), true);
            assert.equal((error as any).details.errors.length, 2);
            const paths = (error as any).details.errors.map((e: any) => e.path);
            assert.ok(paths.includes('email'));
            assert.ok(paths.includes('age'));
        });
    });

    describe('Query Validation', () => {
        it('should validate query parameters', () => {
            const schema = z.object({
                page: z.string().regex(/^\d+$/),
            });

            mockRequest.query = { page: '1' };

            const middleware = validate(schema, 'query');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            assert.equal((mockNext as any).mock.callCount(), 1);
            assert.equal((mockNext as any).mock.calls[0].arguments.length, 0);
        });
    });

    describe('Params Validation', () => {
        it('should validate route parameters', () => {
            const schema = z.object({
                id: z.string().uuid(),
            });

            mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

            const middleware = validate(schema, 'params');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            assert.equal((mockNext as any).mock.callCount(), 1);
            assert.equal((mockNext as any).mock.calls[0].arguments.length, 0);
        });
    });
});

describe('RoomConfigSchema', () => {
    it('should validate valid room configuration', () => {

        const validConfig = {
            maxPlayers: 4,
            targetScore: 41,
            allowBots: false,
        };

        const result = RoomConfigSchema.safeParse(validConfig);
        assert.equal(result.success, true);
    });

    it('should apply default values', () => {
        const minimalConfig = {
            maxPlayers: 4,
        };

        const result = RoomConfigSchema.safeParse(minimalConfig);
        assert.equal(result.success, true);
        if (result.success) {
            assert.equal(result.data.targetScore, 41);
            assert.equal(result.data.allowBots, false);
        }
    });

    it('should reject invalid maxPlayers', () => {
        const invalidConfig = {
            maxPlayers: 5,
        };

        const result = RoomConfigSchema.safeParse(invalidConfig);
        assert.equal(result.success, false);
    });

    it('should reject negative targetScore', () => {
        const invalidConfig = {
            maxPlayers: 4,
            targetScore: -10,
        };

        const result = RoomConfigSchema.safeParse(invalidConfig);
        assert.equal(result.success, false);
    });

    it('should reject targetScore above max', () => {
        const invalidConfig = {
            maxPlayers: 4,
            targetScore: 201,
        };

        const result = RoomConfigSchema.safeParse(invalidConfig);
        assert.equal(result.success, false);
    });
});

describe('GameActionSchema', () => {
    it('should validate BID action', () => {

        const bidAction = {
            type: 'BID',
            playerId: 'player1',
            value: 10,
        };

        const result = GameActionSchema.safeParse(bidAction);
        assert.equal(result.success, true);
    });

    it('should reject invalid BID value', () => {
        const invalidBid = {
            type: 'BID',
            playerId: 'player1',
            value: 15, // Max is 13
        };

        const result = GameActionSchema.safeParse(invalidBid);
        assert.equal(result.success, false);
    });

    it('should validate PLAY_CARD action', () => {
        const playAction = {
            type: 'PLAY_CARD',
            playerId: 'player1',
            card: {
                suit: 'SPADES',
                rank: 'A',
            },
        };

        const result = GameActionSchema.safeParse(playAction);
        assert.equal(result.success, true);
    });

    it('should reject invalid card suit', () => {
        const invalidAction = {
            type: 'PLAY_CARD',
            playerId: 'player1',
            card: {
                suit: 'INVALID',
                rank: 'A',
            },
        };

        const result = GameActionSchema.safeParse(invalidAction);
        assert.equal(result.success, false);
    });

    it('should validate SET_TRUMP action', () => {
        const trumpAction = {
            type: 'SET_TRUMP',
            suit: 'HEARTS',
        };

        const result = GameActionSchema.safeParse(trumpAction);
        assert.equal(result.success, true);
    });

    it('should validate PASS action', () => {
        const passAction = {
            type: 'PASS',
            playerId: 'player1',
        };

        const result = GameActionSchema.safeParse(passAction);
        assert.equal(result.success, true);
    });
});

describe('validateSocketPayload', () => {
    it('should return validated data on success', () => {
        const schema = z.object({ value: z.number() });
        const data = { value: 10 };

        const result = validateSocketPayload(schema, data);
        assert.deepEqual(result, { value: 10 });
    });

    it('should throw ValidationError on failure', () => {
        const schema = z.object({ value: z.number() });
        const data = { value: 'invalid' };

        assert.throws(() => validateSocketPayload(schema, data), ValidationError);
    });

    it('should include error details', () => {
        const schema = z.object({ email: z.string().email() });
        const data = { email: 'notanemail' };

        try {
            validateSocketPayload(schema, data);
            assert.fail('Should have thrown');
        } catch (error) {
            assert.ok(error instanceof ValidationError);
            assert.ok((error as any).details);
            assert.ok('errors' in (error as any).details);
        }
    });
});

describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = sanitizeString(input);
        assert.equal(result, 'Hello');
    });

    it('should remove javascript: protocol', () => {
        const input = 'javascript:alert(1)';
        const result = sanitizeString(input);
        assert.equal(result, 'alert(1)');
    });

    it('should remove event handlers', () => {
        const input = 'onclick=alert(1)';
        const result = sanitizeString(input);
        assert.equal(result, '');
    });

    it('should trim whitespace', () => {
        const input = '  hello  ';
        const result = sanitizeString(input);
        assert.equal(result, 'hello');
    });

    it('should preserve safe text', () => {
        const input = 'Hello World 123';
        const result = sanitizeString(input);
        assert.equal(result, 'Hello World 123');
    });
});

describe('sanitizeObject', () => {
    it('should sanitize string values', () => {
        const input = {
            name: '<script>xss</script>John',
            age: 30,
        };

        const result = sanitizeObject(input);
        assert.equal((result as any).name, 'John');
        assert.equal((result as any).age, 30);
    });

    it('should sanitize nested objects', () => {
        const input = {
            user: {
                name: '<b>John</b>',
                profile: {
                    bio: 'javascript:alert(1)Hello',
                },
            },
        };

        const result = sanitizeObject(input);
        assert.equal((result as any).user.name, 'John');
        assert.equal((result as any).user.profile.bio, 'alert(1)Hello');
    });

    it('should preserve non-string values', () => {
        const input = {
            count: 42,
            active: true,
            tags: ['a', 'b'],
        };

        const result = sanitizeObject(input);
        assert.deepEqual(result, input);
    });
});