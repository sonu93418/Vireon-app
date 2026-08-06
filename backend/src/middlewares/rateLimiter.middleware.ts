// ============================================================
// VIREON — RATE LIMITER MIDDLEWARE (express-rate-limit)
// ============================================================
import rateLimit from 'express-rate-limit';
import { ResponseHandler } from '../core/response';
import { HttpStatusCode } from '../core/errors';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000); // 15 minutes

// ─── Global API Rate Limiter ──────────────────────────────────────────────────
export const globalRateLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    ResponseHandler.error(
      res,
      'Too many requests. Please try again in 15 minutes.',
      HttpStatusCode.TOO_MANY_REQUESTS,
      undefined,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

// ─── Strict Auth Rate Limiter (login/register/otp) ────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 5),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    ResponseHandler.error(
      res,
      'Too many authentication attempts. Please wait 15 minutes.',
      HttpStatusCode.TOO_MANY_REQUESTS,
      undefined,
      'AUTH_RATE_LIMIT_EXCEEDED'
    );
  },
});

// ─── Upload Rate Limiter ──────────────────────────────────────────────────────
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    ResponseHandler.error(
      res,
      'Upload limit reached. Maximum 20 uploads per hour.',
      HttpStatusCode.TOO_MANY_REQUESTS,
      undefined,
      'UPLOAD_RATE_LIMIT_EXCEEDED'
    );
  },
});
