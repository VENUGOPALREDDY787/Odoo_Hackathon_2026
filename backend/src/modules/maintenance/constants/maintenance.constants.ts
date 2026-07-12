/**
 * maintenance.constants.ts — Shared constants for the Maintenance Management module.
 *
 * Centralizes all status values, priority levels, transition rules, and Redis key
 * builders to avoid magic strings across the codebase.
 */

// ─── Status Values ────────────────────────────────────────────────────────────
export const MAINTENANCE_STATUSES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled'
} as const;

export type MaintenanceStatus = typeof MAINTENANCE_STATUSES[keyof typeof MAINTENANCE_STATUSES];

// ─── Priority Values ──────────────────────────────────────────────────────────
export const MAINTENANCE_PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
} as const;

export type MaintenancePriority = typeof MAINTENANCE_PRIORITIES[keyof typeof MAINTENANCE_PRIORITIES];

// ─── Workflow Transition Matrix ───────────────────────────────────────────────
/**
 * Defines which statuses a request can legally transition TO from its current status.
 * This matrix is the single source of truth for workflow enforcement.
 */
export const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  Pending: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Technician Assigned', 'Cancelled'],
  Rejected: [],
  'Technician Assigned': ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: ['Closed'],
  Closed: [],
  Cancelled: []
};

// ─── Asset statuses that BLOCK raising a maintenance request ──────────────────
export const BLOCKED_ASSET_STATUSES_FOR_MAINTENANCE = ['Disposed', 'Retired'] as const;

// ─── Redis Key Builders ───────────────────────────────────────────────────────
export const MAINTENANCE_REDIS_KEYS = {
  pending: (orgId: string) => `maintenance:pending:${orgId}`,
  inProgress: (orgId: string) => `maintenance:inprogress:${orgId}`,
  technicianQueue: (techId: string) => `maintenance:technician:${techId}`,
  dashboard: (orgId: string) => `maintenance:dashboard:${orgId}`
} as const;

export const MAINTENANCE_CACHE_TTL = 180; // 3 minutes
