import { ActivityLogRepository } from '../repository/activity-log.repository';
import { ActivityLogService } from '../service/activity-log.service';

jest.mock('../repository/activity-log.repository');

describe('ActivityLogService Unit Tests', () => {
  let service: ActivityLogService;
  let mockRepo: jest.Mocked<ActivityLogRepository>;

  beforeEach(() => {
    mockRepo = new ActivityLogRepository() as any;
    service = new ActivityLogService(mockRepo);
  });

  it('should create log entries successfully', async () => {
    mockRepo.create.mockResolvedValue({
      id: 'log-123',
      organizationId: 'org-123',
      userId: 'user-123',
      action: 'LOGIN',
      module: 'Auth',
      entityType: 'User',
      entityId: 'user-123',
      oldValue: null,
      newValue: null,
      departmentId: null,
      ipAddress: '127.0.0.1',
      browser: 'Chrome',
      device: 'Desktop',
      requestId: 'req-123',
      createdAt: new Date()
    } as any);

    const logEntry = await service.log('org-123', {
      userId: 'user-123',
      action: 'LOGIN',
      module: 'Auth',
      entityType: 'User',
      entityId: 'user-123',
      ipAddress: '127.0.0.1',
      browser: 'Chrome',
      device: 'Desktop',
      requestId: 'req-123'
    });

    expect(logEntry).toBeDefined();
    expect(logEntry.id).toBe('log-123');
    expect(mockRepo.create).toHaveBeenCalled();
  });
});
