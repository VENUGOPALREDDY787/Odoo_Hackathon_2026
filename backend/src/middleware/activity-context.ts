import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * ActivityContext — Describes user footprint context parsed from HTTP headers.
 */
export interface ActivityContext {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  device: string;
}

/**
 * activityContextMiddleware — Intercepts incoming requests and parses client device,
 * browser, ipAddress, and attaches a unique Request ID for audit traceability.
 */
export function activityContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Basic user-agent parsing for browser & device
  let browser = 'Unknown Browser';
  let device = 'Desktop';

  if (/chrome|crios/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/msie|trident/i.test(userAgent)) {
    browser = 'Internet Explorer';
  } else if (/edg/i.test(userAgent)) {
    browser = 'Edge';
  }

  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
    device = 'Mobile';
  } else if (/tablet/i.test(userAgent)) {
    device = 'Tablet';
  }

  const ipAddress = (
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  ).split(',')[0].trim();

  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  // Attach context to request object
  (req as any).activityContext = {
    requestId,
    ipAddress,
    userAgent,
    browser,
    device
  };

  // Set header in response for tracking/debugging
  res.setHeader('X-Request-Id', requestId);

  next();
}

export default activityContextMiddleware;
