import { z } from 'zod';

export const reportFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected').optional(),
  departmentId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  location: z.string().max(255).optional(),
  employeeId: z.string().uuid().optional(),
  assetStatus: z.string().max(100).optional(),
  priority: z.string().max(50).optional(),
  year: z.preprocess((val) => val === undefined ? undefined : Number(val), z.number().int().min(2000).max(2100)).optional(),
  quarter: z.preprocess((val) => val === undefined ? undefined : Number(val), z.number().int().min(1).max(4)).optional(),
  month: z.preprocess((val) => val === undefined ? undefined : Number(val), z.number().int().min(1).max(12)).optional(),
  week: z.preprocess((val) => val === undefined ? undefined : Number(val), z.number().int().min(1).max(53)).optional(),
  groupBy: z.enum(['Department', 'Category', 'Employee', 'Asset', 'Month', 'Quarter', 'Year', 'Location']).optional(),
  format: z.enum(['pdf', 'xlsx', 'csv', 'json']).optional()
}).strict();
