import { z } from 'zod';

export const dashboardFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected').optional(),
  departmentId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  assetStatus: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
  employeeId: z.string().uuid().optional()
}).strict();
