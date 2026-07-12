const { z } = require('zod');

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters long').max(100),
  parentId: z.string().uuid('Invalid parent department ID').optional().nullable(),
  managerId: z.string().uuid('Invalid manager employee ID').optional().nullable()
});

const updateDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters long').max(100).optional(),
  parentId: z.string().uuid('Invalid parent department ID').optional().nullable(),
  managerId: z.string().uuid('Invalid manager employee ID').optional().nullable(),
  status: z.enum(['Active', 'Inactive']).optional()
});

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema
};
