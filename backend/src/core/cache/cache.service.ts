import redis from '../redis/client';
import logger from '../../config/logger';

/**
 * CacheService — Unified Redis caching layer.
 *
 * Design principles:
 *  - All methods are safe: Redis errors NEVER propagate to callers.
 *    The app degrades gracefully (cache miss) rather than crashing.
 *  - lazyLoad() implements cache-aside: load from DB on miss, store on hit.
 *  - invalidatePattern() uses SCAN (not KEYS) to avoid blocking Redis.
 *  - Tag-based invalidation groups related keys for atomic eviction.
 */
export class CacheService {
  private static instance: CacheService;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // ─── Core Operations ─────────────────────────────────────────────────────

  /**
   * Retrieve a cached value and deserialize it from JSON.
   * Returns null on miss or Redis error.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      logger.warn(`[Cache] GET failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Store a value in Redis with a TTL (seconds).
   * Serializes to JSON automatically.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err: any) {
      logger.warn(`[Cache] SET failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * Delete a specific cache key.
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (err: any) {
      logger.warn(`[Cache] DEL failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * Delete multiple keys at once.
   */
  async delMany(keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await redis.del(...keys);
    } catch (err: any) {
      logger.warn(`[Cache] DEL_MANY failed: ${err.message}`);
    }
  }

  /**
   * Increment an integer counter. Returns the new value.
   * Used for unread counts, rate tracking.
   */
  async incr(key: string): Promise<number> {
    try {
      return await redis.incr(key);
    } catch (err: any) {
      logger.warn(`[Cache] INCR failed for key "${key}": ${err.message}`);
      return 0;
    }
  }

  /**
   * Decrement an integer counter (floor at 0).
   */
  async decr(key: string): Promise<number> {
    try {
      const val = await redis.decr(key);
      return Math.max(0, val);
    } catch (err: any) {
      logger.warn(`[Cache] DECR failed for key "${key}": ${err.message}`);
      return 0;
    }
  }

  // ─── Cache-Aside Pattern ─────────────────────────────────────────────────

  /**
   * Lazy-load helper: returns cached value or calls `loader()` on miss,
   * then caches the result.
   *
   * Example:
   *   const depts = await cache.lazyLoad(
   *     CacheKeys.departments(orgId),
   *     TTL.DEPARTMENTS,
   *     () => departmentRepo.findAll(orgId)
   *   );
   */
  async lazyLoad<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await loader();
    // Fire-and-forget cache write — don't block the response
    this.set(key, data, ttlSeconds).catch(() => {});
    return data;
  }

  // ─── Pattern-Based Invalidation ──────────────────────────────────────────

  /**
   * Invalidates all keys matching a glob pattern.
   * Uses SCAN (cursor-based) to avoid blocking Redis with KEYS command.
   *
   * Example: invalidatePattern('reports:data:org123:*')
   */
  async invalidatePattern(pattern: string): Promise<number> {
    let deleted = 0;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) {
          await redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');
    } catch (err: any) {
      logger.warn(`[Cache] SCAN invalidation failed for pattern "${pattern}": ${err.message}`);
    }
    return deleted;
  }

  /**
   * Invalidates the dashboard + reports cache for an org when any module changes.
   * Call this after any write operation that affects org-level KPIs.
   */
  async invalidateOrgKPIs(orgId: string): Promise<void> {
    await Promise.all([
      this.del(`dashboard:${orgId}`),
      this.invalidatePattern(`reports:data:${orgId}:*`),
      this.del(`maintenance:dashboard:${orgId}`),
      this.del(`audit:dashboard:${orgId}`),
    ]);
  }

  /**
   * Invalidates all booking availability slots for an asset.
   * Call after booking create, cancel, or status change.
   */
  async invalidateBookingAvailability(assetId: string): Promise<void> {
    await this.invalidatePattern(`booking:avail:${assetId}:*`);
  }

  /**
   * Invalidates the unread count and notification list for a user.
   */
  async invalidateUserNotifications(userId: string): Promise<void> {
    await Promise.all([
      this.del(`notifications:unread:${userId}`),
      this.invalidatePattern(`notifications:list:${userId}:*`),
    ]);
  }

  /**
   * Invalidates department and employee lookup caches for an org.
   */
  async invalidateOrgLookups(orgId: string): Promise<void> {
    await Promise.all([
      this.del(`departments:${orgId}`),
      this.del(`categories:${orgId}`),
      this.del(`employees:${orgId}`),
    ]);
  }

  // ─── Health Check ─────────────────────────────────────────────────────────

  /**
   * Pings Redis and returns latency in ms. Returns -1 on failure.
   */
  async ping(): Promise<number> {
    try {
      const start = Date.now();
      await redis.ping();
      return Date.now() - start;
    } catch {
      return -1;
    }
  }
}

// Singleton export
export const cache = CacheService.getInstance();
export default cache;
