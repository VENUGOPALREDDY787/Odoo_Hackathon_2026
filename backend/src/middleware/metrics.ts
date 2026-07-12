import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * API Performance Metrics Middleware
 *
 * Records response time for every request.
 * Logs a warning for any response that exceeds the SLOW_REQUEST_THRESHOLD.
 *
 * Latency is measured from the moment the request enters this middleware
 * to the moment the response 'finish' event fires.
 *
 * Usage: app.use(metricsMiddleware) — place early in the middleware chain.
 */

const SLOW_REQUEST_THRESHOLD_MS = 500; // Log requests slower than 500ms

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint(); // Nanosecond precision

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000; // ns → ms

    const isSlowRequest = durationMs > SLOW_REQUEST_THRESHOLD_MS;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
      requestId: (req as any).id,
      userId: (req as any).user?.id,
      orgId: (req as any).user?.organizationId,
      contentLength: res.get('content-length') || 0,
    };

    if (isSlowRequest) {
      logger.warn(
        `[Metrics] SLOW REQUEST: ${req.method} ${req.originalUrl} took ${Math.round(durationMs)}ms`,
        { ...logData, type: 'SLOW_REQUEST' }
      );
    } else if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `[Metrics] Request completed: ${req.method} ${req.originalUrl}`,
        { ...logData, type: 'REQUEST_METRICS' }
      );
    }

    // Attach metrics header for debugging (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('X-Response-Time', `${Math.round(durationMs)}ms`);
    }
  });

  next();
}

export default metricsMiddleware;
