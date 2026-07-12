import { Queue, ConnectionOptions } from 'bullmq';
import config from '../../config';
import logger from '../../config/logger';

/**
 * BullMQ Connection Configuration
 *
 * BullMQ requires dedicated Redis connections — it uses BLPOP/BRPOP
 * blocking commands that cannot share a connection with regular commands.
 *
 * Each Queue and each Worker gets its own connection via createBlockingClient().
 */

export const bullmqConnection: ConnectionOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Don't block on Redis ready state
};

/**
 * Queue name constants — centralised to avoid typos across workers/producers.
 */
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REMINDERS: 'reminders',
  EXPORTS: 'exports',
  DASHBOARD_REFRESH: 'dashboard-refresh',
} as const;

/**
 * Default job options applied to all queues unless overridden per-job.
 */
export const defaultJobOptions = {
  attempts: 3,           // Retry up to 3 times on failure
  backoff: {
    type: 'exponential' as const,
    delay: 2000,         // 2s, 4s, 8s backoff between retries
  },
  removeOnComplete: {
    count: 1000,         // Keep last 1000 completed jobs in Redis
    age: 86400,          // Remove completed jobs older than 24h
  },
  removeOnFail: {
    count: 5000,         // Keep last 5000 failed jobs for debugging
    age: 7 * 86400,      // Keep failed jobs for 7 days
  },
};

// ─── Queue Singletons ────────────────────────────────────────────────────────

let notificationQueue: Queue;
let reminderQueue: Queue;
let exportQueue: Queue;
let dashboardRefreshQueue: Queue;

/**
 * Initialise all BullMQ queues. Call once on server startup.
 */
export function initQueues(): void {
  notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
    connection: bullmqConnection,
    defaultJobOptions,
  });

  reminderQueue = new Queue(QUEUE_NAMES.REMINDERS, {
    connection: bullmqConnection,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2, // Reminders: fewer retries (time-sensitive)
    },
  });

  exportQueue = new Queue(QUEUE_NAMES.EXPORTS, {
    connection: bullmqConnection,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    },
  });

  dashboardRefreshQueue = new Queue(QUEUE_NAMES.DASHBOARD_REFRESH, {
    connection: bullmqConnection,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 1, // Dashboard refresh: fire once, don't retry (idempotent)
      removeOnComplete: { count: 100, age: 3600 },
    },
  });

  logger.info('[BullMQ] All queues initialised.');
}

export function getNotificationQueue(): Queue {
  if (!notificationQueue) throw new Error('Notification queue not initialised. Call initQueues() first.');
  return notificationQueue;
}

export function getReminderQueue(): Queue {
  if (!reminderQueue) throw new Error('Reminder queue not initialised. Call initQueues() first.');
  return reminderQueue;
}

export function getExportQueue(): Queue {
  if (!exportQueue) throw new Error('Export queue not initialised. Call initQueues() first.');
  return exportQueue;
}

export function getDashboardRefreshQueue(): Queue {
  if (!dashboardRefreshQueue) throw new Error('Dashboard refresh queue not initialised. Call initQueues() first.');
  return dashboardRefreshQueue;
}

/**
 * Gracefully closes all queues. Call on SIGTERM/SIGINT.
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    notificationQueue?.close(),
    reminderQueue?.close(),
    exportQueue?.close(),
    dashboardRefreshQueue?.close(),
  ]);
  logger.info('[BullMQ] All queues closed.');
}
