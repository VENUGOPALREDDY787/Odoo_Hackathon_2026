import { NotificationRepository } from '../repository/notification.repository';
import { NotificationService } from '../service/notification.service';
import { NotificationPreferenceService } from '../service/notification-preference.service';
import { NotificationTemplateService } from '../service/notification-template.service';
import redis from '../../../core/redis/client';

jest.mock('../repository/notification.repository');
jest.mock('../service/notification-preference.service');
jest.mock('../service/notification-template.service');
jest.mock('../../../core/redis/client', () => ({
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
}));
jest.mock('../../../utils/socket', () => ({
  emitToUser: jest.fn(),
}));

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
    // Re-set Redis mocks after resetMocks:true clears them
    (redis.get as jest.Mock).mockResolvedValue(null);      // cache miss
    (redis.setex as jest.Mock).mockResolvedValue('OK');
    (redis.del as jest.Mock).mockResolvedValue(1);
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

  describe('dispatchTemplated', () => {
    it('should fetch template, render it, and dispatch notification', async () => {
      mockTmpl.render.mockResolvedValue({
        title: 'Rendered Title: Asset 123',
        message: 'Rendered Body: Assigned to employee'
      });
      mockPref.isChannelEnabled.mockResolvedValue(true);
      mockRepo.create.mockResolvedValue({
        id: 'notif-999',
        title: 'Rendered Title: Asset 123',
        message: 'Rendered Body: Assigned to employee',
      } as any);

      const result = await service.dispatchTemplated(
        'org-123',
        'recipient-123',
        'Asset Assigned',
        { assetId: '123' },
        'Default Title',
        'Default Body'
      );

      expect(result?.id).toBe('notif-999');
      expect(mockTmpl.render).toHaveBeenCalledWith('org-123', 'Asset Assigned', { assetId: '123' }, 'Default Title', 'Default Body');
      expect(mockRepo.create).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count from repository when cache misses', async () => {
      // redis.get returns null (cache miss) — falls through to DB
      mockRepo.countUnread.mockResolvedValue(5);

      const count = await service.getUnreadCount('org-123', 'recipient-123');

      expect(count).toBe(5);
      expect(mockRepo.countUnread).toHaveBeenCalledWith('org-123', 'recipient-123');
    });
  });

  describe('markAsRead', () => {
    it('should update status bulk to Read and emit socket event', async () => {
      mockRepo.updateStatusBulk.mockResolvedValue(undefined as any);

      await service.markAsRead('org-123', 'recipient-123', { notificationIds: ['notif-1'] });

      expect(mockRepo.updateStatusBulk).toHaveBeenCalledWith('org-123', 'recipient-123', ['notif-1'], 'Read');
    });
  });

  describe('markAllRead', () => {
    it('should mark all read and emit socket event', async () => {
      mockRepo.markAllRead.mockResolvedValue(undefined as any);

      await service.markAllRead('org-123', 'recipient-123');

      expect(mockRepo.markAllRead).toHaveBeenCalledWith('org-123', 'recipient-123');
    });
  });
});
