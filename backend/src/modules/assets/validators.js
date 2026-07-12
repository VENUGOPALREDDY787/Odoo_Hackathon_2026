const { z } = require('zod');

const createAssetSchema = z.object({
  name: z.string().min(2, 'Asset name must be at least 2 characters long').max(255),
  categoryId: z.string().uuid('Invalid category ID'),
  serialNumber: z.string().max(255).optional().nullable(),
  acquisitionDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid acquisition date format'
  }),
  acquisitionCost: z.number().nonnegative('Acquisition cost cannot be negative'),
  condition: z.enum(['New', 'Good', 'Fair', 'Poor', 'Damaged']).default('Good'),
  location: z.string().min(2, 'Location must be at least 2 characters long').max(255),
  isShared: z.boolean().default(false),
  imageUrl: z.string().url('Invalid image URL').optional().nullable(),
  documentsUrl: z.string().url('Invalid document URL').optional().nullable()
});

const updateAssetSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  categoryId: z.string().uuid().optional(),
  serialNumber: z.string().max(255).optional().nullable(),
  acquisitionDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid acquisition date format'
  }).optional(),
  acquisitionCost: z.number().nonnegative().optional(),
  condition: z.enum(['New', 'Good', 'Fair', 'Poor', 'Damaged']).optional(),
  location: z.string().min(2).max(255).optional(),
  status: z.enum(['Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed']).optional(),
  isShared: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  documentsUrl: z.string().url().optional().nullable()
});

module.exports = {
  createAssetSchema,
  updateAssetSchema
};
