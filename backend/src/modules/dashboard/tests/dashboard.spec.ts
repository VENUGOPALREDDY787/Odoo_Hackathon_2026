import { KPIService } from '../service/kpi.service';
import { AnalyticsService } from '../service/analytics.service';
import { UtilizationService } from '../service/utilization.service';
import { TrendService } from '../service/trend.service';
import { SummaryService } from '../service/summary.service';
import { DashboardRepository } from '../repository/dashboard.repository';
import { CacheService } from '../service/cache.service';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { ActivityLogRepository } from '../../activity-log/repository/activity-log.repository';

jest.mock('../repository/dashboard.repository');
jest.mock('../service/cache.service');
jest.mock('../../notification/repository/notification.repository');
jest.mock('../../activity-log/repository/activity-log.repository');

describe('Dashboard Services Unit Tests', () => {
  let mockRepo: jest.Mocked<DashboardRepository>;
  let mockCache: jest.Mocked<CacheService>;
  let mockNotifRepo: jest.Mocked<NotificationRepository>;
  let mockActivityRepo: jest.Mocked<ActivityLogRepository>;

  beforeEach(() => {
    mockRepo = new DashboardRepository() as any;
    mockCache = new CacheService() as any;
    mockNotifRepo = new NotificationRepository() as any;
    mockActivityRepo = new ActivityLogRepository() as any;
  });

  describe('KPIService', () => {
    it('should aggregate 17 KPI cards and handle filtering', async () => {
      mockRepo.getAssetStatusCounts.mockResolvedValue([
        { status: 'Available', _count: { id: 10 } },
        { status: 'Allocated', _count: { id: 5 } }
      ] as any);
      mockRepo.getPendingTransferCount.mockResolvedValue(2);
      mockRepo.getPendingMaintenanceCount.mockResolvedValue(1);
      mockRepo.getMaintenanceTodayCount.mockResolvedValue(0);
      mockRepo.getUpcomingReturnCount.mockResolvedValue(3);
      mockRepo.getOverdueReturnCount.mockResolvedValue(1);
      mockRepo.getTodayBookingCount.mockResolvedValue(4);
      mockRepo.getOngoingBookingCount.mockResolvedValue(2);
      mockRepo.getPendingAuditsCount.mockResolvedValue(1);
      mockRepo.getOpenDiscrepanciesCount.mockResolvedValue(2);
      mockNotifRepo.countUnread.mockResolvedValue(5);

      const service = new KPIService(mockRepo, mockNotifRepo);
      const kpis = await service.getKPIs('org-1', 'Admin', 'user-1', { categoryId: 'cat-1' });

      expect(kpis.assetsAvailable).toBe(10);
      expect(kpis.assetsAllocated).toBe(5);
      expect(kpis.pendingTransfers).toBe(2);
      expect(kpis.unreadNotifications).toBe(5);
      expect(mockRepo.getAssetStatusCounts).toHaveBeenCalledWith('org-1', { categoryId: 'cat-1' });
    });
  });

  describe('UtilizationService', () => {
    it('should retrieve asset utilization stats and use cache-aside pattern', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getAssetUtilization.mockResolvedValue({
        mostUsed: [],
        idle: []
      } as any);

      const service = new UtilizationService(mockRepo, mockCache);
      const utilization = await service.getAssetUtilization('org-1', {});

      expect(utilization).toBeDefined();
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockRepo.getAssetUtilization).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should bypass cache when filter is applied', async () => {
      mockRepo.getAssetUtilization.mockResolvedValue({
        mostUsed: [],
        idle: []
      } as any);

      const service = new UtilizationService(mockRepo, mockCache);
      const utilization = await service.getAssetUtilization('org-1', { location: 'HQ' });

      expect(utilization).toBeDefined();
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockRepo.getAssetUtilization).toHaveBeenCalledWith('org-1', { location: 'HQ' });
    });
  });

  describe('TrendService', () => {
    it('should retrieve cost trends from repo', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getMaintenanceCosts.mockResolvedValue([
        { resolvedAt: new Date(), _sum: { actualCost: 150 } }
      ] as any);

      const service = new TrendService(mockRepo, mockCache);
      const trend = await service.getMaintenanceCostTrend('org-1', {});

      expect(trend).toBeDefined();
      expect(mockRepo.getMaintenanceCosts).toHaveBeenCalled();
    });
  });

  describe('SummaryService', () => {
    it('should compile executive summary mapping user role for activity logs', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getAssetStatusCounts.mockResolvedValue([]);
      mockRepo.getPendingTransferCount.mockResolvedValue(0);
      mockRepo.getPendingMaintenanceCount.mockResolvedValue(0);
      mockRepo.getMaintenanceTodayCount.mockResolvedValue(0);
      mockRepo.getUpcomingReturnCount.mockResolvedValue(0);
      mockRepo.getOverdueReturnCount.mockResolvedValue(0);
      mockRepo.getTodayBookingCount.mockResolvedValue(0);
      mockRepo.getOngoingBookingCount.mockResolvedValue(0);
      mockRepo.getPendingAuditsCount.mockResolvedValue(0);
      mockRepo.getOpenDiscrepanciesCount.mockResolvedValue(0);
      mockNotifRepo.countUnread.mockResolvedValue(2);
      mockActivityRepo.findMany.mockResolvedValue([
        { id: 'act-1', action: 'CREATE' }
      ] as any);

      const kpiService = new KPIService(mockRepo, mockNotifRepo);
      const service = new SummaryService(kpiService, mockActivityRepo, mockCache);

      const summary = await service.getSummary('org-1', 'Employee', 'user-1', {});

      expect(summary.unreadNotificationsCount).toBe(2);
      expect(summary.recentActivities).toHaveLength(1);
      expect(mockActivityRepo.findMany).toHaveBeenCalledWith('org-1', { userId: 'user-1' }, 0, 5);
    });
  });
});
