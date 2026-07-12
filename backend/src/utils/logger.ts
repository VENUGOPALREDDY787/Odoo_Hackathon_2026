import prisma from '../database/db';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to log incoming HTTP requests and attach a request ID.
 */
export function logRequest(req: Request, res: Response, next: NextFunction): void {
  const reqWithId = req as any;
  reqWithId.id = crypto.randomUUID();
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = reqWithId.user ? reqWithId.user.id : 'Anonymous';
    console.log(`[HTTP] ReqID: ${reqWithId.id} | ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | User: ${userId} | Duration: ${duration}ms`);
  });
  
  next();
}

interface LogActivityParams {
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details?: any;
}

/**
 * Saves a structured user action/activity to the database.
 */
export async function logActivity({ organizationId, userId, action, entityType, entityId, details = null }: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType,
        entityId,
        newValue: details ? JSON.parse(JSON.stringify(details)) : undefined
      }
    });
  } catch (error) {
    console.error(`[ActivityLog Error] Failed to write log for ${action} on ${entityType}:`, error);
  }
}
