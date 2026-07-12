import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../service/dashboard.service';
import { dashboardFilterSchema } from '../validators/dashboard.validators';
import ApiResponse from '../../../core/responses/ApiResponse';
import prisma from '../../../database/db';

export class DashboardController {
  private service: DashboardService;

  constructor(service = new DashboardService()) {
    this.service = service;
  }

  /**
   * Helper to resolve filters based on user role and query parameters.
   */
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

  getSummary = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getSummary(user.organizationId, user.role, user.id, filters);
    ApiResponse.success(res, data, 'Dashboard summary retrieved successfully', 200);
  };

  getKPIs = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getKPIs(user.organizationId, user.role, user.id, filters);
    ApiResponse.success(res, data, 'Dashboard KPIs retrieved successfully', 200);
  };

  getCategoryDistribution = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.service.getCategoryDistribution(user.organizationId);
    ApiResponse.success(res, data, 'Category distribution retrieved successfully', 200);
  };

  getDepartmentDistribution = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.service.getDepartmentDistribution(user.organizationId);
    ApiResponse.success(res, data, 'Department distribution retrieved successfully', 200);
  };

  getAssetUtilization = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getAssetUtilization(user.organizationId, filters);
    ApiResponse.success(res, data, 'Asset utilization retrieved successfully', 200);
  };

  getBookingHeatmap = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getBookingHeatmap(user.organizationId, filters);
    ApiResponse.success(res, data, 'Booking heatmap retrieved successfully', 200);
  };

  getMaintenanceFrequency = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getMaintenanceFrequency(user.organizationId, filters);
    ApiResponse.success(res, data, 'Maintenance frequency retrieved successfully', 200);
  };

  getRetirementDue = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getRetirementDue(user.organizationId, filters);
    ApiResponse.success(res, data, 'Retirement due assets retrieved successfully', 200);
  };

  getDepartmentAllocations = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getDepartmentAllocations(user.organizationId, filters);
    ApiResponse.success(res, data, 'Department allocations retrieved successfully', 200);
  };

  getMaintenanceCostTrend = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getMaintenanceCostTrend(user.organizationId, filters);
    ApiResponse.success(res, data, 'Maintenance cost trend retrieved successfully', 200);
  };

  getAuditTrend = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const rawFilters = dashboardFilterSchema.parse(req.query);
    const filters = await this.getScopedFilters(user.id, user.role, user.organizationId, rawFilters);

    const data = await this.service.getAuditTrend(user.organizationId, filters);
    ApiResponse.success(res, data, 'Audit trend retrieved successfully', 200);
  };
}

export default DashboardController;
