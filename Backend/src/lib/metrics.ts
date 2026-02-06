// Backend/src/lib/metrics.ts - Phase 20: Prometheus Metrics

import client, { Registry, Counter, Gauge, Histogram } from 'prom-client';

/**
 * Custom registry to avoid duplicate metric errors on hot reload
 */
const register = new Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

/**
 * Active rooms gauge
 */
export const activeRoomsGauge = new Gauge({
    name: 'tarneeb_active_rooms_total',
    help: 'Number of currently active game rooms',
    registers: [register],
});

/**
 * Active sockets gauge
 */
export const activeSocketsGauge = new Gauge({
    name: 'tarneeb_active_sockets_total',
    help: 'Number of currently connected WebSocket clients',
    registers: [register],
});

/**
 * Games completed counter
 */
export const gamesCompletedCounter = new Counter({
    name: 'tarneeb_games_completed_total',
    help: 'Total number of completed games',
    labelNames: ['winner'] as const, // 'team_0', 'team_1'
    registers: [register],
});

/**
 * Errors counter by error code
 */
export const errorsCounter = new Counter({
    name: 'tarneeb_errors_total',
    help: 'Total number of errors by error code',
    labelNames: ['code', 'severity'] as const, // severity: 'operational' | 'internal'
    registers: [register],
});

/**
 * Request duration histogram - REST API
 */
export const httpRequestDuration = new Histogram({
    name: 'tarneeb_http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
});

/**
 * Socket event duration histogram
 */
export const socketEventDuration = new Histogram({
    name: 'tarneeb_socket_event_duration_seconds',
    help: 'WebSocket event processing latency in seconds',
    labelNames: ['event'] as const,
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
    registers: [register],
});

/**
 * Game action duration histogram
 */
export const gameActionDuration = new Histogram({
    name: 'tarneeb_game_action_duration_seconds',
    help: 'Game action processing latency in seconds',
    labelNames: ['action'] as const,
    buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05],
    registers: [register],
});

/**
 * Metrics helpers
 */
export const metrics = {
    /**
     * Increment room count
     */
    roomCreated(): void {
        activeRoomsGauge.inc();
    },

    /**
     * Decrement room count
     */
    roomDestroyed(): void {
        activeRoomsGauge.dec();
    },

    /**
     * Increment socket count
     */
    socketConnected(): void {
        activeSocketsGauge.inc();
    },

    /**
     * Decrement socket count
     */
    socketDisconnected(): void {
        activeSocketsGauge.dec();
    },

    /**
     * Record game completion
     */
    gameCompleted(winningTeam: number): void {
        gamesCompletedCounter.inc({ winner: `team_${winningTeam}` });
    },

    /**
     * Record error occurrence
     */
    errorOccurred(code: string, isOperational: boolean = true): void {
        errorsCounter.inc({
            code,
            severity: isOperational ? 'operational' : 'internal',
        });
    },

    /**
     * Time an HTTP request
     */
    timeHttpRequest(method: string, route: string): (labels?: Partial<Record<'method' | 'route' | 'status_code', string | number>>) => number {
        return httpRequestDuration.startTimer({ method, route });
    },

    /**
     * Time a socket event
     */
    timeSocketEvent(event: string): () => void {
        const end = socketEventDuration.startTimer({ event });
        return end;
    },

    /**
     * Time a game action
     */
    timeGameAction(action: string): () => void {
        const end = gameActionDuration.startTimer({ action });
        return end;
    },

    /**
     * Observe game action duration directly
     */
    observeGameAction(action: string, durationMs: number): void {
        gameActionDuration.observe({ action }, durationMs / 1000);
    },
};

/**
 * Get the metrics registry
 */
export function getMetricsRegistry(): Registry {
    return register;
}

/**
 * Get metrics content type for Prometheus
 */
export function getMetricsContentType(): string {
    return register.contentType;
}

/**
 * Get all metrics as Prometheus format string
 */
export async function getMetrics(): Promise<string> {
    return register.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
    register.resetMetrics();
}

export default metrics;
