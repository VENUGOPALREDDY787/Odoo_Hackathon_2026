import { z } from 'zod';

export const activityLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().max(255).optional(),
  module: z.string().max(255).optional(),
  entityType: z.string().max(255).optional(),
  entityId: z.string().max(255).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected').optional(),
  search: z.string().max(100).optional(),
  page: z.preprocess((val) => parseInt(val as string, 10), z.number().int().min(1)).optional().default(1),
  limit: z.preprocess((val) => parseInt(val as string, 10), z.number().int().min(1).max(100)).optional().default(20),
  sortBy: z.enum(['createdAt', 'action', 'module']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).strict();
