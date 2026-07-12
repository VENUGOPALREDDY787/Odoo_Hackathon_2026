import redis from '../../../core/redis/client';
import { DASHBOARD_CACHE_TTL } from '../constants/dashboard.constants';

/**
 * CacheService — Controls Redis caching layers for KPIs, charts, and distribution analytics.
 */
export class CacheService {
  /**
   * Retrieves value from Redis cache.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await redis.get(key);
      if (val !== null) return JSON.parse(val);
    } catch { /* cache error is non-fatal */ }
    return null;
  }

  /**
   * Caches value in Redis with standard TTL.
   */
  async set<T>(key: string, data: T): Promise<void> {
    try {
      await redis.setex(key, DASHBOARD_CACHE_TTL, JSON.stringify(data));
    } catch { /* cache error is non-fatal */ }
  }

  /**
   * Invalidates all dashboard related cache keys for an organization.
   * Scans for key patterns and purges them.
   */
  async invalidateOrgCache(orgId: string): Promise<void> {
    try {
      const keys = await redis.keys(`*dashboard*:${orgId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch { /* cache invalidation fail non-fatal */ }
  }
}

export const cacheService = new CacheService();
export default cacheService;
