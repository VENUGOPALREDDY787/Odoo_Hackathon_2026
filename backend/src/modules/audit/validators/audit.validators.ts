import { z } from 'zod';

/**
 * audit.validators.ts — Zod schemas for the Audit Management module.
 *
 * Structural validation only. Business validation (asset existence,
 * auditor existence, workflow legality) lives in the service layer.
 */

export const createAuditCycleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  description: z.string().max(5000).optional().nullable(),
  scopeType: z.enum(['All', 'Department', 'Location', 'Category']),
  scopeDepartmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  scopeLocation: z.string().max(500).optional().nullable(),
  scopeCategoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  scheduledStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected format: YYYY-MM-DD')
    .optional()
    .nullable(),
  scheduledEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected format: YYYY-MM-DD')
    .optional()
    .nullable(),
  auditorIds: z
    .array(z.string().uuid('Each auditor ID must be a valid UUID'))
    .optional()
    .default([])
}).strict().superRefine((data, ctx) => {
  if (data.scopeType === 'Department' && !data.scopeDepartmentId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scopeDepartmentId is required when scopeType is Department.', path: ['scopeDepartmentId'] });
  }
  if (data.scopeType === 'Location' && !data.scopeLocation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scopeLocation is required when scopeType is Location.', path: ['scopeLocation'] });
  }
  if (data.scopeType === 'Category' && !data.scopeCategoryId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scopeCategoryId is required when scopeType is Category.', path: ['scopeCategoryId'] });
  }
  if (data.scheduledStartDate && data.scheduledEndDate) {
    if (new Date(data.scheduledEndDate) < new Date(data.scheduledStartDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scheduledEndDate must be after scheduledStartDate.', path: ['scheduledEndDate'] });
    }
  }
});

export const updateAuditCycleSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  scheduledStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  scheduledEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
}).strict();

export const assignAuditorsSchema = z.object({
  auditorIds: z
    .array(z.string().uuid('Each auditor ID must be a valid UUID'))
    .min(1, 'At least one auditor must be assigned')
}).strict();

export const verifyAssetSchema = z.object({
  verificationStatus: z.enum(['Verified', 'Missing', 'Damaged', 'Not Verified']),
  notes: z.string().max(2000).optional().nullable(),
  physicalLocation: z.string().max(500).optional().nullable(),
  conditionOnVerify: z.enum(['Good', 'Fair', 'Poor', 'Damaged']).optional().nullable()
}).strict();

export const addEvidenceSchema = z.object({
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.enum(['image', 'pdf', 'document']),
  caption: z.string().max(1000).optional().nullable()
}).strict();

export const cancelAuditSchema = z.object({
  cancelReason: z.string().min(5, 'Cancel reason must be at least 5 characters').max(2000)
}).strict();
