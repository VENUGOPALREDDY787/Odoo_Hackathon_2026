import prisma from '../../database/db';
import { SocketManager } from '../socket/manager';
import { emailService } from '../email/service';
import logger from '../../config/logger';

export class NotificationService {
  private static instance: NotificationService;
  private socketManager: SocketManager;

  private constructor() {
    this.socketManager = SocketManager.getInstance();
  }

  /**
   * Resolves the singleton instance of the NotificationService.
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * dispatches a notification: persists to DB, triggers Socket alert, and emails the user.
   */
  async sendNotification(params: {
    organizationId: string;
    recipientId: string;
    title: string;
    message: string;
    type: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<void> {
    try {
      // 1. Persist to Database
      const notification = await prisma.notification.create({
        data: {
          organizationId: params.organizationId,
          recipientId: params.recipientId,
          title: params.title,
          message: params.message,
          type: params.type,
          relatedEntityType: params.relatedEntityType || null,
          relatedEntityId: params.relatedEntityId || null,
          isRead: false
        },
        include: {
          recipient: { select: { email: true, name: true } }
        }
      });

      // 2. Emit Real-time Socket Alert
      this.socketManager.emitToUser(params.recipientId, 'notification', notification);

      // 3. Dispatch SMTP Email Alert asynchronously to avoid blocking the main event loop
      if (notification.recipient?.email) {
        const emailContent = `
          <h3>AssetFlow Notification</h3>
          <p>Hello ${notification.recipient.name},</p>
          <p><strong>${params.title}</strong></p>
          <p>${params.message}</p>
          <br/>
          <p>This is an automated message. Please do not reply directly.</p>
        `;
        emailService.sendEmail(
          notification.recipient.email,
          `[AssetFlow] ${params.title}`,
          emailContent
        ).catch(err => {
          logger.error(`[NotificationService] Failed to send email alert:`, err);
        });
      }
    } catch (error) {
      logger.error('[NotificationService Error] Failed to create or dispatch notification:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
