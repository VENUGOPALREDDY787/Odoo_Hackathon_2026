import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../service/report.service';
import { AnalyticsService } from '../service/analytics.service';
import { SummaryService } from '../service/summary.service';
import { ExportService } from '../service/export.service';
import { reportFilterSchema } from '../validators/reports.validators';
import { ActivityLogRepository } from '../../activity-log/repository/activity-log.repository';
import ApiResponse from '../../../core/responses/ApiResponse';
import prisma from '../../../database/db';

export class ReportsController {
  private reportService: ReportService;
  private analyticsService: AnalyticsService;
  private summaryService: SummaryService;
  private exportService: ExportService;
  private activityLogRepo: ActivityLogRepository;

  constructor(
    reportService = new ReportService(),
    analyticsService = new AnalyticsService(),
    summaryService = new SummaryService(),
    exportService = new ExportService(),
    activityLogRepo = new ActivityLogRepository()
  ) {
    this.reportService = reportService;
    this.analyticsService = analyticsService;
    this.summaryService = summaryService;
    this.exportService = exportService;
    this.activityLogRepo = activityLogRepo;
  }

  private async getScopedFilters(userId: string, role: string, orgId: string, queryFilters: any): Promise<any> {
    const filters = { ...queryFilters };

    if (role === 'Employee') {
      filters.employeeId = userId;
    } else if (role === 'Department Head') {
      const emp = await prisma.employee.findUnique({
        where: { id: userId },
        select: { departmentId: true }
      });
      const managedDept = await prisma.department.findFirst({
        where: { managerId: userId, organizationId: orgId }
      });
      filters.departmentId = managedDept?.id || emp?.departmentId || undefined;
    }

    return filters;
  }

