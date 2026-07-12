import { z } from 'zod';

export const updateRoleSchema = z.object({
  role: z.enum(['Admin', 'Asset Manager', 'Department Head', 'Employee'])
}).strict();

export const updateStatusSchema = z.object({
  status: z.enum(['Active', 'Inactive'] as const)
}).strict();

export const assignDepartmentSchema = z.object({
  departmentId: z.string().uuid('Invalid department ID').nullable()
}).strict();
