import { z } from 'zod';

export const createNotificationSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
  title: z.string().min(3).max(255),
  message: z.string().min(5).max(4000),
  type: z.string().max(255),
  relatedEntityType: z.string().max(100).optional().nullable(),
  relatedEntityId: z.string().max(255).optional().nullable()
}).strict();

export const bulkMarkSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1, 'At least one notification ID is required')
}).strict();

export const updatePreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      type: z.string().min(3).max(255),
      emailEnabled: z.boolean(),
      inAppEnabled: z.boolean(),
      pushEnabled: z.boolean()
    })
  ).min(1, 'Preference config array cannot be empty')
}).strict();

export const notificationQuerySchema = z.object({
  status: z.enum(['Unread', 'Read', 'Archived']).optional(),
  type: z.string().max(255).optional(),
  page: z.preprocess((val) => parseInt(val as string, 10), z.number().int().min(1)).optional().default(1),
  limit: z.preprocess((val) => parseInt(val as string, 10), z.number().int().min(1).max(100)).optional().default(20)
}).strict();
