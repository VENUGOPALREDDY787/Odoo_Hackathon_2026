import { z } from 'zod';

/**
 * maintenance.validators.ts — Zod schemas for all maintenance request operations.
 *
 * Business validation (asset existence, workflow transitions) is handled
 * separately in the service layer. Zod handles structural/type validation only.
 */

export const createMaintenanceRequestSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  issueDescription: z.string().min(10, 'Issue description must be at least 10 characters').max(5000),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().default('Medium'),
  photoUrl: z.string().url('Invalid photo URL').optional().nullable(),
  estimatedCompletionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected format: YYYY-MM-DD')
    .optional()
    .nullable(),
  estimatedCost: z.number().nonnegative('Cost must be non-negative').optional().nullable(),
  vendor: z.string().max(255).optional().nullable()
}).strict();

export const updateMaintenanceRequestSchema = z.object({
  issueDescription: z.string().min(10).max(5000).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  photoUrl: z.string().url('Invalid photo URL').optional().nullable(),
  estimatedCompletionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected format: YYYY-MM-DD')
    .optional()
    .nullable(),
  estimatedCost: z.number().nonnegative().optional().nullable(),
  vendor: z.string().max(255).optional().nullable()
}).strict();

export const approveMaintenanceSchema = z.object({
  assignedTechnician: z.string().max(255).optional().nullable(),
  estimatedCompletionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected format: YYYY-MM-DD')
    .optional()
    .nullable(),
  estimatedCost: z.number().nonnegative().optional().nullable(),
  vendor: z.string().max(255).optional().nullable()
}).strict();

export const rejectMaintenanceSchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason must be at least 5 characters').max(2000)
}).strict();

export const assignTechnicianSchema = z.object({
  assignedTechnician: z.string().min(2, 'Technician name is required').max(255)
}).strict();

export const completeMaintenanceSchema = z.object({
  resolutionNotes: z.string().min(5, 'Resolution notes must be at least 5 characters').max(5000),
  actualCost: z.number().nonnegative().optional().nullable(),
  actualCompletionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected format: YYYY-MM-DD')
    .optional()
    .nullable()
}).strict();

export const cancelMaintenanceSchema = z.object({
  cancelReason: z.string().min(5, 'Cancel reason must be at least 5 characters').max(2000)
}).strict();
