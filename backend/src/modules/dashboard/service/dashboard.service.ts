import { KPIService } from './kpi.service';
import { AnalyticsService } from './analytics.service';
import { UtilizationService } from './utilization.service';
import { TrendService } from './trend.service';
import { SummaryService } from './summary.service';
import { DashboardRepository } from '../repository/dashboard.repository';
import { DashboardFilterDTO } from '../dto/dashboard.dto';

export class DashboardService {
  private kpiService: KPIService;
  private analyticsService: AnalyticsService;
  private utilizationService: UtilizationService;
  private trendService: TrendService;
  private summaryService: SummaryService;
  private repository: DashboardRepository;

  constructor(
    kpiService = new KPIService(),
    analyticsService = new AnalyticsService(),
    utilizationService = new UtilizationService(),
    trendService = new TrendService(),
    summaryService = new SummaryService(),
    repository = new DashboardRepository()
  ) {
    this.kpiService = kpiService;
    this.analyticsService = analyticsService;
    this.utilizationService = utilizationService;
    this.trendService = trendService;
    this.summaryService = summaryService;
    this.repository = repository;
  }

  async getSummary(orgId: string, role: string, userId: string, filters: DashboardFilterDTO = {}) {
    return this.summaryService.getSummary(orgId, role, userId, filters);
  }

  async getKPIs(orgId: string, role: string, userId: string, filters: DashboardFilterDTO = {}) {
    return this.kpiService.getKPIs(orgId, role, userId, filters);
  }

  async getCategoryDistribution(orgId: string) {
    return this.analyticsService.getCategoryDistribution(orgId);
  }

  async getDepartmentDistribution(orgId: string) {
    return this.analyticsService.getDepartmentDistribution(orgId);
  }

  async getAssetUtilization(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.utilizationService.getAssetUtilization(orgId, filters);
  }

  async getBookingHeatmap(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.utilizationService.getBookingHeatmap(orgId, filters);
  }

  async getMaintenanceFrequency(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.repository.getMaintenanceFrequency(orgId, filters);
  }

  async getRetirementDue(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.repository.getRetirementDue(orgId, filters);
  }

  async getDepartmentAllocations(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.repository.getDepartmentAllocations(orgId, filters);
  }

  async getMaintenanceCostTrend(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.trendService.getMaintenanceCostTrend(orgId, filters);
  }

  async getAuditTrend(orgId: string, filters: DashboardFilterDTO = {}) {
    return this.trendService.getAuditTrend(orgId, filters);
  }
}

export default DashboardService;
