/**
 * audit.constants.ts — Centralized constants for the Audit Management module.
 *
 * Single source of truth for:
 *  - Status enumerations for AuditCycle and AuditItem
 *  - Allowed workflow transitions (state machine)
 *  - Discrepancy type and severity values
 *  - Redis cache key builders
 *  - TTL configuration
 */

// ─── Audit Cycle Statuses ─────────────────────────────────────────────────────
export const AUDIT_STATUSES = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled'
} as const;

export type AuditStatus = typeof AUDIT_STATUSES[keyof typeof AUDIT_STATUSES];

// ─── Audit Item Verification Statuses ────────────────────────────────────────
export const VERIFICATION_STATUSES = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
  NOT_VERIFIED: 'Not Verified'
} as const;

export type VerificationStatus = typeof VERIFICATION_STATUSES[keyof typeof VERIFICATION_STATUSES];

// ─── Discrepancy Types ────────────────────────────────────────────────────────
export const DISCREPANCY_TYPES = {
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
  UNEXPECTED: 'Unexpected',
  DUPLICATE: 'Duplicate'
} as const;

export type DiscrepancyType = typeof DISCREPANCY_TYPES[keyof typeof DISCREPANCY_TYPES];

// ─── Scope Types ──────────────────────────────────────────────────────────────
export const AUDIT_SCOPE_TYPES = ['All', 'Department', 'Location', 'Category'] as const;
export type AuditScopeType = typeof AUDIT_SCOPE_TYPES[number];

// ─── Workflow Transition Matrix ───────────────────────────────────────────────
/**
 * Defines legal status transitions for AuditCycle.
 * Used by assertTransitionAllowed() in the service layer.
 */
export const ALLOWED_AUDIT_TRANSITIONS: Record<AuditStatus, AuditStatus[]> = {
  Draft: ['Scheduled', 'Cancelled'],
  Scheduled: ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: ['Closed'],
  Closed: [],       // Immutable
  Cancelled: []     // Terminal
};

// ─── Redis Key Builders ───────────────────────────────────────────────────────
export const AUDIT_REDIS_KEYS = {
  dashboard: (orgId: string) => `audit:dashboard:${orgId}`,
  cycleItems: (auditId: string) => `audit:items:${auditId}`,
  pendingVerifications: (auditId: string) => `audit:pending:${auditId}`,
  discrepancies: (auditId: string) => `audit:discrepancies:${auditId}`,
  statistics: (orgId: string) => `audit:stats:${orgId}`
} as const;

export const AUDIT_CACHE_TTL = 120; // 2 minutes — short TTL since verifications update frequently
