import redis from '../../../core/redis/client';
import crypto from 'crypto';

export class SessionService {
  private redisClient = redis;
  private memoryStore = new Map<string, { status: string; expiresAt: number }>();

  private isDev() {
    return process.env.NODE_ENV !== 'production';
  }

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
    
    if (this.isDev()) {
      this.memoryStore.set(key, { status: 'active', expiresAt: Date.now() + ttlSeconds * 1000 });
      return;
    }
    
    await this.redisClient.set(key, 'active', 'EX', ttlSeconds);
  }

  /**
   * Validates if a refresh token session is currently active in Redis.
   */
  async validateSession(userId: string, refreshToken: string): Promise<boolean> {
    const hash = this.hashToken(refreshToken);
    const key = `session:refresh:${userId}:${hash}`;
    
    if (this.isDev()) {
      const data = this.memoryStore.get(key);
      if (!data || Date.now() > data.expiresAt) return false;
      return data.status === 'active';
    }

    const status = await this.redisClient.get(key);
    return status === 'active';
  }

  /**
   * Removes a specific refresh token session from Redis (logout).
   */
  async invalidateSession(userId: string, refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    const key = `session:refresh:${userId}:${hash}`;
    
    if (this.isDev()) {
      this.memoryStore.delete(key);
      return;
    }
    
    await this.redisClient.del(key);
  }

  /**
   * Purges all active sessions for a user (forces full re-auth across devices).
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    const pattern = `session:refresh:${userId}:*`;
    
    if (this.isDev()) {
      for (const key of this.memoryStore.keys()) {
        if (key.startsWith(`session:refresh:${userId}:`)) {
          this.memoryStore.delete(key);
        }
      }
      return;
    }
    
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
    
    if (this.isDev()) {
      this.memoryStore.set(key, { status: 'blacklisted', expiresAt: Date.now() + ttlSeconds * 1000 });
      return;
    }
    
    await this.redisClient.set(key, 'blacklisted', 'EX', Math.max(1, ttlSeconds));
  }

  /**
   * Checks if an access token JTI exists in the Redis blacklist.
   */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const key = `session:blacklist:${jti}`;
    
    if (this.isDev()) {
      const data = this.memoryStore.get(key);
      if (!data || Date.now() > data.expiresAt) return false;
      return data.status === 'blacklisted';
    }
    
    const status = await this.redisClient.get(key);
    return status === 'blacklisted';
  }
}

export const sessionService = new SessionService();
export default sessionService;
