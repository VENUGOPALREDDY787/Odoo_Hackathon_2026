export interface ReportFilterDTO {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  categoryId?: string;
  location?: string;
  employeeId?: string;
  assetStatus?: string;
  priority?: string;
  year?: number;
  quarter?: number;
  month?: number;
  week?: number;
  groupBy?: string;
  format?: 'pdf' | 'xlsx' | 'csv' | 'json';
}

export interface MetricDataPoint {
  label: string;
  value: number;
}

export interface AssetUtilizationItem {
  assetId: string;
  name: string;
  assetTag: string;
  allocationCount: number;
  bookingCount: number;
  totalUseCount: number;
}

export interface DepartmentAllocationItem {
  departmentName: string;
  activeCount: number;
  totalCost: number;
}

export interface EmployeeAllocationItem {
  employeeName: string;
  employeeEmail: string;
  activeCount: number;
}

export interface MaintenanceFrequencyItem {
  assetName: string;
  assetTag: string;
  categoryName: string;
  requestCount: number;
}

export interface MaintenanceCostItem {
  assetName: string;
  assetTag: string;
  estimatedCost: number;
  actualCost: number;
}

export interface AssetLifecycleItem {
  assetName: string;
  assetTag: string;
  status: string;
  condition: string;
  createdAt: string;
}

export interface BookingUtilizationItem {
  assetName: string;
  assetTag: string;
  bookingCount: number;
  totalHours: number;
}

export interface BookingHeatmapItem {
  hour: string;
  day: string;
  count: number;
}

export interface AssetAgeItem {
  assetName: string;
  assetTag: string;
  ageYears: number;
  acquisitionDate: string;
}

export interface WarrantyExpiryItem {
  assetName: string;
  assetTag: string;
  acquisitionDate: string;
  warrantyPeriodMonths: number;
  expiryDate: string;
  status: 'Expired' | 'Active' | 'N/A';
}

export interface MaintenanceDueItem {
  assetName: string;
  assetTag: string;
  lastMaintenanceDate: string | null;
  daysSinceLastMaintenance: number | null;
  dueStatus: 'Immediate' | 'Upcoming' | 'Good';
}

export interface RetirementForecastItem {
  assetName: string;
  assetTag: string;
  acquisitionDate: string;
  condition: string;
  forecastedRetirementDate: string;
}

export interface AuditSummaryItem {
  cycleName: string;
  scopeType: string;
  verifiedCount: number;
  missingCount: number;
  damagedCount: number;
  status: string;
}

export interface MissingAssetItem {
  assetName: string;
  assetTag: string;
  location: string;
  lastSeenDate: string | null;
}

export interface DamagedAssetItem {
  assetName: string;
  assetTag: string;
  condition: string;
  status: string;
}

export interface DiscrepancyItem {
  assetName: string;
  assetTag: string;
  discrepancyType: string;
  description: string;
  severity: string;
}

export interface AssetMovementItem {
  assetName: string;
  assetTag: string;
  actionType: string;
  fromName: string;
  toName: string;
  timestamp: string;
}

export interface ActivityReportItem {
  userName: string;
  action: string;
  module: string;
  createdAt: string;
}

export interface NotificationReportItem {
  recipientName: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
