/**
 * Booking status constants.
 * Mirrors the database status column allowed values.
 */
export const BOOKING_STATUSES = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired'
} as const;

export type BookingStatus = typeof BOOKING_STATUSES[keyof typeof BOOKING_STATUSES];

/**
 * Asset statuses that BLOCK a booking from being placed.
 */
export const NON_BOOKABLE_ASSET_STATUSES = [
  'Lost',
  'Disposed',
  'Retired',
  'Under Maintenance',
  'Allocated'
] as const;

/**
 * Maximum booking duration in hours (configurable per org, defaulting here).
 */
export const MAX_BOOKING_HOURS = 72;

/**
 * Minimum booking duration in minutes.
 */
export const MIN_BOOKING_MINUTES = 15;

/**
 * Reminder lead time in minutes before booking starts.
 */
export const REMINDER_LEAD_MINUTES = 15;

/**
 * Redis TTL (seconds) for calendar caches.
 */
export const CALENDAR_CACHE_TTL = 300; // 5 minutes

/**
 * Redis key builders for consistent namespacing.
 */
export const REDIS_KEYS = {
  calendarDay: (orgId: string, date: string) => `calendar:day:${orgId}:${date}`,
  calendarWeek: (orgId: string, week: string) => `calendar:week:${orgId}:${week}`,
  calendarMonth: (orgId: string, month: string) => `calendar:month:${orgId}:${month}`,
  todayBookings: (orgId: string) => `bookings:today:${orgId}`,
  upcomingBookings: (orgId: string) => `bookings:upcoming:${orgId}`,
  resourceAvailability: (assetId: string, date: string) => `availability:${assetId}:${date}`
} as const;
