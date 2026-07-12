import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Express middleware to inject unique correlation trace IDs into all requests.
 * Reads X-Request-ID headers from incoming requests or generates a secure random UUID.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const reqId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();
  
  // Cast request to any to save trace ID
  (req as any).id = reqId as string;
  
  // Echo in response headers
  res.setHeader('X-Request-ID', reqId);
  
  next();
}

export default requestId;
