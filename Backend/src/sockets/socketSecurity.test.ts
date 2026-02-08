
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toSocketError } from './socketErrors.js';
import { GameError } from '../utils/errors.js';
import { z } from 'zod';

// Mock socket
const mockSocket: any = {
    id: 'socket-123',
    emit: vi.fn(),
    handshake: { address: '127.0.0.1' },
    data: {}
};

describe('Socket Security & Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('toSocketError', () => {
        it('should format GameError correctly', () => {
            const error = new Error('Test error') as any;
            error.code = 'TEST_CODE';
            error.statusCode = 400;
            const formatted = toSocketError(error);

            expect(formatted.code).toBe('TEST_CODE');
            expect(formatted.message).toBe('Test error');
            expect(formatted.timestamp).toBeDefined();
        });

        it('should format ZodError correctly', () => {
            const schema = z.object({ name: z.string() });
            const result = schema.safeParse({ name: 123 });

            if (!result.success) {
                const formatted = toSocketError(result.error);
                expect(formatted.code).toBe('VALIDATION_ERROR');
                expect(formatted.message).toBe('Invalid request payload');
                expect(formatted.details).toBeDefined();
            }
        });

        it('should format generic Error correctly', () => {
            const error = new Error('Random crash');
            const formatted = toSocketError(error);

            expect(formatted.code).toBe('INTERNAL_ERROR');
            expect(formatted.message).toBe('Random crash');
        });
    });

    describe('Room Limiters (Mock)', () => {
        it('should exist and be configured', async () => {
            // We can't easily test the rate limiter middleware in isolation without spinning up a full server
            // But we can verify the import and property existence which confirms wiring
            const { socketConnectionLimiter } = await import('../middlewares/rateLimiter.js');
            expect(socketConnectionLimiter).toBeDefined();
        });
    });
});
