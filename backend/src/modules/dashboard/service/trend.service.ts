import { DashboardRepository } from '../repository/dashboard.repository';
import { CacheService } from './cache.service';
import { DASHBOARD_REDIS_KEYS } from '../constants/dashboard.constants';
import { DashboardFilterDTO } from '../dto/dashboard.dto';

export class TrendService {
  private repository: DashboardRepository;
  private cache: CacheService;

  constructor(
    repository = new DashboardRepository(),
    cache = new CacheService()
  ) {
    this.repository = repository;
    this.cache = cache;
  }

  async getMaintenanceCostTrend(orgId: string, filters: DashboardFilterDTO = {}) {
    const isFiltered = Object.keys(filters).length > 0;
    if (!isFiltered) {
      const cacheKey = DASHBOARD_REDIS_KEYS.trends(orgId);
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) return cached;

      const data = await this.repository.getMaintenanceCosts(orgId, filters);
      await this.cache.set(cacheKey, data);
      return data;
    }
    return this.repository.getMaintenanceCosts(orgId, filters);
  }

  async getAuditTrend(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.repository.getAuditCompletionStats(orgId, filters);
  }
}

export default TrendService;
