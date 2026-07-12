import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../service/notification.service';
import { NotificationPreferenceService } from '../service/notification-preference.service';
import {
  createNotificationSchema, bulkMarkSchema, updatePreferencesSchema,
  notificationQuerySchema
} from '../validators/notification.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

/**
 * NotificationController — HTTP routing handlers for individual notifications.
 */
export class NotificationController {
  private service: NotificationService;
  private preferenceService: NotificationPreferenceService;

  constructor(
    service = new NotificationService(),
    preferenceService = new NotificationPreferenceService()
  ) {
    this.service = service;
    this.preferenceService = preferenceService;
  }

  createNotification = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = createNotificationSchema.parse(req.body);
    const data = await this.service.createNotification(user.organizationId, validated);
    ApiResponse.success(res, data, 'Notification created successfully', 201);
  };

  listMyNotifications = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = notificationQuerySchema.parse(req.query);
    const result = await this.service.listMyNotifications(user.organizationId, user.id, validated);
    ApiResponse.success(res, result.notifications, 'My notifications retrieved', 200, result.pagination);
  };

  getUnreadCount = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const count = await this.service.getUnreadCount(user.organizationId, user.id);
    ApiResponse.success(res, { count }, 'Unread count retrieved', 200);
  };

  markAsRead = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = bulkMarkSchema.parse(req.body);
    await this.service.markAsRead(user.organizationId, user.id, validated);
    ApiResponse.success(res, null, 'Notifications marked as read', 200);
  };

  markAllRead = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    await this.service.markAllRead(user.organizationId, user.id);
    ApiResponse.success(res, null, 'All notifications marked as read', 200);
  };

  archiveBulk = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = bulkMarkSchema.parse(req.body);
    await this.service.archiveBulk(user.organizationId, user.id, validated);
    ApiResponse.success(res, null, 'Notifications archived', 200);
  };

  softDeleteBulk = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = bulkMarkSchema.parse(req.body);
    await this.service.softDeleteBulk(user.organizationId, user.id, validated);
    ApiResponse.success(res, null, 'Notifications soft-deleted', 200);
  };

  getPreferences = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const prefs = await this.preferenceService.getPreferences(user.id);
    ApiResponse.success(res, prefs, 'Preferences retrieved successfully', 200);
  };

  updatePreferences = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = updatePreferencesSchema.parse(req.body);
    const data = await this.preferenceService.updatePreferences(user.organizationId, user.id, validated);
    ApiResponse.success(res, data, 'Preferences updated successfully', 200);
  };
}

export default NotificationController;
