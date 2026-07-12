import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../service/department.service';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/department.validators';
import ApiResponse from '../../../core/responses/ApiResponse';
import { z } from 'zod';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor(departmentService = new DepartmentService()) {
    this.departmentService = departmentService;
  }

  /**
   * Registers a new department.
   */
  createDepartment = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const validated = createDepartmentSchema.parse(req.body);
    const data = await this.departmentService.createDepartment(adminUser.id, adminUser.organizationId, validated);
    ApiResponse.success(res, data, 'Department created successfully', 201);
  };

  /**
   * Updates department details.
   */
  updateDepartment = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const validated = updateDepartmentSchema.parse(req.body);
    const data = await this.departmentService.updateDepartment(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string,
      validated
    );
    ApiResponse.success(res, data, 'Department updated successfully', 200);
  };

  /**
   * Deactivates a department (safeguarded against assigned assets and employees).
   */
  deactivateDepartment = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const data = await this.departmentService.deactivateDepartment(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string
    );
    ApiResponse.success(res, data, 'Department deactivated successfully', 200);
  };

  /**
   * Reactivates a department.
   */
  restoreDepartment = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const data = await this.departmentService.restoreDepartment(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string
    );
    ApiResponse.success(res, data, 'Department restored successfully', 200);
  };

  /**
   * Retrieves detail profile of a department.
   */
  getDepartment = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.departmentService.getDepartment(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Department retrieved successfully', 200);
  };

  /**
   * Lists all departments in the organization.
   */
  listDepartments = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.departmentService.listDepartments(user.organizationId, req.query);
    ApiResponse.success(res, data, 'Departments retrieved successfully', 200);
  };

  /**
   * Assigns the Department Head.
   */
  assignDepartmentHead = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const headSchema = z.object({
      managerId: z.string().uuid('Invalid manager ID')
    }).strict();
    const validated = headSchema.parse(req.body);

    const data = await this.departmentService.assignDepartmentHead(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string,
      validated.managerId
    );
    ApiResponse.success(res, data, 'Department head assigned successfully', 200);
  };
}
export default DepartmentController;
