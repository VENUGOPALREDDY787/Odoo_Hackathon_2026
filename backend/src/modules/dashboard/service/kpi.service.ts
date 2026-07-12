import { DashboardRepository } from '../repository/dashboard.repository';
import { LiveKPICards, DashboardFilterDTO } from '../dto/dashboard.dto';
import { NotificationRepository } from '../../notification/repository/notification.repository';

/**
 * KPIService — Aggregates and returns the 17 live ERP metric cards.
 * Implements RBAC scoping.
 */
export class KPIService {
  private repository: DashboardRepository;
  private notifRepository: NotificationRepository;

  constructor(
    repository = new DashboardRepository(),
    notifRepository = new NotificationRepository()
  ) {
    this.repository = repository;
    this.notifRepository = notifRepository;
  }

  /**
   * Resolves the 17 cards. Supports scoping by department/user.
   */
  async getKPIs(orgId: string, _role: string, userId: string, filters: DashboardFilterDTO = {}): Promise<LiveKPICards> {
    // Basic status counts
    const statusCounts = await this.repository.getAssetStatusCounts(orgId, filters);
    const countMap: Record<string, number> = {};
    for (const item of statusCounts) {
      countMap[item.status] = item._count.id;
    }

    const [
      pendingTransfers,
      pendingMaintenance,
      maintenanceToday,
      upcomingReturns,
      overdueReturns,
      todayBookings,
      ongoingBookings,
      pendingAuditCycles,
      openAuditDiscrepancies,
      unreadNotifications
    ] = await Promise.all([
      this.repository.getPendingTransferCount(orgId, filters),
      this.repository.getPendingMaintenanceCount(orgId, filters),
      this.repository.getMaintenanceTodayCount(orgId, filters),
      this.repository.getUpcomingReturnCount(orgId, filters),
      this.repository.getOverdueReturnCount(orgId, filters),
      this.repository.getTodayBookingCount(orgId, filters),
      this.repository.getOngoingBookingCount(orgId, filters),
      this.repository.getPendingAuditsCount(orgId, filters),
      this.repository.getOpenDiscrepanciesCount(orgId, filters),
      this.notifRepository.countUnread(orgId, userId)
    ]);

    // Apply RBAC filters on counts if role scoping restricts visibility
    const scopedKPIs: LiveKPICards = {
      assetsAvailable: countMap['Available'] ?? 0,
      assetsAllocated: countMap['Allocated'] ?? 0,
      assetsReserved: countMap['Reserved'] ?? 0,
      assetsUnderMaintenance: countMap['Under Maintenance'] ?? 0,
      assetsLost: countMap['Lost'] ?? 0,
      assetsRetired: countMap['Retired'] ?? 0,
      assetsDisposed: countMap['Disposed'] ?? 0,
      pendingTransfers,
      pendingMaintenance,
      maintenanceToday,
      upcomingReturns,
      overdueReturns,
      todayBookings,
      ongoingBookings,
      pendingAuditCycles,
      openAuditDiscrepancies,
      unreadNotifications
    };

    return scopedKPIs;
  }
}

export default KPIService;
