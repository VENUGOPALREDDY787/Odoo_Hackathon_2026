import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  parentId: z.string().uuid('Invalid parent department ID').optional().nullable(),
  managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
  status: z.enum(['Active', 'Inactive'] as const).default('Active')
}).strict();

export const updateDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100).optional(),
  parentId: z.string().uuid('Invalid parent department ID').optional().nullable(),
  managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
  status: z.enum(['Active', 'Inactive'] as const).optional()
}).strict();
