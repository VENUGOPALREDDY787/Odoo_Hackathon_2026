/**
 * dashboard.constants.ts — Enumeration and keys for the central Dashboard module.
 */

export const DASHBOARD_REDIS_KEYS = {
  summary: (orgId: string, role: string, userId: string) => `dashboard:summary:${orgId}:${role}:${userId}`,
  kpis: (orgId: string, role: string, userId: string) => `dashboard:kpis:${orgId}:${role}:${userId}`,
  analytics: (orgId: string, role: string) => `dashboard:analytics:${orgId}:${role}`,
  utilization: (orgId: string) => `dashboard:utilization:${orgId}`,
  trends: (orgId: string) => `dashboard:trends:${orgId}`,
  department: (orgId: string, deptId: string) => `dashboard:dept:${orgId}:${deptId}`
} as const;

export const DASHBOARD_CACHE_TTL = 300; // 5 minutes cache TTL
