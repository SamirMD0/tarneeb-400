// Backend/src/lib/metrics.test.ts

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
    metrics,
    getMetrics,
    resetMetrics,
    activeRoomsGauge,
    activeSocketsGauge,
    gamesCompletedCounter,
    errorsCounter
} from './metrics.js';

describe('Metrics', () => {
    beforeEach(() => {
        resetMetrics();
    });

    it('should increment active rooms', async () => {
        metrics.roomCreated();
        const content = await getMetrics();
        assert.match(content, /tarneeb_active_rooms_total 1/);
    });

    it('should decrement active rooms', async () => {
        metrics.roomCreated();
        metrics.roomCreated();
        metrics.roomDestroyed();

        // Cannot easily check gauge value via getMetrics string parsing accurately/reliably 
        // without parsing the whole text, but we can check the internal registry values if exposed,
        // or just rely on the output string for simple cases.
        const content = await getMetrics();
        assert.match(content, /tarneeb_active_rooms_total 1/);

        // Better: check the gauge object value if possible, but prom-client doesn't expose value easily synchronously?
        // Actually prom-client registers allow getting values.
        // But for integration test style, text matching is fine.
    });

    it('should track active sockets', async () => {
        metrics.socketConnected();
        metrics.socketConnected();

        let content = await getMetrics();
        assert.match(content, /tarneeb_active_sockets_total 2/);

        metrics.socketDisconnected();
        content = await getMetrics();
        assert.match(content, /tarneeb_active_sockets_total 1/);
    });

    it('should track completed games with winner label', async () => {
        metrics.gameCompleted(1);
        metrics.gameCompleted(2);
        metrics.gameCompleted(1);

        const content = await getMetrics();
        assert.match(content, /tarneeb_games_completed_total{winner="team_1"} 2/);
        assert.match(content, /tarneeb_games_completed_total{winner="team_2"} 1/);
    });

    it('should track errors by code and severity', async () => {
        metrics.errorOccurred('INVALID_INPUT', true);
        metrics.errorOccurred('DB_ERROR', false);

        const content = await getMetrics();
        assert.match(content, /tarneeb_errors_total{code="INVALID_INPUT",severity="operational"} 1/);
        assert.match(content, /tarneeb_errors_total{code="DB_ERROR",severity="internal"} 1/);
    });

    it('should observe request duration', async () => {
        const end = metrics.timeHttpRequest('GET', '/test');
        // Simulate some time passing? Prom-client uses process.hrtime
        end({ status_code: 200 });

        const content = await getMetrics();
        assert.match(content, /tarneeb_http_request_duration_seconds_bucket/);
        assert.match(content, /tarneeb_http_request_duration_seconds_count{method="GET",route="\/test",status_code="200"} 1/);
    });
});
