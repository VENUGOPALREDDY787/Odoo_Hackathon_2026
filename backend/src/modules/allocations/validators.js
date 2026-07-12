const { z } = require('zod');

const createAllocationSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  allocatedToType: z.enum(['Employee', 'Department']),
  employeeId: z.string().uuid('Invalid employee ID').optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  expectedReturnDate: z.string().refine(val => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid expected return date format'
  }).optional().nullable()
}).refine(data => {
  if (data.allocatedToType === 'Employee' && !data.employeeId) return false;
  if (data.allocatedToType === 'Department' && !data.departmentId) return false;
  return true;
}, {
  message: 'Employee ID is required for Employee allocations, and Department ID for Department allocations'
});

const returnAllocationSchema = z.object({
  returnCondition: z.enum(['New', 'Good', 'Fair', 'Poor', 'Damaged']).optional(),
  returnNotes: z.string().optional()
});

const createTransferSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  toEmployeeId: z.string().uuid('Invalid target employee ID').optional().nullable(),
  toDepartmentId: z.string().uuid('Invalid target department ID').optional().nullable(),
  requestNotes: z.string().optional()
}).refine(data => {
  return data.toEmployeeId || data.toDepartmentId;
}, {
  message: 'Must specify either a target employee or department for the transfer'
});

const actionTransferSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  approvalNotes: z.string().optional()
});

module.exports = {
  createAllocationSchema,
  returnAllocationSchema,
  createTransferSchema,
  actionTransferSchema
};
