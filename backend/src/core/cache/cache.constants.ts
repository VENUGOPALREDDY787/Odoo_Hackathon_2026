/**
 * Cache Constants
 *
 * Centralised TTL values and key builder functions for every cacheable domain.
 * Changing a TTL here affects all modules at once.
 */

// ─── TTL Registry (seconds) ─────────────────────────────────────────────────
export const TTL = {
  DASHBOARD: 120,           // 2 min  — refreshes frequently (KPI tiles)
  MAINTENANCE_DASH: 180,    // 3 min  — maintenance dashboard
  AUDIT_DASH: 180,          // 3 min  — audit dashboard
  REPORTS: 600,             // 10 min — heavy aggregation reports
  NOTIFICATION_UNREAD: 30,  // 30 sec — unread badge count
  NOTIFICATIONS_LIST: 60,   // 1 min  — notification feed
  ASSET_LOOKUP: 300,        // 5 min  — individual asset record
  ASSETS_LIST: 60,          // 1 min  — paginated asset list
  DEPARTMENTS: 900,         // 15 min — org departments (rarely change)
  CATEGORIES: 900,          // 15 min — org categories (rarely change)
  EMPLOYEES: 300,           // 5 min  — employee lookup
  BOOKING_AVAILABILITY: 60, // 1 min  — booking slot availability
  BOOKING_CALENDAR: 120,    // 2 min  — calendar view
} as const;

// ─── Key Builders ────────────────────────────────────────────────────────────
export const CacheKeys = {
  // Dashboard
  dashboard: (orgId: string) => `dashboard:${orgId}`,
  maintenanceDash: (orgId: string) => `maintenance:dashboard:${orgId}`,
  auditDash: (orgId: string) => `audit:dashboard:${orgId}`,

  // Reports (hash = base64 of filter JSON)
  report: (orgId: string, hash: string) => `reports:data:${orgId}:${hash}`,

  // Notifications
  unreadCount: (userId: string) => `notifications:unread:${userId}`,
  notificationsList: (userId: string, page: number) => `notifications:list:${userId}:${page}`,

  // Asset
  assetById: (orgId: string, assetId: string) => `assets:${orgId}:${assetId}`,
  assetsList: (orgId: string, hash: string) => `assets:list:${orgId}:${hash}`,

  // Lookup caches (whole-org collections)
  departments: (orgId: string) => `departments:${orgId}`,
  categories: (orgId: string) => `categories:${orgId}`,
  employees: (orgId: string) => `employees:${orgId}`,

  // Booking
  bookingAvailability: (assetId: string, date: string) => `booking:avail:${assetId}:${date}`,
  bookingCalendar: (orgId: string, from: string, to: string) => `booking:cal:${orgId}:${from}:${to}`,

  // Wildcard patterns for invalidation
  patterns: {
    orgDashboard: (orgId: string) => `dashboard:${orgId}`,
    orgReports: (orgId: string) => `reports:data:${orgId}:*`,
    orgAssets: (orgId: string) => `assets:*:${orgId}:*`,
    assetBookings: (assetId: string) => `booking:avail:${assetId}:*`,
    orgNotifications: (userId: string) => `notifications:*:${userId}:*`,
  }
} as const;
