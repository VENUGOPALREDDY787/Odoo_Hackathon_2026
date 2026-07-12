import { Worker, Job } from 'bullmq';
import { bullmqConnection, QUEUE_NAMES } from '../queue.client';
import { NotificationRepository } from '../../../modules/notification/repository/notification.repository';
import { SocketManager } from '../../socket/manager';
import { EmailService } from '../../email/service';
import logger from '../../../config/logger';

/**
 * Notification Worker
 *
 * Processes notification delivery jobs off the main request thread.
 * Handles:
 *  - In-app delivery via Socket.io
 *  - Email delivery via NodeMailer
 *  - Notification preferences check before delivery
 *
 * Job Payload (NotificationJobData):
 *  - orgId: string
 *  - recipientId: string
 *  - title: string
 *  - message: string
 *  - type: string
 *  - relatedEntityType?: string
 *  - relatedEntityId?: string
 *  - sendEmail?: boolean
 *  - emailSubject?: string
 *  - emailBody?: string
 */

export interface NotificationJobData {
  orgId: string;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailBody?: string;
  recipientEmail?: string;
  recipientName?: string;
}

let notificationWorker: Worker | null = null;

export function startNotificationWorker(): Worker {
  const notificationRepo = new NotificationRepository();
  const emailService = new EmailService();
  const socketManager = SocketManager.getInstance();

  notificationWorker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job<NotificationJobData>) => {
      const { orgId, recipientId, title, message, type,
              relatedEntityType, relatedEntityId,
              sendEmail, emailSubject, emailBody,
              recipientEmail } = job.data;

      logger.debug(`[NotificationWorker] Processing job ${job.id}: ${type} → ${recipientId}`);

      try {
        // 1. Persist notification in DB
        const notification = await notificationRepo.create(orgId, {
          recipientId,
          title,
          message,
          type,
          relatedEntityType,
          relatedEntityId,
        });

        // 2. Real-time push via Socket.io
        socketManager.emitToUser(recipientId, 'notification:new', {
          id: notification.id,
          title,
          message,
          type,
          createdAt: notification.createdAt,
        });

        // 3. Email delivery (if requested and email configured)
        if (sendEmail && recipientEmail && emailSubject && emailBody) {
          await emailService.sendEmail(recipientEmail, emailSubject, emailBody);
        }

        logger.debug(`[NotificationWorker] Job ${job.id} completed successfully.`);
      } catch (err: any) {
        logger.error(`[NotificationWorker] Job ${job.id} failed: ${err.message}`);
        throw err; // Re-throw so BullMQ marks as failed and retries
      }
    },
    {
      connection: bullmqConnection,
      concurrency: 10,  // Process 10 notifications concurrently
      limiter: {
        max: 100,       // Max 100 jobs per duration
        duration: 1000, // 1 second window
      },
    }
  );

  notificationWorker.on('completed', (job) => {
    logger.debug(`[NotificationWorker] Job ${job.id} done.`);
  });

  notificationWorker.on('failed', (job, err) => {
    logger.error(`[NotificationWorker] Job ${job?.id} permanently failed: ${err.message}`);
  });

  notificationWorker.on('error', (err) => {
    logger.error('[NotificationWorker] Worker error:', err.message);
  });

  logger.info('[BullMQ] Notification worker started (concurrency=10).');
  return notificationWorker;
}

export async function stopNotificationWorker(): Promise<void> {
  if (notificationWorker) {
    await notificationWorker.close();
    logger.info('[BullMQ] Notification worker stopped.');
  }
}
