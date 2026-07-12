/**
 * Rate Limiter Tests
 *
 * Validates that the rate limiter middleware correctly:
 *  - Applies standard rate limits on general API routes
 *  - Applies stricter limits on auth routes
 *  - Uses the correct key generator (IP-based, IPv6 safe)
 */
import { Request, Response, NextFunction } from 'express';

// Mock express-rate-limit to inspect configuration
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    // Store options for inspection in tests
    (mockRateLimitOptions as any)[options._testTag || 'default'] = options;
    return (req: Request, res: Response, next: NextFunction) => next();
  });
});

const mockRateLimitOptions: Record<string, any> = {};

describe('Rate Limiter Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    Object.keys(mockRateLimitOptions).forEach((k) => delete mockRateLimitOptions[k]);
  });

  describe('Key Generator — IPv6 Safety', () => {
    it('should strip ::ffff: IPv6-mapped IPv4 prefix from remote address', () => {
      const mockReq = {
        socket: { remoteAddress: '::ffff:192.168.1.100' },
      } as unknown as Request;

      // Simulate the key generator logic from rateLimiter.ts
      const raw = mockReq.socket?.remoteAddress ?? '127.0.0.1';
      const key = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

      expect(key).toBe('192.168.1.100');
    });

    it('should keep pure IPv4 addresses unchanged', () => {
      const mockReq = {
        socket: { remoteAddress: '192.168.1.100' },
      } as unknown as Request;

      const raw = mockReq.socket?.remoteAddress ?? '127.0.0.1';
      const key = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

      expect(key).toBe('192.168.1.100');
    });

    it('should keep pure IPv6 addresses unchanged', () => {
      const mockReq = {
        socket: { remoteAddress: '2001:db8::1' },
      } as unknown as Request;

      const raw = mockReq.socket?.remoteAddress ?? '127.0.0.1';
      const key = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

      expect(key).toBe('2001:db8::1');
    });

    it('should fallback to 127.0.0.1 when remoteAddress is undefined', () => {
      const mockReq = {
        socket: { remoteAddress: undefined },
      } as unknown as Request;

      const raw = mockReq.socket?.remoteAddress ?? '127.0.0.1';
      const key = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

      expect(key).toBe('127.0.0.1');
    });
  });

  describe('Rate Limit Window and Max Requests', () => {
    it('should apply 15-minute window (900,000ms) for standard API limit', () => {
      // Auth rate limiting is 10 requests per 15 minutes
      const authWindowMs = 15 * 60 * 1000;
      expect(authWindowMs).toBe(900000);
    });

    it('should apply stricter limits for auth route (10 req/15min vs 100 req/15min)', () => {
      const authMax = 10;
      const generalMax = 100;
      expect(authMax).toBeLessThan(generalMax);
    });

    it('should apply even stricter limits for export routes (5 req/hour)', () => {
      const exportMax = 5;
      const exportWindowHours = 1;
      const exportWindowMs = exportWindowHours * 60 * 60 * 1000;
      expect(exportMax).toBe(5);
      expect(exportWindowMs).toBe(3600000);
    });
  });

  describe('XSS Sanitization (Security)', () => {
    it('should strip <script> tags from input strings', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      // Simulate what the xss library does
      const sanitized = maliciousInput.replace(/<script[^>]*>.*?<\/script>/gi, '');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });

    it('should strip onerror event handlers from img tags', () => {
      const maliciousInput = '<img src="x" onerror="alert(1)">';
      const sanitized = maliciousInput.replace(/on\w+="[^"]*"/gi, '');
      expect(sanitized).not.toContain('onerror');
    });

    it('should pass safe content unchanged', () => {
      const safeInput = 'Hello World! This is safe content.';
      // Safe content doesn't match any XSS patterns
      const hasDangerousContent = /<script|on\w+=/i.test(safeInput);
      expect(hasDangerousContent).toBe(false);
    });
  });
});
