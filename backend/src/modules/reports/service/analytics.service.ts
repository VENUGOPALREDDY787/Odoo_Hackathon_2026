import { ReportsRepository } from '../repositories/reports.repository';
import { CacheService } from '../../dashboard/service/cache.service';
import { REPORTS_REDIS_KEYS } from '../constants/reports.constants';

export class AnalyticsService {
  private repository: ReportsRepository;
  private cache: CacheService;

  constructor(
    repository = new ReportsRepository(),
    cache = new CacheService()
  ) {
    this.repository = repository;
    this.cache = cache;
  }

  private async getCachedAnalytics<T>(orgId: string, metric: string, fetchFn: () => Promise<T>): Promise<T> {
    const cacheKey = REPORTS_REDIS_KEYS.analytics(orgId, metric);
    const cached = await this.cache.get<T>(cacheKey);
    if (cached) return cached;

    const data = await fetchFn();
    await this.cache.set(cacheKey, data);
    return data;
  }

  async getMostUsedAssets(orgId: string) {
    return this.getCachedAnalytics(orgId, 'most_used', async () => {
      const raw = await this.repository.getAssetUtilization(orgId);
      return raw.sort((a, b) => b.totalUseCount - a.totalUseCount).slice(0, 10);
    });
  }

  async getLeastUsedAssets(orgId: string) {
    return this.getCachedAnalytics(orgId, 'least_used', async () => {
      const raw = await this.repository.getAssetUtilization(orgId);
      return raw.sort((a, b) => a.totalUseCount - b.totalUseCount).slice(0, 10);
    });
  }

  async getMostBookedResources(orgId: string) {
    return this.getCachedAnalytics(orgId, 'most_booked', async () => {
      const raw = await this.repository.getBookingUtilization(orgId);
      return raw.sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 10);
    });
  }

  async getLeastBookedResources(orgId: string) {
    return this.getCachedAnalytics(orgId, 'least_booked', async () => {
      const raw = await this.repository.getBookingUtilization(orgId);
      return raw.sort((a, b) => a.bookingCount - b.bookingCount).slice(0, 10);
    });
  }

  async getTopDepartments(orgId: string) {
    return this.getCachedAnalytics(orgId, 'top_depts', async () => {
      const raw = await this.repository.getDepartmentAllocation(orgId);
      return raw.sort((a, b) => b.activeCount - a.activeCount).slice(0, 5);
    });
  }

  async getAssetGrowth(orgId: string) {
    return this.getCachedAnalytics(orgId, 'growth', () =>
      this.repository.getAssetGrowth(orgId)
    );
  }

  async getMaintenanceTrends(orgId: string) {
    return this.getCachedAnalytics(orgId, 'maint_trends', () =>
      this.repository.getMaintenanceTrends(orgId)
    );
  }

  async getAllocationTrends(orgId: string) {
    return this.getCachedAnalytics(orgId, 'alloc_trends', () =>
      this.repository.getAllocationTrends(orgId)
    );
  }

  async getBookingTrends(orgId: string) {
    return this.getCachedAnalytics(orgId, 'booking_trends', () =>
      this.repository.getBookingTrends(orgId)
    );
  }

  async getAuditTrends(orgId: string) {
    return this.getCachedAnalytics(orgId, 'audit_trends', () =>
      this.repository.getAuditSummary(orgId)
    );
  }

  async getDepartmentEfficiency(orgId: string) {
    return this.getCachedAnalytics(orgId, 'dept_efficiency', () =>
      this.repository.getDepartmentEfficiency(orgId)
    );
  }

  async getTechnicianPerformance(orgId: string) {
    return this.getCachedAnalytics(orgId, 'tech_perf', () =>
      this.repository.getTechnicianPerformance(orgId)
    );
  }

  async getAssetReliability(orgId: string) {
    return this.getCachedAnalytics(orgId, 'reliability', () =>
      this.repository.getAssetMTBF(orgId)
    );
  }

  async getAvgResolutionTime(orgId: string) {
    return this.getCachedAnalytics(orgId, 'avg_res_time', () =>
      this.repository.getAvgResolutionTime(orgId)
    );
  }

  async getAssetAvailability(orgId: string) {
    return this.getCachedAnalytics(orgId, 'availability', () =>
      this.repository.getAssetAvailability(orgId)
    );
  }
}

export default AnalyticsService;
