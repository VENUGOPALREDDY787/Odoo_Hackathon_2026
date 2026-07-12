import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long').max(100),
  customFields: z.record(z.string(), z.any()).optional().nullable()
}).strict();

export const updateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long').max(100).optional(),
  customFields: z.record(z.string(), z.any()).optional().nullable()
}).strict();
