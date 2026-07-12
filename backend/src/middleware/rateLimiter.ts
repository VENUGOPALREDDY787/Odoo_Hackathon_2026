import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../core/redis/client';
import { Request, Response } from 'express';

/**
 * Rate Limiters
 *
 * Three tiers of rate limiting:
 *  1. generalLimiter    — All API routes (100 req/min per IP)
 *  2. authLimiter       — Auth endpoints only (10 req/15min per IP) — brute-force protection
 *  3. exportLimiter     — Report export endpoints (5 req/min per user) — CPU protection
 *
 * Uses Redis store so rate limits survive server restarts and work across
 * multiple API server instances (horizontal scaling).
 *
 * Falls back to in-memory store if Redis is unavailable (graceful degradation).
 */

function createRedisStore(prefix: string) {
  try {
    return new RedisStore({
      sendCommand: (...args: string[]) => (redis as any).call(...args),
      prefix: `rl:${prefix}:`,
    });
  } catch {
    // If Redis store creation fails, return undefined to use in-memory fallback
    return undefined;
  }
}

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down.',
    code: 'RATE_LIMIT_EXCEEDED',
  });
};

/**
 * General API rate limiter: 100 requests per minute per IP.
 * Protects all endpoints from abuse and DDoS.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,
  standardHeaders: true,   // Return RateLimit-* headers
  legacyHeaders: false,
  store: createRedisStore('general') as any,
  handler: rateLimitHandler,
  skip: (req) => req.path === '/health', // Don't rate-limit health checks
});

/**
 * Auth rate limiter: 10 requests per 15 minutes per IP.
 * Prevents brute-force attacks on login/register endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth') as any,
  handler: rateLimitHandler,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

/**
 * Export rate limiter: 5 requests per minute per user.
 * PDF/Excel generation is CPU-intensive — limit concurrent export requests.
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('export') as any,
  handler: rateLimitHandler,
  // Key by authenticated user ID rather than IP
  keyGenerator: (req: Request) => (req as any).user?.id || req.ip || 'anonymous',
});
