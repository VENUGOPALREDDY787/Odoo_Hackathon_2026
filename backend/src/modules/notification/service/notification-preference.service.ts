import { NotificationRepository } from '../repository/notification.repository';
import { UpdatePreferencesDTO } from '../dto/notification.dto';
import { NOTIFICATION_REDIS_KEYS, NOTIFICATION_CACHE_TTL } from '../constants/notification.constants';
import redis from '../../../core/redis/client';

/**
 * NotificationPreferenceService — Manages individual recipient opt-in/opt-out configs.
 */
export class NotificationPreferenceService {
  private repository: NotificationRepository;

  constructor(repository = new NotificationRepository()) {
    this.repository = repository;
  }

  /**
   * Retrieves preferences. Caches results in Redis.
   */
  async getPreferences(employeeId: string) {
    const cacheKey = NOTIFICATION_REDIS_KEYS.preferences(employeeId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* cache fail non-fatal */ }

    const prefs = await this.repository.findPreferences(employeeId);

    try {
      await redis.setex(cacheKey, NOTIFICATION_CACHE_TTL, JSON.stringify(prefs));
    } catch { /* cache fail non-fatal */ }

    return prefs;
  }

  /**
   * Updates preferences and invalidates cache.
   */
  async updatePreferences(orgId: string, employeeId: string, dto: UpdatePreferencesDTO) {
    const result = await this.repository.updatePreferences(orgId, employeeId, dto);

    // Invalidate Redis cache
    try {
      await redis.del(NOTIFICATION_REDIS_KEYS.preferences(employeeId));
    } catch { /* cache fail non-fatal */ }

    return result;
  }

  /**
   * Checks if a channel is enabled for a given user and notification type.
   * Defaults to TRUE if no specific preference row exists.
   */
  async isChannelEnabled(
    employeeId: string,
    type: string,
    channel: 'emailEnabled' | 'inAppEnabled' | 'pushEnabled'
  ): Promise<boolean> {
    const prefs = await this.getPreferences(employeeId);
    const specific = prefs.find((p: any) => p.type === type);
    
    if (specific) {
      return !!specific[channel];
    }

    const general = prefs.find((p: any) => p.type === 'all');
    if (general) {
      return !!general[channel];
    }

    return true; // default fallback
  }
}

export default NotificationPreferenceService;
