import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../core/errors/AppError';
import { TokenHelper } from '../modules/auth/helpers/token.helper';
import { sessionService } from '../modules/auth/service/session.service';
import logger from '../config/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
    jti: string;
  };
}

/**
 * Authentication middleware. Validates access token and verifies JTI blacklists in Redis.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Authentication required.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = TokenHelper.verifyAccessToken(token);

    // Concurrency Check: Verify JTI has not been blacklisted in Redis (fail-safe enabled)
    let isBlacklisted = false;
    try {
      isBlacklisted = await sessionService.isAccessTokenBlacklisted(decoded.jti);
    } catch (redisErr) {
      logger.error('[Auth Middleware] Redis blacklist check failed. Bypassing check.', redisErr);
    }

    if (isBlacklisted) {
      return next(new AppError('Access token has been revoked.', 401, 'TOKEN_REVOKED'));
    }

    (req as any).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
      jti: decoded.jti
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Access token has expired.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid access token.', 401, 'INVALID_TOKEN'));
  }
}

/**
 * Role-Based Access Control middleware creator.
 */
export function requireRole(allowedRoles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(new AppError('Forbidden. Insufficient permissions.', 403, 'FORBIDDEN'));
    }

    next();
  };
}
