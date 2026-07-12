import Redis from 'ioredis';
import config from '../../config';
import logger from '../../config/logger';

let redis: Redis;

try {
  redis = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  });

  redis.on('connect', () => {
    logger.info(`[Redis] Client connected successfully to redis://${config.REDIS_HOST}:${config.REDIS_PORT}`);
  });

  redis.on('error', (err) => {
    logger.error('[Redis Error] Connection failed:', err);
  });
} catch (error) {
  logger.error('[Redis Initialization Error] Failed to create Redis instance:', error);
  throw error;
}

export default redis;
export { redis };
