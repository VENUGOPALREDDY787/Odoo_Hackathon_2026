import { z } from 'zod';

export const allocateAssetSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  allocatedToType: z.enum(['Employee', 'Department'] as const),
  employeeId: z.string().uuid('Invalid employee ID').optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected return date must be YYYY-MM-DD').optional().nullable()
}).strict().refine(data => {
  if (data.allocatedToType === 'Employee' && !data.employeeId) {
    return false;
  }
  if (data.allocatedToType === 'Department' && !data.departmentId) {
    return false;
  }
  return true;
}, {
  message: 'employeeId is required when allocatedToType is Employee; departmentId is required when type is Department.',
  path: ['allocatedToType']
});

export const bulkAllocateSchema = z.object({
  allocations: z.array(z.object({
    assetId: z.string().uuid('Invalid asset ID'),
    allocatedToType: z.enum(['Employee', 'Department'] as const),
    employeeId: z.string().uuid('Invalid employee ID').optional().nullable(),
    departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
    expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected return date must be YYYY-MM-DD').optional().nullable()
  }).strict())
}).strict();

export const returnAssetSchema = z.object({
  returnCondition: z.enum(['Excellent', 'Good', 'Fair', 'Damaged', 'Lost', 'Disposed'] as const),
  returnNotes: z.string().optional().nullable()
}).strict();

export const bulkReturnSchema = z.object({
  assetIds: z.array(z.string().uuid('Invalid asset ID')),
  returnCondition: z.enum(['Excellent', 'Good', 'Fair', 'Damaged', 'Lost', 'Disposed'] as const),
  returnNotes: z.string().optional().nullable()
}).strict();
export default allocateAssetSchema;
