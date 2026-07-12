export interface DashboardFilterDTO {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  categoryId?: string;
  assetStatus?: string;
  location?: string;
  employeeId?: string;
}

export interface LiveKPICards {
  assetsAvailable: number;
  assetsAllocated: number;
  assetsReserved: number;
  assetsUnderMaintenance: number;
  assetsLost: number;
  assetsRetired: number;
  assetsDisposed: number;
  pendingTransfers: number;
  pendingMaintenance: number;
  maintenanceToday: number;
  upcomingReturns: number;
  overdueReturns: number;
  todayBookings: number;
  ongoingBookings: number;
  pendingAuditCycles: number;
  openAuditDiscrepancies: number;
  unreadNotifications: number;
}

export interface DistributionStat {
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardSummaryResponse {
  kpis: LiveKPICards;
  recentActivities: any[];
  unreadNotificationsCount: number;
}
