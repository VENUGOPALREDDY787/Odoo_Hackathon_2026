import { z } from 'zod';

export const transferRequestSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  toEmployeeId: z.string().uuid('Invalid target employee ID').optional().nullable(),
  toDepartmentId: z.string().uuid('Invalid target department ID').optional().nullable(),
  requestNotes: z.string().max(500).optional().nullable()
}).strict().refine(data => {
  // Transfer target must be either employee or department
  return !!(data.toEmployeeId || data.toDepartmentId);
}, {
  message: 'Either target toEmployeeId or toDepartmentId must be provided.',
  path: ['toEmployeeId']
});

export const transferActionSchema = z.object({
  approvalNotes: z.string().max(500).optional().nullable()
}).strict();
