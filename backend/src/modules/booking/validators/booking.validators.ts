import { z } from 'zod';
import { MIN_BOOKING_MINUTES, MAX_BOOKING_HOURS } from '../constants/booking.constants';

/**
 * Shared time window refinement used by both create and reschedule schemas.
 * Validates that endTime > startTime and that the duration is within bounds.
 */
const timeWindowRefinement = (data: { startTime: string; endTime: string }, ctx: z.RefinementCtx) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  const now = new Date();

  if (isNaN(start.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'startTime is not a valid ISO date.', path: ['startTime'] });
    return;
  }
  if (isNaN(end.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'endTime is not a valid ISO date.', path: ['endTime'] });
    return;
  }
  if (start <= now) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'startTime must be in the future.', path: ['startTime'] });
  }
  if (end <= start) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'endTime must be after startTime.', path: ['endTime'] });
    return;
  }
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  if (durationMinutes < MIN_BOOKING_MINUTES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Booking duration must be at least ${MIN_BOOKING_MINUTES} minutes.`,
      path: ['endTime']
    });
  }
  const durationHours = durationMinutes / 60;
  if (durationHours > MAX_BOOKING_HOURS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Booking duration cannot exceed ${MAX_BOOKING_HOURS} hours.`,
      path: ['endTime']
    });
  }
};

/**
 * Schema for creating a new booking.
 */
export const createBookingSchema = z
  .object({
    assetId: z.string().uuid('Invalid asset ID'),
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
    notes: z.string().max(1000).optional().nullable(),
    bookedOnBehalfOfDeptId: z.string().uuid('Invalid department ID').optional().nullable()
  })
  .strict()
  .superRefine(timeWindowRefinement);

/**
 * Schema for updating booking metadata (notes, department).
 * Time fields are handled separately via reschedule endpoint.
 */
export const updateBookingSchema = z
  .object({
    notes: z.string().max(1000).optional().nullable(),
    bookedOnBehalfOfDeptId: z.string().uuid('Invalid department ID').optional().nullable()
  })
  .strict();

/**
 * Schema for rescheduling (moving) an existing booking to a new time window.
 */
export const rescheduleBookingSchema = z
  .object({
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
    reason: z.string().max(500).optional().nullable()
  })
  .strict()
  .superRefine(timeWindowRefinement);
