import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../service/audit.service';
import {
  createAuditCycleSchema, updateAuditCycleSchema, assignAuditorsSchema,
  verifyAssetSchema, addEvidenceSchema, cancelAuditSchema
} from '../validators/audit.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

/**
 * AuditController — HTTP request handlers for the Audit Management module.
 *
 * Route Map:
 *   POST   /audit                           — Create audit cycle
 *   GET    /audit                           — List audit cycles
 *   GET    /audit/dashboard                 — Org audit dashboard (KPIs)
 *   GET    /audit/:id                       — Audit cycle detail
 *   PUT    /audit/:id                       — Update cycle (Draft only)
 *   DELETE /audit/:id                       — Soft-delete cycle (Draft only)
 *   PUT    /audit/:id/assign-auditors       — Assign/replace auditors
 *   PUT    /audit/:id/schedule              — Transition Draft → Scheduled
 *   PUT    /audit/:id/start                 — Start audit (seeds AuditItems)
 *   PUT    /audit/:id/complete              — Manually complete audit
 *   PUT    /audit/:id/close                 — Close audit (immutable after)
 *   PUT    /audit/:id/cancel               — Cancel audit
 *   GET    /audit/:id/items                 — List verification items
 *   POST   /audit/:id/verify/:assetId      — Submit asset verification
 *   POST   /audit/:id/evidence/:assetId    — Upload evidence for asset
 *   GET    /audit/:id/discrepancies         — List discrepancies
 *   GET    /audit/:id/report               — Full audit report
 */
export class AuditController {
  private auditService: AuditService;

  constructor(auditService = new AuditService()) {
    this.auditService = auditService;
  }

  createCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = createAuditCycleSchema.parse(req.body);
    const data = await this.auditService.createCycle(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Audit cycle created successfully', 201);
  };

  listCycles = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const result = await this.auditService.listCycles(user.organizationId, req.query as any);
    ApiResponse.success(res, result.cycles, 'Audit cycles retrieved', 200, result.pagination);
  };

  getDashboard = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.getDashboard(user.organizationId);
    ApiResponse.success(res, data, 'Audit dashboard retrieved', 200);
  };

  getCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.getCycle(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Audit cycle retrieved', 200);
  };

  updateCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = updateAuditCycleSchema.parse(req.body);
    const data = await this.auditService.updateCycle(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Audit cycle updated', 200);
  };

  deleteCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    await this.auditService.deleteCycle(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, null, 'Audit cycle deleted', 200);
  };

  assignAuditors = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = assignAuditorsSchema.parse(req.body);
    const data = await this.auditService.assignAuditors(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Auditors assigned successfully', 200);
  };

  scheduleCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.scheduleCycle(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Audit cycle scheduled', 200);
  };

  startCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.startCycle(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Audit started successfully', 200);
  };

  completeCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.completeCycle(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Audit marked as completed', 200);
  };

  closeCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.closeCycle(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Audit cycle closed and locked', 200);
  };

  cancelCycle = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = cancelAuditSchema.parse(req.body);
    const data = await this.auditService.cancelCycle(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Audit cycle cancelled', 200);
  };

  listItems = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const result = await this.auditService.listItems(user.organizationId, req.params.id as string, req.query as any);
    ApiResponse.success(res, result.items, 'Audit items retrieved', 200, result.pagination);
  };

  verifyAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = verifyAssetSchema.parse(req.body);
    const data = await this.auditService.verifyAsset(
      user.id, user.organizationId,
      req.params.id as string, req.params.assetId as string, validated
    );
    ApiResponse.success(res, data, 'Asset verification recorded', 200);
  };

  addEvidence = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = addEvidenceSchema.parse(req.body);
    const data = await this.auditService.addEvidence(
      user.id, user.organizationId,
      req.params.id as string, req.params.assetId as string, validated
    );
    ApiResponse.success(res, data, 'Evidence uploaded successfully', 201);
  };

  getDiscrepancies = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.getDiscrepancies(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Discrepancies retrieved', 200);
  };

  getReport = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.auditService.getReport(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Audit report generated', 200);
  };
}

export default AuditController;
