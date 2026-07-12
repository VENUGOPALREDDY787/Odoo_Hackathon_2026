import { z } from 'zod';

const assetCondition = z.enum(['Excellent', 'Good', 'Fair', 'Damaged', 'Lost', 'Disposed'] as const);
const assetStatus = z.enum([
  'Available',
  'Allocated',
  'Reserved',
  'Under Maintenance',
  'Lost',
  'Retired',
  'Disposed'
] as const);

export const createAssetSchema = z.object({
  name: z.string().min(2, 'Asset name must be at least 2 characters long').max(100),
  categoryId: z.string().uuid('Invalid category ID'),
  serialNumber: z.string().min(1, 'Serial number cannot be empty').optional().nullable(),
  acquisitionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Acquisition date must be in YYYY-MM-DD format'),
  acquisitionCost: z.number().nonnegative('Acquisition cost must be a positive number'),
  condition: assetCondition.default('Good'),
  location: z.string().min(1, 'Location is required'),
  status: assetStatus.default('Available'),
  isShared: z.boolean().default(false),
  imageUrl: z.string().url('Invalid image URL format').optional().nullable(),
  documentsUrl: z.string().url('Invalid documents URL format').optional().nullable(),
  warrantyExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Warranty expiry must be in YYYY-MM-DD format').optional().nullable(),
  maintenanceFrequency: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  customMetadata: z.record(z.string(), z.any()).optional().nullable()
}).strict();

export const updateAssetSchema = z.object({
  name: z.string().min(2, 'Asset name must be at least 2 characters long').max(100).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  serialNumber: z.string().min(1, 'Serial number cannot be empty').optional().nullable(),
  acquisitionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Acquisition date must be in YYYY-MM-DD format').optional(),
  acquisitionCost: z.number().nonnegative('Acquisition cost must be a positive number').optional(),
  condition: assetCondition.optional(),
  location: z.string().min(1, 'Location is required').optional(),
  status: assetStatus.optional(),
  isShared: z.boolean().optional(),
  imageUrl: z.string().url('Invalid image URL format').optional().nullable(),
  documentsUrl: z.string().url('Invalid documents URL format').optional().nullable(),
  warrantyExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Warranty expiry must be in YYYY-MM-DD format').optional().nullable(),
  maintenanceFrequency: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  customMetadata: z.record(z.string(), z.any()).optional().nullable()
}).strict();
