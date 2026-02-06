// Backend/src/lib/logger.test.ts

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import winston from 'winston';
import { logger } from './logger.js';

describe('Logger', () => {
    let logSpy: any;
    const logs: any[] = [];

    // Create a custom transport to capture logs
    const captureTransport = new winston.transports.Console({
        format: winston.format.json(),
        log: (info, callback) => {
            logs.push(info);
            callback();
        }
    });

    beforeEach(() => {
        logs.length = 0;
        logger.clear(); // Remove existing transports
        logger.add(captureTransport);
    });

    afterEach(() => {
        logger.clear();
        // Re-add default transport (not strictly necessary for tests but good practice)
        logger.add(new winston.transports.Console({
            format: winston.format.simple()
        }));
    });

    it('should log info messages', () => {
        logger.info('Test message');
        const log = logs.find(l => l.message === 'Test message');
        assert.ok(log, 'Log message not found');
        assert.strictEqual(log.level, 'info');
    });

    it('should redact sensitive fields in metadata', () => {
        logger.info('User login', { password: 'secretpassword', email: 'test@example.com' });

        const log = logs.find(l => l.message === 'User login');
        assert.ok(log);
        assert.strictEqual(log.password, '[REDACTED]');
        assert.strictEqual(log.email, 'test@example.com');
    });

    it('should redact sensitive fields in nested objects', () => {
        logger.info('Update profile', {
            user: {
                name: 'John',
                token: 'abcdef',
                settings: {
                    apiKey: '12345'
                }
            }
        });

        const log = logs.find(l => l.message === 'Update profile');
        assert.ok(log);
        assert.strictEqual(log.user.token, '[REDACTED]');
        assert.strictEqual(log.user.settings.apiKey, '[REDACTED]');
        assert.strictEqual(log.user.name, 'John');
    });

    it('should redact player hands', () => {
        logger.info('Game state', {
            playerHands: [['SA', 'SK'], ['HA', 'HK']]
        });

        const log = logs.find(l => l.message === 'Game state');
        assert.ok(log);
        assert.strictEqual(log.playerHands, '[REDACTED]');
    });

    it('should handle arrays correctly', () => {
        logger.info('List items', { items: ['a', 'b', { secret: 'hidden' }] });

        const log = logs.find(l => l.message === 'List items');
        assert.ok(log);
        assert.strictEqual(log.items[0], 'a');
        assert.strictEqual(log.items[2].secret, '[REDACTED]');
    });
});
