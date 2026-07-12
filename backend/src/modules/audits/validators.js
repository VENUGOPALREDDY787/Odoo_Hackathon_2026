const { z } = require('zod');

const createAuditCycleSchema = z.object({
  name: z.string().min(2, 'Audit cycle name must be at least 2 characters long').max(255),
  scopeType: z.enum(['Department', 'Location', 'All']),
  scopeDepartmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  scopeLocation: z.string().max(255).optional().nullable(),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid start date format'
  }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid end date format'
  }),
  auditorIds: z.array(z.string().uuid('Invalid employee ID')).min(1, 'At least one auditor must be assigned')
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate']
}).refine(data => {
  if (data.scopeType === 'Department' && !data.scopeDepartmentId) return false;
  if (data.scopeType === 'Location' && !data.scopeLocation) return false;
  return true;
}, {
  message: 'Scope department is required for Department scope, and location name for Location scope'
});

const verifyItemSchema = z.object({
  verificationStatus: z.enum(['Verified', 'Missing', 'Damaged']),
  notes: z.string().max(1000).optional().nullable()
});

module.exports = {
  createAuditCycleSchema,
  verifyItemSchema
};
