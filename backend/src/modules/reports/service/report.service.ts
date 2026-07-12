import { ReportsRepository } from '../repositories/reports.repository';
import { CacheService } from '../../dashboard/service/cache.service';
import { REPORTS_REDIS_KEYS } from '../constants/reports.constants';
import { ReportFilterDTO } from '../dto/reports.dto';

export class ReportService {
  private repository: ReportsRepository;
  private cache: CacheService;

  constructor(
    repository = new ReportsRepository(),
    cache = new CacheService()
  ) {
    this.repository = repository;
    this.cache = cache;
  }

  /**
   * Helper to execute reports with Redis caching (keys dynamically hashed by filter criteria).
   */
  private async getCachedReport<T>(
    orgId: string,
    type: string,
    filters: ReportFilterDTO,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const filterKey = Object.keys(filters).length > 0
      ? Buffer.from(JSON.stringify(filters)).toString('base64')
      : 'default';

    const cacheKey = REPORTS_REDIS_KEYS.report(orgId, type, filterKey);
    const cached = await this.cache.get<T>(cacheKey);
    if (cached) return cached;

    const data = await fetchFn();
    await this.cache.set(cacheKey, data);
    return data;
  }

  // 1. Asset Utilization Report
  async getAssetUtilizationReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'asset_utilization', filters, () =>
      this.repository.getAssetUtilization(orgId, filters)
    );
  }

  // 2. Department Allocation Report
  async getDepartmentAllocationReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'dept_allocation', filters, () =>
      this.repository.getDepartmentAllocation(orgId, filters)
    );
  }

  // 3. Employee Allocation Report
  async getEmployeeAllocationReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'emp_allocation', filters, () =>
      this.repository.getEmployeeAllocation(orgId, filters)
    );
  }

  // 4. Maintenance Frequency Report
  async getMaintenanceFrequencyReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'maintenance_freq', filters, () =>
      this.repository.getMaintenanceFrequency(orgId, filters)
    );
  }

  // 5. Maintenance Cost Report
  async getMaintenanceCostReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'maintenance_cost', filters, () =>
      this.repository.getMaintenanceCost(orgId, filters)
    );
  }

  // 6. Asset Lifecycle Report
  async getAssetLifecycleReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'asset_lifecycle', filters, () =>
      this.repository.getAssetLifecycle(orgId, filters)
    );
  }

  // 7. Booking Utilization Report
  async getBookingUtilizationReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'booking_utilization', filters, () =>
      this.repository.getBookingUtilization(orgId, filters)
    );
  }

  // 8. Booking Heatmap
  async getBookingHeatmapReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'booking_heatmap', filters, () =>
      this.repository.getBookingHeatmap(orgId, filters)
    );
  }

  // 9. Asset Age Report
  async getAssetAgeReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'asset_age', filters, () =>
      this.repository.getAssetAge(orgId, filters)
    );
  }

  // 10. Warranty Expiry Report
  async getWarrantyExpiryReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'warranty_expiry', filters, () =>
      this.repository.getWarrantyExpiry(orgId, filters)
    );
  }

  // 11. Maintenance Due Report
  async getMaintenanceDueReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'maintenance_due', filters, () =>
      this.repository.getMaintenanceDue(orgId, filters)
    );
  }

  // 12. Retirement Forecast
  async getRetirementForecastReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'retirement_forecast', filters, () =>
      this.repository.getRetirementForecast(orgId, filters)
    );
  }

  // 13. Audit Summary Report
  async getAuditSummaryReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'audit_summary', filters, () =>
      this.repository.getAuditSummary(orgId, filters)
    );
  }

  // 14. Missing Asset Report
  async getMissingAssetReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'missing_assets', filters, () =>
      this.repository.getMissingAssets(orgId, filters)
    );
  }

  // 15. Damaged Asset Report
  async getDamagedAssetReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'damaged_assets', filters, () =>
      this.repository.getDamagedAssets(orgId, filters)
    );
  }

  // 16. Discrepancy Report
  async getDiscrepancyReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'discrepancy_report', filters, () =>
      this.repository.getDiscrepancies(orgId, filters)
    );
  }

  // 17. Asset Movement Report
  async getAssetMovementReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'asset_movement', filters, () =>
      this.repository.getAssetMovement(orgId, filters)
    );
  }

  // 18. Activity Report
  async getActivityReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'activity_report', filters, () =>
      this.repository.getActivities(orgId, filters)
    );
  }

  // 19. Notification Report
  async getNotificationReport(orgId: string, filters: ReportFilterDTO = {}) {
    return this.getCachedReport(orgId, 'notification_report', filters, () =>
      this.repository.getNotifications(orgId, filters)
    );
  }
}

export default ReportService;
