import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Reusable wrapper to catch unhandled promise rejections in controller handlers
 * and route them automatically to the Express error handling middleware.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
