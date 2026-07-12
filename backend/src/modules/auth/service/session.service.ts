import redis from '../../../core/redis/client';
import crypto from 'crypto';

export class SessionService {
  private redisClient = redis;

  /**
   * Hashes a token to store index keys securely.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Registers a refresh token in Redis (TTL matched to refresh token lifetime).
   */
  async createSession(userId: string, refreshToken: string, ttlSeconds: number = 7 * 24 * 3600): Promise<void> {
    const hash = this.hashToken(refreshToken);
    const key = `session:refresh:${userId}:${hash}`;
    await this.redisClient.set(key, 'active', 'EX', ttlSeconds);
  }

  /**
   * Validates if a refresh token session is currently active in Redis.
   */
  async validateSession(userId: string, refreshToken: string): Promise<boolean> {
    const hash = this.hashToken(refreshToken);
    const key = `session:refresh:${userId}:${hash}`;
    const status = await this.redisClient.get(key);
    return status === 'active';
  }

  /**
   * Removes a specific refresh token session from Redis (logout).
   */
  async invalidateSession(userId: string, refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    const key = `session:refresh:${userId}:${hash}`;
    await this.redisClient.del(key);
  }

  /**
   * Purges all active sessions for a user (forces full re-auth across devices).
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    const pattern = `session:refresh:${userId}:*`;
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  /**
   * Blacklists an access token until it expires to prevent token theft reuse.
   */
  async blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
    const key = `session:blacklist:${jti}`;
    await this.redisClient.set(key, 'blacklisted', 'EX', Math.max(1, ttlSeconds));
  }

  /**
   * Checks if an access token JTI exists in the Redis blacklist.
   */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const key = `session:blacklist:${jti}`;
    const status = await this.redisClient.get(key);
    return status === 'blacklisted';
  }
}

export const sessionService = new SessionService();
export default sessionService;
