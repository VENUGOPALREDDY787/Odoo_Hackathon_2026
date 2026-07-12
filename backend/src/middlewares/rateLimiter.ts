import { Request, Response, NextFunction, RequestHandler } from 'express';
import { redis } from '../core/redis/client';
import { AppError } from '../core/errors/AppError';

/**
 * Creates an Express middleware to enforce request rate limits using Redis.
 * Tracks requests by user ID (if authenticated) or client IP address.
 *
 * @param limit Max number of requests allowed in the window.
 * @param windowSeconds Window length in seconds.
 */
export function rateLimiter(limit: number = 100, windowSeconds: number = 900): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Generate limit identifier: use userId if authenticated, fall back to client IP
    const identifier = (req as any).user ? `user:${(req as any).user.id}` : `ip:${req.ip}`;
    const key = `ratelimit:${identifier}:${req.originalUrl}`;

    try {
      const requests = await redis.incr(key);

      if (requests === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (requests > limit) {
        res.setHeader('Retry-After', windowSeconds);
        return next(new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
      }

      next();
    } catch (error) {
      // Fail-safe: bypass rate-limiter if Redis connection is unavailable
      next();
    }
  };
}

export default rateLimiter;
