import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../core/errors/AppError';
import * as response from '../utils/response';
import { ZodError } from 'zod';

/**
 * Express error handler middleware.
 * Intercepts all unhandled errors, logs them using Winston, and formats standard JSON envelopes.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details: any = null;

  const requestId = (req as any).id;

  // Log error via Winston
  logger.error({
    message: err.message || 'An error occurred during request processing',
    stack: err.stack,
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode
  });

  // Handle Zod Schema Validation Failures
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Request validation failed';
    code = 'VALIDATION_ERROR';
    details = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
  }
  // Handle Custom Operational Errors
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  }
  // Handle Prisma Database Engine Errors
  else if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    statusCode = 400;
    code = `DATABASE_ERROR_${err.code}`;

    if (err.code === 'P2002') {
      message = 'Unique constraint violation. Duplicate data detected.';
      details = { target: err.meta?.target };
    } else if (err.code === 'P2003') {
      message = 'Foreign key constraint failed. Reference integrity broken.';
      details = { field: err.meta?.field_name };
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'The requested database record does not exist.';
    } else {
      message = 'Database operation failed.';
    }
  }

  res.status(statusCode).json(response.error(message, code, details));
}
export default errorHandler;
