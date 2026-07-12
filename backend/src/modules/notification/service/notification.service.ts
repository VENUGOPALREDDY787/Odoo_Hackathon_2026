import { NotificationRepository } from '../repository/notification.repository';
import { CreateNotificationDTO, BulkMarkNotificationsDTO, NotificationQueryDTO } from '../dto/notification.dto';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationTemplateService } from './notification-template.service';
import { emitToUser } from '../../../utils/socket';
import { NOTIFICATION_REDIS_KEYS, NOTIFICATION_CACHE_TTL } from '../constants/notification.constants';
import redis from '../../../core/redis/client';
import { AppError } from '../../../core/errors/AppError';
import { Prisma } from '@prisma/client';

/**
 * NotificationService — Infrastructure backbone handling In-App, Socket.IO,
 * template rendering, channel preferences, bulk status, and Redis cache synchronization.
 */
export class NotificationService {
  private repository: NotificationRepository;
  private preferenceService: NotificationPreferenceService;
  private templateService: NotificationTemplateService;

  constructor(
    repository = new NotificationRepository(),
    preferenceService = new NotificationPreferenceService(),
    templateService = new NotificationTemplateService()
  ) {
    this.repository = repository;
    this.preferenceService = preferenceService;
    this.templateService = templateService;
  }

  /**
   * Dispatches a notification.
   *
   * Workflow:
   *  1. Check preference settings for recipientId
   *  2. If inAppEnabled, store in database
   *  3. Invalidate Redis unread count cache
   *  4. Broadcast over Socket.IO user room
   *  5. Queue for external delivery channels (Email/Push) if enabled (future-ready)
   */
  async createNotification(
    orgId: string,
    dto: CreateNotificationDTO,
    tx?: Prisma.TransactionClient
  ) {
    // 1. Resolve preference checks
    const inAppEnabled = await this.preferenceService.isChannelEnabled(
      dto.recipientId,
      dto.type,
      'inAppEnabled'
    );

    if (!inAppEnabled) return null; // Recipient opted out of this alert channel

    // 2. Persist in DB
    const notification = await this.repository.create(orgId, dto, tx);

    // 3. Sync cache
    await this.invalidateUnreadCache(dto.recipientId);

    // 4. Emit real-time Socket event
    try {
      emitToUser(dto.recipientId, 'notification.created', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt
      });
      emitToUser(dto.recipientId, 'dashboard.notification.updated', { type: 'increment' });
    } catch { /* non-fatal Socket error */ }

    // Future-ready integrations (Email / Push Notifications)
    const emailEnabled = await this.preferenceService.isChannelEnabled(
      dto.recipientId,
      dto.type,
      'emailEnabled'
    );
    if (emailEnabled) {
      // TODO: Dispatch to SendGrid / SMTP microservice queue
    }

    return notification;
  }

  /**
   * Helper dispatching parameterized notifications using registered templates.
   */
  async dispatchTemplated(
    orgId: string,
    recipientId: string,
    type: string,
    variables: Record<string, string>,
    defaultTitle: string,
    defaultBody: string,
    relatedEntityType?: string | null,
    relatedEntityId?: string | null
  ) {
    const rendered = await this.templateService.render(
      orgId,
      type,
      variables,
      defaultTitle,
      defaultBody
    );

    return this.createNotification(orgId, {
      recipientId,
      title: rendered.title,
      message: rendered.message,
      type,
      relatedEntityType,
      relatedEntityId
    });
  }

  /**
   * Retrieves single notification.
   */
  async getNotification(orgId: string, id: string) {
    const notification = await this.repository.findById(id, orgId);
    if (!notification) throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
    return notification;
  }

  /**
   * Lists notifications for current user.
   */
  async listMyNotifications(orgId: string, recipientId: string, query: NotificationQueryDTO) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const filters: Prisma.NotificationWhereInput = {};
    if (query.status) filters.status = query.status;
    if (query.type) filters.type = query.type;

    const [total, notifications] = await Promise.all([
      this.repository.count(orgId, recipientId, filters),
      this.repository.findMany(orgId, recipientId, filters, skip, limit)
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Returns fast cached unread count for dashboard indicators.
   */
  async getUnreadCount(orgId: string, userId: string): Promise<number> {
    const cacheKey = NOTIFICATION_REDIS_KEYS.unreadCount(userId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) return parseInt(cached, 10);
    } catch { /* non-fatal cache fail */ }

    const count = await this.repository.countUnread(orgId, userId);

    try {
      await redis.setex(cacheKey, NOTIFICATION_CACHE_TTL, count.toString());
    } catch { /* non-fatal cache fail */ }

    return count;
  }

  /**
   * Marks a set of notifications as Read.
   */
  async markAsRead(orgId: string, userId: string, dto: BulkMarkNotificationsDTO) {
    await this.repository.updateStatusBulk(orgId, userId, dto.notificationIds, 'Read');
    await this.invalidateUnreadCache(userId);

    try {
      emitToUser(userId, 'notification.read', { ids: dto.notificationIds });
      emitToUser(userId, 'dashboard.notification.updated', { type: 'recalculate' });
    } catch { /* non-fatal socket fail */ }
  }

  /**
   * Marks all unread notifications of the current user as Read.
   */
  async markAllRead(orgId: string, userId: string) {
    await this.repository.markAllRead(orgId, userId);
    await this.invalidateUnreadCache(userId);

    try {
      emitToUser(userId, 'notification.read', { all: true });
      emitToUser(userId, 'dashboard.notification.updated', { type: 'zero' });
    } catch { /* non-fatal socket fail */ }
  }

  /**
   * Archives a set of notifications.
   */
  async archiveBulk(orgId: string, userId: string, dto: BulkMarkNotificationsDTO) {
    await this.repository.updateStatusBulk(orgId, userId, dto.notificationIds, 'Archived');
    await this.invalidateUnreadCache(userId);

    try {
      emitToUser(userId, 'notification.archived', { ids: dto.notificationIds });
    } catch { /* non-fatal socket fail */ }
  }

  /**
   * Soft-deletes a set of notifications.
   */
  async softDeleteBulk(orgId: string, userId: string, dto: BulkMarkNotificationsDTO) {
    await this.repository.softDeleteBulk(orgId, userId, dto.notificationIds);
    await this.invalidateUnreadCache(userId);

    try {
      emitToUser(userId, 'notification.deleted', { ids: dto.notificationIds });
    } catch { /* non-fatal socket fail */ }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async invalidateUnreadCache(userId: string): Promise<void> {
    try {
      await redis.del(NOTIFICATION_REDIS_KEYS.unreadCount(userId));
    } catch { /* non-fatal */ }
  }
}

export default NotificationService;
