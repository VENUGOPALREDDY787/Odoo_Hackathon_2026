import http from 'http';
import app from './app';
import * as socket from './utils/socket';
import { startOverdueCron } from './utils/cron';
import { initQueues, closeQueues } from './core/queue/queue.client';
import { startNotificationWorker, stopNotificationWorker } from './core/queue/workers/notification.worker';
import { startExportWorker, stopExportWorker } from './core/queue/workers/export.worker';
import { startReminderWorker, stopReminderWorker } from './core/queue/workers/reminder.worker';
import logger from './config/logger';

const PORT = process.env.PORT || 5000;

// Create standard Node HTTP server wrapping Express app
const server = http.createServer(app);

// ─── Boot Sequence ───────────────────────────────────────────────────────────
async function bootstrap() {
  // 1. Initialize Socket.IO
  socket.init(server);

  // 2. Initialize BullMQ queues (always, so cron jobs can enqueue work)
  try {
    initQueues();
    if (process.env.NODE_ENV === 'production') {
      // 3. Start background workers (only in production — need Redis)
      startNotificationWorker();
      startExportWorker();
      startReminderWorker();
      logger.info('[Server] BullMQ workers started.');
    } else {
      logger.info('[Server] Local development: BullMQ queues ready, workers bypassed (Redis offline).');
    }
  } catch (err: any) {
    logger.error('[Server] BullMQ failed to initialize. Continuing without queue workers.', err.message);
  }

  // 4. Start background cron jobs
  startOverdueCron();

  // 5. Start HTTP server
  server.listen(PORT, () => {
    logger.info(`[Server] AssetFlow running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`[Server] ${signal} received. Graceful shutdown starting...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('[Server] HTTP server closed.');
  });

  try {
    // Stop BullMQ workers gracefully (finish in-flight jobs)
    await Promise.all([
      stopNotificationWorker(),
      stopExportWorker(),
      stopReminderWorker(),
    ]);
    await closeQueues();
    logger.info('[Server] BullMQ workers and queues closed.');
  } catch (err: any) {
    logger.error('[Server] Error during queue shutdown:', err.message);
  }

  logger.info('[Server] Graceful shutdown complete.');
  process.exit(0);
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejections and exceptions
process.on('unhandledRejection', (reason: any) => {
  const msg = reason instanceof Error ? reason.stack : JSON.stringify(reason);
  logger.error('[Server] Unhandled Promise Rejection:', msg);
  if (process.env.NODE_ENV === 'production') shutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err: Error) => {
  const msg = err instanceof Error ? err.stack : JSON.stringify(err);
  logger.error('[Server] Uncaught Exception:', msg);
  if (process.env.NODE_ENV === 'production') shutdown('UNCAUGHT_EXCEPTION');
});

bootstrap();
