import { NotificationType, NotificationStatus } from '../constants/notification.constants';

export interface CreateNotificationDTO {
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType | string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface BulkMarkNotificationsDTO {
  notificationIds: string[];
}

export interface UpdatePreferencesDTO {
  preferences: {
    type: string;
    emailEnabled: boolean;
    inAppEnabled: boolean;
    pushEnabled: boolean;
  }[];
}

export interface NotificationQueryDTO {
  status?: NotificationStatus | string;
  type?: string;
  page?: number;
  limit?: number;
}
