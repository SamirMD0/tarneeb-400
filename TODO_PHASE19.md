PHASE 19 – Error Handling & Validation (TODO)
Goals

Production-grade error boundaries, strict input validation, sanitization, structured error responses, and rate limiting across REST and WebSocket layers.

Missing Core Implementation
[ ] Create errors.ts utility

File: Backend/src/utils/errors.ts
Missing:

Custom error class hierarchy

Typed error codes and HTTP status binding

class GameError extends Error {
  code: string;
  statusCode: number;
  isOperational: boolean;
}

class ValidationError extends GameError {}
class NotFoundError extends GameError {}
class UnauthorizedError extends GameError {}
class RateLimitError extends GameError {}
class StateError extends GameError {}


Why needed:
Centralized, type-safe error handling with predictable client-facing error codes.

[ ] Create errorHandler.ts middleware

File: Backend/src/middleware/errorHandler.ts
Missing:

Global Express error middleware

Error normalization

Secure logging

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void


Responsibilities:

Convert errors to structured JSON

Log full stack traces server-side

Sanitize output in production

Why needed:
Consistent REST error responses without leaking internals.

[ ] Create validator.ts

File: Backend/src/middleware/validator.ts
Missing:

Zod schemas

Request validation middleware

const RoomConfigSchema = z.object({
  maxPlayers: z.number().min(4).max(4),
  targetScore: z.number().optional(),
});

const GameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('BID'), playerId: z.string(), value: z.number().min(7).max(13) }),
  // other actions
]);

function validateBody<T>(schema: z.ZodSchema<T>): RequestHandler
function validateParams<T>(schema: z.ZodSchema<T>): RequestHandler


Why needed:
Reject invalid, malicious, or malformed input before business logic.

[ ] Create rateLimiter.ts

File: Backend/src/middleware/rateLimiter.ts
Missing:

Express rate limiters for different scopes

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }
});

const roomCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: req => req.ip
});

// Socket connection limiter


Why needed:
Protect against abuse, bots, and basic DDoS vectors.

[ ] Enhance socket middleware error handling

File: Backend/src/sockets/socketMiddleware.ts
Missing:

Structured socket error wrapper

Centralized socket error logging

interface SocketError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
}

function enhancedErrorBoundary(handler: EventHandler): EventHandler


Why needed:
Predictable error handling across all socket events.

[ ] Add input sanitization

File: Backend/src/middleware/sanitization.ts
Missing:

MongoDB injection protection

XSS prevention

HTTP parameter pollution protection

import mongoSanitize from 'express-mongo-sanitize';
import { clean } from 'xss-clean';
import hpp from 'hpp';


Why needed:
Prevent NoSQL injection, XSS, and parameter pollution attacks.

[ ] Validate all game actions in reducer

File: Backend/src/game/reducer.ts
Missing:

Strict Zod validation before state mutation

const validation = GameActionSchema.safeParse(action);
if (!validation.success) {
  console.error('Invalid action:', validation.error);
  return state;
}


Why needed:
Protect game state from corrupted or hostile clients.

[ ] Add environment variable validation

File: Backend/src/lib/env.ts
Missing:

Startup-time env validation with Zod

Fail-fast behavior

export function validateEnv(): void


Why needed:
Prevent silent misconfiguration in production.

Missing Integration
[ ] Wire middleware into Express

File: Backend/src/index.ts
Missing:

Env validation at startup

Security middleware ordering

Global error handler at end

validateEnv();

app.use(globalLimiter);
app.use(sanitizeMongoQueries);
app.use(sanitizeXSS);
app.use(preventHPP);

app.use(errorHandler);


Why needed:
Activate security layers across the entire request pipeline.

[ ] Enhance socket event validation

Files: Backend/src/sockets/events/*.handler.ts
Missing:

Zod validation for every socket payload

Structured socket error responses

Why needed:
Prevent invalid socket input from reaching the game engine.

Missing Tests
[ ] errorHandler.test.ts

File: Backend/src/middleware/errorHandler.test.ts

400 for validation errors

404 for not found

500 for unknown errors

No stack trace leaks in production

[ ] validator.test.ts

File: Backend/src/middleware/validator.test.ts

Valid schemas pass

Invalid inputs rejected

XSS & injection blocked

[ ] rateLimiter.test.ts

File: Backend/src/middleware/rateLimiter.test.ts

Requests within limits allowed

Excess blocked

Window reset works

[ ] sanitization.test.ts

File: Backend/src/middleware/sanitization.test.ts

Mongo operators removed

HTML escaped

HPP blocked

[ ] Integration tests

File: Backend/src/__tests__/integration/errorHandling.test.ts

Invalid room join

Rate-limited room creation

Malformed game actions

XSS + NoSQL injection blocked

Missing Dependencies
[ ] Update package.json

File: Backend/package.json

{
  "dependencies": {
    "zod": "^3.22.4",
    "express-rate-limit": "^7.1.5",
    "express-mongo-sanitize": "^2.2.0",
    "xss-clean": "^0.1.4",
    "hpp": "^0.2.3"
  },
  "devDependencies": {
    "@types/express-rate-limit": "^6.0.0"
  }
}

Missing Documentation
[ ] Error codes reference

File: Backend/docs/ERROR_CODES.md

Client (4xx), Server (5xx), Socket errors

Code + meaning

[ ] Security documentation

File: SECURITY.md

Validation strategy

Rate limiting rules

Error handling guarantees

Missing Environment Configuration
[ ] Update .env.example

File: Backend/.env.example

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_STRICT_VALIDATION=true
LOG_ERRORS=true
EXPOSE_STACK_TRACES=false