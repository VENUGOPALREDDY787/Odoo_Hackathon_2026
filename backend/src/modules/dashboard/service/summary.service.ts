import { KPIService } from './kpi.service';
import { ActivityLogRepository } from '../../activity-log/repository/activity-log.repository';
import { CacheService } from './cache.service';
import { DASHBOARD_REDIS_KEYS } from '../constants/dashboard.constants';
import { DashboardFilterDTO, DashboardSummaryResponse } from '../dto/dashboard.dto';

export class SummaryService {
  private kpiService: KPIService;
  private activityRepository: ActivityLogRepository;
  private cache: CacheService;

  constructor(
    kpiService = new KPIService(),
    activityRepository = new ActivityLogRepository(),
    cache = new CacheService()
  ) {
    this.kpiService = kpiService;
    this.activityRepository = activityRepository;
    this.cache = cache;
  }

  async getSummary(
    orgId: string,
    role: string,
    userId: string,
    filters: DashboardFilterDTO = {}
  ): Promise<DashboardSummaryResponse> {
    const isFiltered = Object.keys(filters).length > 0;

    if (!isFiltered) {
      const cacheKey = DASHBOARD_REDIS_KEYS.summary(orgId, role, userId);
      const cached = await this.cache.get<DashboardSummaryResponse>(cacheKey);
      if (cached) return cached;
    }

    // Build activity filter based on role and filters
    const activityFilters: any = {};
    if (role === 'Department Head' && filters.departmentId) {
      activityFilters.departmentId = filters.departmentId;
    } else if (role === 'Employee') {
      activityFilters.userId = userId;
    } else {
      if (filters.departmentId) activityFilters.departmentId = filters.departmentId;
      if (filters.employeeId) activityFilters.userId = filters.employeeId;
    }

    const [kpis, recentActivities] = await Promise.all([
      this.kpiService.getKPIs(orgId, role, userId, filters),
      this.activityRepository.findMany(orgId, activityFilters, 0, 5)
    ]);

    const result: DashboardSummaryResponse = {
      kpis,
      recentActivities,
      unreadNotificationsCount: kpis.unreadNotifications
    };

    if (!isFiltered) {
      const cacheKey = DASHBOARD_REDIS_KEYS.summary(orgId, role, userId);
      await this.cache.set(cacheKey, result);
    }

    return result;
  }
}

export default SummaryService;
