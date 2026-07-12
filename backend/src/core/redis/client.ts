import Redis from 'ioredis';
import config from '../../config';
import logger from '../../config/logger';

// ─── Shared Redis Options ───────────────────────────────────────────────────
const baseOptions: Redis['options'] = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,

  // Don't throw if Redis is temporarily down — reconnect in background
  lazyConnect: true,

  // Don't queue commands when disconnected — fail fast and let caller handle
  enableOfflineQueue: false,

  // Individual command timeout (5s prevents runaway queries)
  commandTimeout: 5000,

  // Connection establishment timeout
  connectTimeout: 10000,

  // Max retries per individual request before giving up
  maxRetriesPerRequest: 3,

  // Exponential backoff with a cap of 5s
  retryStrategy(times: number) {
    if (times > 20) {
      // After 20 retries (~60s), stop trying to reconnect
      logger.error('[Redis] Max reconnect attempts reached. Redis unavailable.');
      return null; // null stops retrying
    }
    return Math.min(times * 100, 5000);
  },

  reconnectOnError(err: Error) {
    // Reconnect on READONLY errors (cluster failover scenarios)
    return err.message.includes('READONLY');
  }
};

// ─── Primary Redis Client (pub/sub, cache, rate limiting) ─────────────────
let redis: Redis;

try {
  redis = new Redis(baseOptions);

  redis.on('connect', () => {
    logger.info(`[Redis] Connected to redis://${config.REDIS_HOST}:${config.REDIS_PORT}`);
  });

  redis.on('ready', () => {
    logger.info('[Redis] Client is ready to accept commands.');
  });

  redis.on('error', (err: Error) => {
    logger.error('[Redis] Connection error:', err.message);
    // Do NOT throw — Redis errors should be non-fatal; app degrades gracefully
  });

  redis.on('close', () => {
    logger.warn('[Redis] Connection closed. Reconnecting...');
  });

  redis.on('reconnecting', (delay: number) => {
    logger.info(`[Redis] Reconnecting in ${delay}ms...`);
  });

  // Initiate connection eagerly (despite lazyConnect, we want early failure detection)
  redis.connect().catch((err) => {
    logger.error('[Redis] Initial connection failed. App will retry automatically.', err.message);
  });

} catch (error) {
  logger.error('[Redis Initialization Error] Failed to create Redis instance:', error);
  throw error;
}

/**
 * Creates a **dedicated** Redis connection for BullMQ.
 *
 * BullMQ requires its own separate connections — it uses blocking commands
 * (BRPOP/BLPOP) that cannot share a connection with regular commands.
 *
 * Call this once per Queue or Worker, NOT per request.
 */
export function createBlockingClient(): Redis {
  const client = new Redis({
    ...baseOptions,
    // BullMQ needs blocking operations — re-enable offline queue
    enableOfflineQueue: true,
    // Remove command timeout for blocking clients (BRPOP can wait indefinitely)
    commandTimeout: undefined,
    maxRetriesPerRequest: null as any, // BullMQ expects null here
  });

  client.on('error', (err: Error) => {
    logger.error('[Redis Blocking Client] Error:', err.message);
  });

  return client;
}

export default redis;
export { redis };
