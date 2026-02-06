// Backend/src/monitoring/performance.ts - Phase 20: Performance Monitoring

import { logger } from '../lib/logger.js';
import { gameActionDuration, socketEventDuration } from '../lib/metrics.js';

/**
 * Default slow operation threshold in milliseconds
 */
const DEFAULT_SLOW_THRESHOLD_MS = 100;

/**
 * Timer result with duration
 */
interface TimerResult<T> {
    result: T;
    durationMs: number;
}

/**
 * Wrap an async function and measure its execution time
 * Records the duration to a histogram and logs if it exceeds threshold
 */
export async function withTiming<T>(
    name: string,
    fn: () => Promise<T>,
    options: {
        slowThresholdMs?: number;
        logSlow?: boolean;
        recordMetric?: boolean;
        metricType?: 'game_action' | 'socket_event';
    } = {}
): Promise<TimerResult<T>> {
    const {
        slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
        logSlow = true,
        recordMetric = true,
        metricType = 'game_action',
    } = options;

    const startTime = performance.now();

    try {
        const result = await fn();
        const durationMs = performance.now() - startTime;

        // Record metric
        if (recordMetric) {
            const durationSec = durationMs / 1000;
            if (metricType === 'game_action') {
                gameActionDuration.observe({ action: name }, durationSec);
            } else {
                socketEventDuration.observe({ event: name }, durationSec);
            }
        }

        // Log if slow
        if (logSlow && durationMs > slowThresholdMs) {
            logger.warn('Slow operation detected', {
                operation: name,
                durationMs: Math.round(durationMs * 100) / 100,
                thresholdMs: slowThresholdMs,
            });
        }

        return { result, durationMs };
    } catch (error) {
        const durationMs = performance.now() - startTime;

        // Still record metric on error
        if (recordMetric) {
            const durationSec = durationMs / 1000;
            if (metricType === 'game_action') {
                gameActionDuration.observe({ action: name }, durationSec);
            } else {
                socketEventDuration.observe({ event: name }, durationSec);
            }
        }

        throw error;
    }
}

/**
 * Synchronous version of withTiming for non-async functions
 */
export function withTimingSync<T>(
    name: string,
    fn: () => T,
    options: {
        slowThresholdMs?: number;
        logSlow?: boolean;
        recordMetric?: boolean;
        metricType?: 'game_action' | 'socket_event';
    } = {}
): TimerResult<T> {
    const {
        slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
        logSlow = true,
        recordMetric = true,
        metricType = 'game_action',
    } = options;

    const startTime = performance.now();

    try {
        const result = fn();
        const durationMs = performance.now() - startTime;

        // Record metric
        if (recordMetric) {
            const durationSec = durationMs / 1000;
            if (metricType === 'game_action') {
                gameActionDuration.observe({ action: name }, durationSec);
            } else {
                socketEventDuration.observe({ event: name }, durationSec);
            }
        }

        // Log if slow
        if (logSlow && durationMs > slowThresholdMs) {
            logger.warn('Slow operation detected', {
                operation: name,
                durationMs: Math.round(durationMs * 100) / 100,
                thresholdMs: slowThresholdMs,
            });
        }

        return { result, durationMs };
    } catch (error) {
        const durationMs = performance.now() - startTime;

        // Still record metric on error
        if (recordMetric) {
            const durationSec = durationMs / 1000;
            if (metricType === 'game_action') {
                gameActionDuration.observe({ action: name }, durationSec);
            } else {
                socketEventDuration.observe({ event: name }, durationSec);
            }
        }

        throw error;
    }
}

/**
 * Create a timer for manual start/stop timing
 */
export function createTimer(name: string): {
    stop: (options?: { logSlow?: boolean; slowThresholdMs?: number }) => number;
} {
    const startTime = performance.now();

    return {
        stop(options = {}) {
            const { logSlow = true, slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS } = options;
            const durationMs = performance.now() - startTime;

            if (logSlow && durationMs > slowThresholdMs) {
                logger.warn('Slow operation detected', {
                    operation: name,
                    durationMs: Math.round(durationMs * 100) / 100,
                    thresholdMs: slowThresholdMs,
                });
            }

            return durationMs;
        },
    };
}

/**
 * Decorator-style wrapper for timing game reducer execution
 */
export function timeReducer<S, A>(
    reducerName: string,
    reducer: (state: S, action: A) => S
): (state: S, action: A) => S {
    return (state: S, action: A): S => {
        const { result } = withTimingSync(`reducer:${reducerName}`, () => reducer(state, action), {
            slowThresholdMs: 10, // Reducers should be fast
        });
        return result;
    };
}

/**
 * Time a socket event handler
 */
export async function timeSocketHandler<T>(
    eventName: string,
    handler: () => Promise<T>
): Promise<T> {
    const { result } = await withTiming(eventName, handler, {
        metricType: 'socket_event',
        slowThresholdMs: 50,
    });
    return result;
}
