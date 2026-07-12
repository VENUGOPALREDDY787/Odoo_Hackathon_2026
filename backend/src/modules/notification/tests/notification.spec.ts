import { NotificationRepository } from '../repository/notification.repository';
import { NotificationService } from '../service/notification.service';
import { NotificationPreferenceService } from '../service/notification-preference.service';
import { NotificationTemplateService } from '../service/notification-template.service';

jest.mock('../repository/notification.repository');
jest.mock('../service/notification-preference.service');
jest.mock('../service/notification-template.service');

describe('NotificationService Unit Tests', () => {
  let service: NotificationService;
  let mockRepo: jest.Mocked<NotificationRepository>;
  let mockPref: jest.Mocked<NotificationPreferenceService>;
  let mockTmpl: jest.Mocked<NotificationTemplateService>;

  beforeEach(() => {
    mockRepo = new NotificationRepository() as any;
    mockPref = new NotificationPreferenceService() as any;
    mockTmpl = new NotificationTemplateService() as any;
    service = new NotificationService(mockRepo, mockPref, mockTmpl);
  });

  it('should skip creation if recipient disabled in-app notifications', async () => {
    mockPref.isChannelEnabled.mockResolvedValue(false);

    const result = await service.createNotification('org-123', {
      recipientId: 'recipient-123',
      title: 'Alert',
      message: 'Body details',
      type: 'Asset Assigned'
    });

    expect(result).toBeNull();
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should persist notification if recipient opt-in settings allow it', async () => {
    mockPref.isChannelEnabled.mockResolvedValue(true);
    mockRepo.create.mockResolvedValue({
      id: 'notif-123',
      organizationId: 'org-123',
      recipientId: 'recipient-123',
      title: 'Alert',
      message: 'Body details',
      type: 'Asset Assigned',
      isRead: false,
      status: 'Unread',
      createdAt: new Date(),
      deletedAt: null
    } as any);

    const result = await service.createNotification('org-123', {
      recipientId: 'recipient-123',
      title: 'Alert',
      message: 'Body details',
      type: 'Asset Assigned'
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe('notif-123');
    expect(mockRepo.create).toHaveBeenCalled();
  });
});
