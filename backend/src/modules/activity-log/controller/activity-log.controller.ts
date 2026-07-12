import { Request, Response, NextFunction } from 'express';
import { ActivityLogService } from '../service/activity-log.service';
import { activityLogQuerySchema } from '../validators/activity-log.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

/**
 * ActivityLogController — HTTP handler routing for Audit Trail footprints.
 */
export class ActivityLogController {
  private service: ActivityLogService;

  constructor(service = new ActivityLogService()) {
    this.service = service;
  }

  /**
   * Retrieves paginated activity log trail.
   */
  listLogs = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = activityLogQuerySchema.parse(req.query);
    const result = await this.service.listLogs(user.organizationId, validated);
    ApiResponse.success(res, result.logs, 'Activity logs retrieved successfully', 200, result.pagination);
  };

  /**
   * Retrieves single footprint record details.
   */
  getLog = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.service.getLog(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Activity log details retrieved', 200);
  };

  /**
   * Exports activity log trail as downloadable CSV file.
   */
  exportLogs = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = activityLogQuerySchema.parse(req.query);
    const csvContent = await this.service.exportLogs(user.organizationId, validated);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  };
}

export default ActivityLogController;
