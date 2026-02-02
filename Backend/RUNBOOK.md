# Runbook

## Redis Troubleshooting

### Connection Issues
**Symptoms:** Logs show "Redis connection error" or "Redis circuit breaker OPEN".

**Checks:**
1. Verify `REDIS_URL` in `.env`.
2. Check if Redis container/service is running: `docker ps | grep redis`.
3. Check network connectivity (firewall, VPC).
4. If using TLS (Upstash), verify `rediss://` protocol prefix.

**Actions:**
- **Circuit Breaker**: If open, wait 30s for auto-reset. Check logs for underlying error.
- **Restart**: `docker restart backend-redis-1` (or appropriate container name).
- **Bypass**: The system attempts to degrade gracefully. Game state might be lost on server restart if Redis is down, but in-memory state persists for uptime duration.

### High Latency / Timeout
**Symptoms**: Slow `createRoom` or `join` operations.

**Checks:**
1. Check Redis memory usage via `/api/health`.
2. Check network latency to Redis provider.

**Actions:**
- Optimize payload size (room state might be too large).
- Increase connection pool or review `redis.ts` timeout settings.

### Cache Inconsistency
**Symptoms**: User sees stale data or "Room not found" after reconnect.

**Checks:**
- Verify TTL settings in `roomCache.ts`.
- Check if `persistGame` (MongoDB) succeeded.

**Commands:**
- Flush cache (Emergency only): `redis-cli FLUSHDB`
