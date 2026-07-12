const { z } = require('zod');

const updateRoleSchema = z.object({
  role: z.enum(['Admin', 'Asset Manager', 'Department Head', 'Employee'], {
    errorMap: () => ({ message: "Role must be one of: 'Admin', 'Asset Manager', 'Department Head', 'Employee'" })
  })
});

const updateStatusSchema = z.object({
  status: z.enum(['Active', 'Inactive'], {
    errorMap: () => ({ message: "Status must be 'Active' or 'Inactive'" })
  })
});

module.exports = {
  updateRoleSchema,
  updateStatusSchema
};
