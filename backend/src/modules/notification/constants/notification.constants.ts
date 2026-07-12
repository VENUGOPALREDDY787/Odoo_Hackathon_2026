/**
 * notification.constants.ts — Enumeration and keys for the central Notification module.
 */

export const NOTIFICATION_STATUSES = {
  UNREAD: 'Unread',
  READ: 'Read',
  ARCHIVED: 'Archived'
} as const;

export type NotificationStatus = typeof NOTIFICATION_STATUSES[keyof typeof NOTIFICATION_STATUSES];

export const NOTIFICATION_TYPES = {
  // Asset
  ASSET_ASSIGNED: 'Asset Assigned',
  ASSET_RETURNED: 'Asset Returned',
  OVERDUE_RETURN: 'Overdue Return',

  // Transfer
  TRANSFER_REQUESTED: 'Transfer Requested',
  TRANSFER_APPROVED: 'Transfer Approved',
  TRANSFER_REJECTED: 'Transfer Rejected',

  // Booking
  BOOKING_CONFIRMED: 'Booking Confirmed',
  BOOKING_CANCELLED: 'Booking Cancelled',
  BOOKING_REMINDER: 'Booking Reminder',
  BOOKING_STARTING: 'Booking Starting',
  OVERDUE_BOOKING: 'Overdue Booking',

  // Maintenance
  MAINTENANCE_REQUESTED: 'Maintenance Requested',
  MAINTENANCE_APPROVED: 'Maintenance Approved',
  MAINTENANCE_REJECTED: 'Maintenance Rejected',
  MAINTENANCE_COMPLETED: 'Maintenance Completed',
  OVERDUE_MAINTENANCE: 'Overdue Maintenance',

  // Audit
  AUDIT_ASSIGNED: 'Audit Assigned',
  AUDIT_STARTED: 'Audit Started',
  AUDIT_COMPLETED: 'Audit Completed',
  AUDIT_DISCREPANCY: 'Audit Discrepancy',

  // Profile / Security
  DEPARTMENT_CHANGED: 'Department Changed',
  ROLE_CHANGED: 'Role Changed',
  PASSWORD_CHANGED: 'Password Changed',

  // Announcement
  SYSTEM_ANNOUNCEMENT: 'System Announcement'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_REDIS_KEYS = {
  unreadCount: (userId: string) => `notification:unread:${userId}`,
  recent: (userId: string) => `notification:recent:${userId}`,
  preferences: (userId: string) => `notification:preferences:${userId}`
} as const;

export const NOTIFICATION_CACHE_TTL = 300; // 5 minutes
export const MAX_RECENT_CACHE_COUNT = 50;
