import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../service/employee.service';
import { updateRoleSchema, updateStatusSchema, assignDepartmentSchema } from '../validators/employee.validators';
import * as response from '../../../utils/response';

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor(employeeService = new EmployeeService()) {
    this.employeeService = employeeService;
  }

  /**
   * Returns details of the logged-in profile.
   */
  getProfile = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.employeeService.getProfile(user.id, user.organizationId);
    res.status(200).json(response.success(data, 'Employee profile retrieved successfully'));
  };

  /**
   * Returns the directory listing based on query filters.
   */
  listEmployees = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.employeeService.listEmployees(user.organizationId, req.query);
    res.status(200).json(response.success(data.employees, 'Employee directory retrieved successfully', data.pagination));
  };

  /**
   * Updates an employee's role (Admin only).
   */
  updateRole = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const validated = updateRoleSchema.parse(req.body);
    const data = await this.employeeService.updateRole(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string,
      validated
    );
    res.status(200).json(response.success(data, 'Employee role updated successfully'));
  };

  /**
   * Updates an employee's department (Admin only).
   */
  updateDepartment = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const validated = assignDepartmentSchema.parse(req.body);
    const data = await this.employeeService.updateDepartment(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string,
      validated
    );
    res.status(200).json(response.success(data, 'Employee department updated successfully'));
  };

  /**
   * Updates an employee's status (Admin only).
   */
  updateStatus = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const validated = updateStatusSchema.parse(req.body);
    const data = await this.employeeService.updateStatus(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string,
      validated
    );
    res.status(200).json(response.success(data, 'Employee status updated successfully'));
  };
}
export default EmployeeController;
