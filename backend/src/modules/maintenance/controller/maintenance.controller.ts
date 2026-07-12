import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../service/maintenance.service';
import {
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
  approveMaintenanceSchema,
  rejectMaintenanceSchema,
  assignTechnicianSchema,
  completeMaintenanceSchema,
  cancelMaintenanceSchema
} from '../validators/maintenance.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

/**
 * MaintenanceController — HTTP request handlers for the Maintenance Management module.
 *
 * Route Map:
 *   POST   /maintenance                        — Raise request (all authenticated)
 *   GET    /maintenance                        — List requests (role-scoped)
 *   GET    /maintenance/report                 — Report summary (Admin/Manager)
 *   GET    /maintenance/:id                    — Request detail
 *   PUT    /maintenance/:id                    — Update metadata (raiser/Admin/Manager)
 *   PUT    /maintenance/:id/approve            — Approve (Admin/Manager)
 *   PUT    /maintenance/:id/reject             — Reject (Admin/Manager)
 *   PUT    /maintenance/:id/assign-technician  — Assign technician (Admin/Manager)
 *   PUT    /maintenance/:id/start              — Start work (Admin/Manager)
 *   PUT    /maintenance/:id/complete           — Complete/Resolve (Admin/Manager)
 *   PUT    /maintenance/:id/close              — Close resolved request (Admin/Manager)
 *   PUT    /maintenance/:id/cancel             — Cancel (raiser/Admin/Manager)
 */
export class MaintenanceController {
  private maintenanceService: MaintenanceService;

  constructor(maintenanceService = new MaintenanceService()) {
    this.maintenanceService = maintenanceService;
  }

  createRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = createMaintenanceRequestSchema.parse(req.body);
    const data = await this.maintenanceService.createRequest(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Maintenance request submitted successfully', 201);
  };

  listRequests = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const result = await this.maintenanceService.listRequests(
      user.id, user.organizationId, user.role, req.query as any
    );
    ApiResponse.success(res, result.requests, 'Maintenance requests retrieved', 200, result.pagination);
  };

  getRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.maintenanceService.getRequest(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Maintenance request retrieved', 200);
  };

  updateRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = updateMaintenanceRequestSchema.parse(req.body);
    const data = await this.maintenanceService.updateRequest(
      user.id, user.organizationId, req.params.id as string, validated, user.role
    );
    ApiResponse.success(res, data, 'Maintenance request updated', 200);
  };

  approveRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = approveMaintenanceSchema.parse(req.body);
    const data = await this.maintenanceService.approveRequest(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Maintenance request approved', 200);
  };

  rejectRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = rejectMaintenanceSchema.parse(req.body);
    const data = await this.maintenanceService.rejectRequest(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Maintenance request rejected', 200);
  };

  assignTechnician = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = assignTechnicianSchema.parse(req.body);
    const data = await this.maintenanceService.assignTechnician(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Technician assigned successfully', 200);
  };

  startMaintenance = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.maintenanceService.startMaintenance(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Maintenance started', 200);
  };

  completeMaintenance = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = completeMaintenanceSchema.parse(req.body);
    const data = await this.maintenanceService.completeMaintenance(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Maintenance resolved successfully', 200);
  };

  closeRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.maintenanceService.closeRequest(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Maintenance request closed', 200);
  };

  cancelRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = cancelMaintenanceSchema.parse(req.body);
    const data = await this.maintenanceService.cancelRequest(
      user.id, user.organizationId, req.params.id as string, validated, user.role
    );
    ApiResponse.success(res, data, 'Maintenance request cancelled', 200);
  };

  getReport = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.maintenanceService.getReport(user.organizationId);
    ApiResponse.success(res, data, 'Maintenance report retrieved', 200);
  };
}

export default MaintenanceController;
