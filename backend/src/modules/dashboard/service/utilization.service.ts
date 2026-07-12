import { DashboardRepository } from '../repository/dashboard.repository';
import { CacheService } from './cache.service';
import { DASHBOARD_REDIS_KEYS } from '../constants/dashboard.constants';
import { DashboardFilterDTO } from '../dto/dashboard.dto';

export class UtilizationService {
  private repository: DashboardRepository;
  private cache: CacheService;

  constructor(
    repository = new DashboardRepository(),
    cache = new CacheService()
  ) {
    this.repository = repository;
    this.cache = cache;
  }

  async getAssetUtilization(orgId: string, filters: DashboardFilterDTO = {}) {
    const isFiltered = Object.keys(filters).length > 0;
    if (!isFiltered) {
      const cacheKey = DASHBOARD_REDIS_KEYS.utilization(orgId);
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) return cached;

      const data = await this.repository.getAssetUtilization(orgId, filters);
      await this.cache.set(cacheKey, data);
      return data;
    }
    return this.repository.getAssetUtilization(orgId, filters);
  }

  async getBookingHeatmap(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.repository.getBookingHeatmap(orgId, filters);
  }
}

export default UtilizationService;
