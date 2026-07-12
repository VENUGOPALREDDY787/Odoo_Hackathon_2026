/**
 * reports.constants.ts — Caching namespaces, keys, and TTL constants.
 */

export const REPORTS_REDIS_KEYS = {
  report: (orgId: string, type: string, hash: string) => `reports:data:${orgId}:${type}:${hash}`,
  analytics: (orgId: string, metric: string) => `reports:analytics:${orgId}:${metric}`,
  trends: (orgId: string, trend: string) => `reports:trends:${orgId}:${trend}`,
  summary: (orgId: string) => `reports:summary:${orgId}`
} as const;

export const REPORTS_CACHE_TTL = 600; // 10 minutes cache TTL for report datasets
export const REPORT_EXPORT_FORMATS = ['pdf', 'xlsx', 'csv', 'json'] as const;