  private async sendReportResponse(
    req: Request,
    res: Response,
    title: string,
    headers: string[],
    data: any[],
    rowMapper: (item: any) => any[],
    filters: any
  ) {
    const format = filters.format || 'json';
    const user = (req as any).user;

    // Log Activity
    await this.activityLogRepo.create(user.organizationId, {
      userId: user.id,
      action: format === 'json' ? 'Report Generated' : 'Report Exported',
      module: 'Reports',
      entityType: 'Report',
      oldValue: null,
      newValue: JSON.parse(JSON.stringify({ title, filters, format }))
    });

    if (format === 'json') {
      return ApiResponse.success(res, data, `${title} retrieved`, 200);
    }

    const rows = data.map(rowMapper);

    if (format === 'csv') {
      const csv = this.exportService.generateCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(/ /g, '_')}-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    if (format === 'pdf') {
      const pdfBuffer = await this.exportService.generatePDF(title, headers, rows, filters, user.email);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(/ /g, '_')}-${Date.now()}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    if (format === 'xlsx') {
      const excelBuffer = await this.exportService.generateExcel(title, headers, rows, filters, user.email);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(/ /g, '_')}-${Date.now()}.xlsx"`);
      return res.status(200).send(excelBuffer);
    }
    return;
  }

  // 1. Asset Utilization Report
  getAssetUtilization = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getAssetUtilizationReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Asset Utilization Report',
      ['Asset ID', 'Name', 'Tag', 'Allocations', 'Bookings', 'Total Uses'],
      data,
      (item) => [item.assetId, item.name, item.assetTag, item.allocationCount, item.bookingCount, item.totalUseCount],
      filters
    );
  };

  // 2. Department Allocation Report
  getDepartmentAllocation = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getDepartmentAllocationReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Department Allocation Report',
      ['Department', 'Active Checkouts', 'Total Asset Cost ($)'],
      data,
      (item) => [item.departmentName, item.activeCount, item.totalCost],
      filters
    );
  };

  // 3. Employee Allocation Report
  getEmployeeAllocation = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getEmployeeAllocationReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Employee Allocation Report',
      ['Employee Name', 'Email', 'Active Checkouts'],
      data,
      (item) => [item.employeeName, item.employeeEmail, item.activeCount],
      filters
    );
  };

  // 4. Maintenance Frequency Report
  getMaintenanceFrequency = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getMaintenanceFrequencyReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Maintenance Frequency Report',
      ['Asset Name', 'Asset Tag', 'Category', 'Maintenance Requests'],
      data,
      (item) => [item.assetName, item.assetTag, item.categoryName, item.requestCount],
      filters
    );
  };

  // 5. Maintenance Cost Report
  getMaintenanceCost = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getMaintenanceCostReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Maintenance Cost Report',
      ['Asset Name', 'Asset Tag', 'Estimated Cost ($)', 'Actual Cost ($)'],
      data,
      (item) => [item.assetName, item.assetTag, item.estimatedCost, item.actualCost],
      filters
    );
  };

  // 6. Asset Lifecycle Report
  getAssetLifecycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getAssetLifecycleReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Asset Lifecycle Report',
      ['Asset Name', 'Asset Tag', 'Status', 'Condition', 'Registration Date'],
      data,
      (item) => [item.assetName, item.assetTag, item.status, item.condition, item.createdAt],
      filters
    );
  };

  // 7. Booking Utilization Report
  getBookingUtilization = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getBookingUtilizationReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Booking Utilization Report',
      ['Asset Name', 'Asset Tag', 'Bookings Count', 'Total Hours Booked'],
      data,
      (item) => [item.assetName, item.assetTag, item.bookingCount, item.totalHours],
      filters
    );
  };

  // 8. Booking Heatmap
  getBookingHeatmap = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getBookingHeatmapReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Booking Heatmap Report',
      ['Hour', 'Day', 'Count'],
      data.byHour,
      (item) => [item.hour, 'N/A', item.count],
      filters
    );
  };

  // 9. Asset Age Report
  getAssetAge = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getAssetAgeReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Asset Age Report',
      ['Asset Name', 'Asset Tag', 'Age (Years)', 'Acquisition Date'],
      data,
      (item) => [item.assetName, item.assetTag, item.ageYears, item.acquisitionDate],
      filters
    );
  };

  // 10. Warranty Expiry Report
  getWarrantyExpiry = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getWarrantyExpiryReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Warranty Expiry Report',
      ['Asset Name', 'Asset Tag', 'Acquisition Date', 'Warranty (Months)', 'Expiry Date', 'Status'],
      data,
      (item) => [item.assetName, item.assetTag, item.acquisitionDate, item.warrantyPeriodMonths, item.expiryDate, item.status],
      filters
    );
  };

  // 11. Maintenance Due Report
  getMaintenanceDue = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getMaintenanceDueReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Maintenance Due Report',
      ['Asset Name', 'Asset Tag', 'Last Maintenance Date', 'Days Since Last', 'Due Status'],
      data,
      (item) => [item.assetName, item.assetTag, item.lastMaintenanceDate || 'Never', item.daysSinceLastMaintenance ?? 'N/A', item.dueStatus],
      filters
    );
  };

  // 12. Retirement Forecast
  getRetirementForecast = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getRetirementForecastReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Retirement Forecast Report',
      ['Asset Name', 'Asset Tag', 'Acquisition Date', 'Condition', 'Forecasted Retirement'],
      data,
      (item) => [item.assetName, item.assetTag, item.acquisitionDate, item.condition, item.forecastedRetirementDate],
      filters
    );
  };

  // 13. Audit Summary Report
  getAuditSummary = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getAuditSummaryReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Audit Summary Report',
      ['Cycle Name', 'Scope Type', 'Verified Count', 'Missing Count', 'Damaged Count', 'Status'],
      data,
      (item) => [item.cycleName, item.scopeType, item.verifiedCount, item.missingCount, item.damagedCount, item.status],
      filters
    );
  };

  // 14. Missing Asset Report
  getMissingAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getMissingAssetReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Missing Assets Report',
      ['Asset Name', 'Asset Tag', 'Location', 'Last Verified Date'],
      data,
      (item) => [item.assetName, item.assetTag, item.location, item.lastSeenDate || 'Unknown'],
      filters
    );
  };

  // 15. Damaged Asset Report
  getDamagedAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getDamagedAssetReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Damaged Assets Report',
      ['Asset Name', 'Asset Tag', 'Condition', 'Status'],
      data,
      (item) => [item.assetName, item.assetTag, item.condition, item.status],
      filters
    );
  };

  // 16. Discrepancy Report
  getDiscrepancy = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getDiscrepancyReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Audit Discrepancy Report',
      ['Asset Name', 'Asset Tag', 'Type', 'Description', 'Severity'],
      data,
      (item) => [item.assetName, item.assetTag, item.discrepancyType, item.description, item.severity],
      filters
    );
  };

  // 17. Asset Movement Report
  getAssetMovement = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getAssetMovementReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Asset Movement Report',
      ['Asset Name', 'Asset Tag', 'Action', 'From Holder', 'To Holder', 'Timestamp'],
      data,
      (item) => [item.assetName, item.assetTag, item.actionType, item.fromName, item.toName, item.timestamp],
      filters
    );
  };

  // 18. Activity Report
  getActivity = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getActivityReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'System Activity Report',
      ['User Name', 'Action', 'Module', 'Timestamp'],
      data,
      (item) => [item.userName, item.action, item.module, item.createdAt],
      filters
    );
  };

  // 19. Notification Report
  getNotification = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = reportFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.reportService.getNotificationReport(user.organizationId, filters);
    await this.sendReportResponse(
      req,
      res,
      'Notification Dispatch Report',
      ['Recipient', 'Notification Type', 'Status', 'Timestamp'],
      data,
      (item) => [item.recipientName, item.type, item.isRead ? 'Read' : 'Unread', item.createdAt],
      filters
    );
  };

  // 20. Dashboard Summary Report
  getDashboardSummary = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.summaryService.getExecutiveSummary(user.organizationId);

    // Log Activity
    await this.activityLogRepo.create(user.organizationId, {
      userId: user.id,
      action: 'Report Generated',
      module: 'Reports',
      entityType: 'Report',
      oldValue: null,
      newValue: JSON.parse(JSON.stringify({ title: 'Dashboard Summary Report' }))
    });

    ApiResponse.success(res, data, 'Dashboard Summary Report retrieved', 200);
  };

  // ─── Analytics Endpoints ────────────────────────────────────────────────────

  getAnalyticsSummary = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    const [
      mostUsed,
      leastUsed,
      mostBooked,
      leastBooked,
      topDepts,
      growth,
      reliability,
      availability
    ] = await Promise.all([
      this.analyticsService.getMostUsedAssets(user.organizationId),
      this.analyticsService.getLeastUsedAssets(user.organizationId),
      this.analyticsService.getMostBookedResources(user.organizationId),
      this.analyticsService.getLeastBookedResources(user.organizationId),
      this.analyticsService.getTopDepartments(user.organizationId),
      this.analyticsService.getAssetGrowth(user.organizationId),
      this.analyticsService.getAssetReliability(user.organizationId),
      this.analyticsService.getAssetAvailability(user.organizationId)
    ]);

    // Log Activity
    await this.activityLogRepo.create(user.organizationId, {
      userId: user.id,
      action: 'Analytics Viewed',
      module: 'Reports',
      entityType: 'Analytics',
      oldValue: null,
      newValue: null
    });

    ApiResponse.success(res, {
      mostUsed,
      leastUsed,
      mostBooked,
      leastBooked,
      topDepartments: topDepts,
      assetGrowth: growth,
      reliability: reliability.slice(0, 10),
      availability
    }, 'Analytics summary compiled successfully', 200);
  };
}

export default ReportsController;
