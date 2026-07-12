import { Worker, Job } from 'bullmq';
import { bullmqConnection, QUEUE_NAMES } from '../queue.client';
import { NotificationRepository } from '../../../modules/notification/repository/notification.repository';
import { SocketManager } from '../../socket/manager';
import logger from '../../../config/logger';

/**
 * Reminder Worker
 *
 * Processes time-sensitive reminders for:
 *  - Booking reminders (upcoming resource bookings)
 *  - Maintenance reminders (overdue maintenance requests)
 *  - Warranty expiry reminders
 *
 * Job Payload (ReminderJobData):
 *  - type: 'booking' | 'maintenance' | 'warranty' | 'audit'
 *  - orgId: string
 *  - recipientId: string
 *  - title: string
 *  - message: string
 *  - relatedEntityId: string
 *  - relatedEntityType: string
 *  - recipientEmail?: string
 */
export interface ReminderJobData {
  type: 'booking' | 'maintenance' | 'warranty' | 'audit';
  orgId: string;
  recipientId: string;
  title: string;
  message: string;
  relatedEntityId: string;
  relatedEntityType: string;
  recipientEmail?: string;
  recipientName?: string;
}

let reminderWorker: Worker | null = null;

export function startReminderWorker(): Worker {
  const notificationRepo = new NotificationRepository();
  const socketManager = SocketManager.getInstance();

  reminderWorker = new Worker(
    QUEUE_NAMES.REMINDERS,
    async (job: Job<ReminderJobData>) => {
      const {
        orgId, recipientId, title, message,
        relatedEntityId, relatedEntityType, type
      } = job.data;

      logger.debug(`[ReminderWorker] Processing ${type} reminder job ${job.id} → ${recipientId}`);

      // Create in-app notification
      const notification = await notificationRepo.create(orgId, {
        recipientId,
        title,
        message,
        type: `${type.charAt(0).toUpperCase() + type.slice(1)} Reminder`,
        relatedEntityType,
        relatedEntityId,
      });

      // Push real-time notification
      socketManager.emitToUser(recipientId, 'notification:reminder', {
        id: notification.id,
        type,
        title,
        message,
        relatedEntityId,
        createdAt: notification.createdAt,
      });

      logger.debug(`[ReminderWorker] Reminder job ${job.id} delivered.`);
    },
    {
      connection: bullmqConnection,
      concurrency: 5, // Reminder delivery is lightweight
    }
  );

  reminderWorker.on('failed', (job, err) => {
    logger.error(`[ReminderWorker] Job ${job?.id} failed: ${err.message}`);
  });

  reminderWorker.on('error', (err) => {
    logger.error('[ReminderWorker] Worker error:', err.message);
  });

  logger.info('[BullMQ] Reminder worker started (concurrency=5).');
  return reminderWorker;
}

export async function stopReminderWorker(): Promise<void> {
  if (reminderWorker) {
    await reminderWorker.close();
    logger.info('[BullMQ] Reminder worker stopped.');
  }
}
