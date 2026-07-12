const { z } = require('zod');

const createRequestSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  issueDescription: z.string().min(5, 'Issue description must be at least 5 characters long').max(2000),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  photoUrl: z.string().url('Invalid photo URL').optional().nullable()
});

const approveRequestSchema = z.object({
  status: z.enum(['Approved', 'Rejected'], {
    errorMap: () => ({ message: "Status must be 'Approved' or 'Rejected'" })
  })
});

const assignRequestSchema = z.object({
  assignedTechnician: z.string().min(2, 'Technician name must be at least 2 characters long').max(255)
});

const updateProgressSchema = z.object({
  status: z.enum(['In Progress', 'Resolved'], {
    errorMap: () => ({ message: "Status must be 'In Progress' or 'Resolved'" })
  }),
  resolutionNotes: z.string().max(2000).optional().nullable()
});

module.exports = {
  createRequestSchema,
  approveRequestSchema,
  assignRequestSchema,
  updateProgressSchema
};
