// Backend/src/routes/auth.ts
// POST /api/auth/register  — create account
// POST /api/auth/login     — authenticate and return JWT
//
// Errors are passed to Express's global error handler via next().
// Validation is intentionally simple (Zod schemas mirror frontend rules).

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { authService } from '../services/auth.service.js';

const router = Router();

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(32, 'Name must be at most 32 characters')
    .trim(),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatZodError(err: ZodError): string {
  return err.issues.map((e) => e.message).join('; ');
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = RegisterSchema.parse(req.body);
      const result = await authService.register(body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, message: formatZodError(err) });
      }
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = LoginSchema.parse(req.body);
      const result = await authService.login(body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, message: formatZodError(err) });
      }
      next(err);
    }
  }
);

export default router;