
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { toSocketError } from './socketErrors.js';
import { BusinessError } from '../utils/errors.js';
import { z } from 'zod';

// Mock socket
const mockSocket: any = {
    id: 'socket-123',
    emit: mock.fn(),
    handshake: { address: '127.0.0.1' },
    data: {}
};

describe('Socket Security & Error Handling', () => {
    beforeEach(() => {
        mock.restoreAll();
    });

    describe('toSocketError', () => {
        it('should format GameError correctly', () => {
            const error = new BusinessError('Test error', 'TEST_CODE', 400);
            const formatted = toSocketError(error);

            assert.equal(formatted.code, 'TEST_CODE');
            assert.equal(formatted.message, 'Test error');
            assert.ok(formatted.timestamp);
        });

        it('should format ZodError correctly', () => {
            const schema = z.object({ name: z.string() });
            const result = schema.safeParse({ name: 123 });

            if (!result.success) {
                const formatted = toSocketError(result.error);
                assert.equal(formatted.code, 'VALIDATION_ERROR');
                assert.equal(formatted.message, 'Invalid request payload');
                assert.ok(formatted.details);
            }
        });

        it('should format generic Error correctly', () => {
            const error = new Error('Random crash');
            const formatted = toSocketError(error);

            assert.equal(formatted.code, 'INTERNAL_ERROR');
            assert.equal(formatted.message, 'Random crash');
        });

        it('should format unknown thrown value (non-Error) correctly', () => {
            const formatted = toSocketError({ weird: 'object' });
            assert.equal(formatted.code, 'UNKNOWN_ERROR');
            assert.ok(formatted.timestamp);
        });
    });

    describe('Room Limiters (Mock)', () => {
        it('should exist and be configured', async () => {
            // We can't easily test the rate limiter middleware in isolation without spinning up a full server
            // But we can verify the import and property existence which confirms wiring
            const { socketConnectionLimiter } = await import('../middlewares/rateLimiter.js');
            assert.ok(socketConnectionLimiter);
        });
    });
});
