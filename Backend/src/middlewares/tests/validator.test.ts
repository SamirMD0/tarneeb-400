// Backend/src/middleware/validator.test.ts - Validator Tests

import { Request, Response, NextFunction } from 'express';
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
        mockNext = jest.fn();
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

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
        });

        it('should reject invalid body data', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
            });

            mockRequest.body = { name: 'John', age: 'invalid' };

            const middleware = validate(schema, 'body');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            const error = (mockNext as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Request validation failed');
            expect(error.details).toHaveProperty('target', 'body');
        });

        it('should provide detailed error information', () => {
            const schema = z.object({
                email: z.string().email(),
                age: z.number().min(18),
            });

            mockRequest.body = { email: 'invalid', age: 10 };

            const middleware = validate(schema, 'body');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            const error = (mockNext as jest.Mock).mock.calls[0][0];
            expect(error.details.errors).toHaveLength(2);
            expect(error.details.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ path: 'email' }),
                    expect.objectContaining({ path: 'age' }),
                ])
            );
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

            expect(mockNext).toHaveBeenCalledWith();
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

            expect(mockNext).toHaveBeenCalledWith();
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
        expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
        const minimalConfig = {
            maxPlayers: 4,
        };

        const result = RoomConfigSchema.safeParse(minimalConfig);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.targetScore).toBe(41);
            expect(result.data.allowBots).toBe(false);
        }
    });

    it('should reject invalid maxPlayers', () => {
        const invalidConfig = {
            maxPlayers: 5,
        };

        const result = RoomConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
    });

    it('should reject negative targetScore', () => {
        const invalidConfig = {
            maxPlayers: 4,
            targetScore: -10,
        };

        const result = RoomConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
    });

    it('should reject targetScore above max', () => {
        const invalidConfig = {
            maxPlayers: 4,
            targetScore: 201,
        };

        const result = RoomConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
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
        expect(result.success).toBe(true);
    });

    it('should reject invalid BID value', () => {
        const invalidBid = {
            type: 'BID',
            playerId: 'player1',
            value: 15, // Max is 13
        };

        const result = GameActionSchema.safeParse(invalidBid);
        expect(result.success).toBe(false);
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
        expect(result.success).toBe(true);
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
        expect(result.success).toBe(false);
    });

    it('should validate SET_TRUMP action', () => {
        const trumpAction = {
            type: 'SET_TRUMP',
            suit: 'HEARTS',
        };

        const result = GameActionSchema.safeParse(trumpAction);
        expect(result.success).toBe(true);
    });

    it('should validate PASS action', () => {
        const passAction = {
            type: 'PASS',
            playerId: 'player1',
        };

        const result = GameActionSchema.safeParse(passAction);
        expect(result.success).toBe(true);
    });
});

describe('validateSocketPayload', () => {
    it('should return validated data on success', () => {
        const schema = z.object({ value: z.number() });
        const data = { value: 10 };

        const result = validateSocketPayload(schema, data);
        expect(result).toEqual({ value: 10 });
    });

    it('should throw ValidationError on failure', () => {
        const schema = z.object({ value: z.number() });
        const data = { value: 'invalid' };

        expect(() => validateSocketPayload(schema, data)).toThrow(ValidationError);
    });

    it('should include error details', () => {
        const schema = z.object({ email: z.string().email() });
        const data = { email: 'notanemail' };

        try {
            validateSocketPayload(schema, data);
            fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError);
            if (error instanceof ValidationError) {
                expect(error.details).toHaveProperty('errors');
            }
        }
    });
});

describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = sanitizeString(input);
        expect(result).toBe('Hello');
    });

    it('should remove javascript: protocol', () => {
        const input = 'javascript:alert(1)';
        const result = sanitizeString(input);
        expect(result).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
        const input = 'onclick=alert(1)';
        const result = sanitizeString(input);
        expect(result).toBe('');
    });

    it('should trim whitespace', () => {
        const input = '  hello  ';
        const result = sanitizeString(input);
        expect(result).toBe('hello');
    });

    it('should preserve safe text', () => {
        const input = 'Hello World 123';
        const result = sanitizeString(input);
        expect(result).toBe('Hello World 123');
    });
});

describe('sanitizeObject', () => {
    it('should sanitize string values', () => {
        const input = {
            name: '<script>xss</script>John',
            age: 30,
        };

        const result = sanitizeObject(input);
        expect(result.name).toBe('John');
        expect(result.age).toBe(30);
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
        expect(result.user.name).toBe('John');
        expect(result.user.profile.bio).toBe('alert(1)Hello');
    });

    it('should preserve non-string values', () => {
        const input = {
            count: 42,
            active: true,
            tags: ['a', 'b'],
        };

        const result = sanitizeObject(input);
        expect(result).toEqual(input);
    });
});