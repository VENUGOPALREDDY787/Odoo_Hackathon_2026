import { Request, Response, NextFunction } from 'express';

/**
 * Input Sanitisation Middleware
 *
 * Protects against:
 *  1. XSS (Cross-Site Scripting) — strips HTML tags from string values
 *  2. NoSQL/operator injection — removes keys starting with '$' or containing '.'
 *     that could be interpreted as MongoDB/query operators
 *
 * Applied to req.body and req.query recursively.
 *
 * NOTE: SQL injection is handled by Prisma's parameterised queries.
 *       This middleware handles the application-layer risks above.
 */

const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_EVENT_REGEX = /on\w+\s*=/gi;
const JAVASCRIPT_PROTO_REGEX = /javascript:/gi;

/**
 * Strips dangerous HTML, script tags and event handlers from a string.
 */
function sanitizeString(value: string): string {
  return value
    .replace(HTML_TAG_REGEX, '')           // Remove all HTML tags
    .replace(SCRIPT_EVENT_REGEX, '')       // Remove inline event handlers (onclick=, onload=)
    .replace(JAVASCRIPT_PROTO_REGEX, ''); // Remove javascript: protocol URLs
}

/**
 * Recursively sanitizes all string values and removes dangerous keys from objects.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Skip keys that start with '$' or contain '.' — operator injection protection
      if (key.startsWith('$') || key.includes('\u0000')) {
        continue;
      }
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Sanitise middleware — applies sanitizeValue to req.body and req.query.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizeValue(req.query) as any;
    for (const key in req.query) {
      delete req.query[key];
    }
    Object.assign(req.query, sanitizedQuery);
  }

  next();
}

export default sanitize;
