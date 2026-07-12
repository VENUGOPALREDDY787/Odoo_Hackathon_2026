import prisma from '../../../database/db';
import { EmployeeRepository } from '../repository/employee.repository';
import { UpdateRoleDTO } from '../dto/update-role.dto';
import { UpdateStatusDTO } from '../dto/update-status.dto';
import { AssignDepartmentDTO } from '../dto/assign-department.dto';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emitToOrg } from '../../../utils/socket';

export class EmployeeService {
  private employeeRepository: EmployeeRepository;

  constructor(employeeRepository = new EmployeeRepository()) {
    this.employeeRepository = employeeRepository;
  }

  /**
   * Fetches the profile of a logged-in user, excluding credentials.
   */
  async getProfile(userId: string, orgId: string) {
    const employee = await this.employeeRepository.findEmployeeById(userId, orgId);
    if (!employee) {
      throw new AppError('Employee profile not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }
    const { passwordHash: _, refreshToken: __, ...profile } = employee;
    return profile;
  }

  /**
   * Fetches paginated directory of employees filtered by role, status, and department.
   */
  async listEmployees(orgId: string, query: any) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filters: any = {};

    if (query.role) {
      filters.role = query.role;
    }
    if (query.status) {
      filters.status = query.status;
    }
    if (query.departmentId) {
      filters.departmentId = query.departmentId;
    }
    if (query.search) {
      filters.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } }
      ];
    }

    const total = await this.employeeRepository.countDirectory(orgId, filters);
    const employees = await this.employeeRepository.findDirectory(orgId, filters, skip, limit);

    return {
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Elevates or demotes an employee's access role. Enforces the single Department Head constraint.
   */
  async updateRole(adminUserId: string, orgId: string, employeeId: string, dto: UpdateRoleDTO) {
    const employee = await this.employeeRepository.findEmployeeById(employeeId, orgId);
    if (!employee) {
      throw new AppError('Employee record not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const oldRole = employee.role;

    return prisma.$transaction(async (tx) => {
      // 1. Rule: Only one Department Head per department. Department Head must belong to department.
      if (dto.role === 'Department Head') {
        if (!employee.departmentId) {
          throw new AppError('Employee must be assigned to a department before being promoted to Department Head.', 400, 'NO_DEPARTMENT_ASSIGNED');
        }

        const dept = await tx.department.findUnique({
          where: { id: employee.departmentId }
        });

        if (dept && dept.managerId && dept.managerId !== employeeId) {
          // Demote the current head back to Employee role if they were only a Department Head
          const currentHead = await tx.employee.findUnique({ where: { id: dept.managerId } });
          if (currentHead && currentHead.role === 'Department Head') {
            await tx.employee.update({
              where: { id: dept.managerId },
              data: { role: 'Employee' }
            });
          }
        }

        // Set this employee as the manager of their assigned department
        await tx.department.update({
          where: { id: employee.departmentId },
          data: { managerId: employeeId }
        });
      }

      // 2. Perform the role update
      const updated = await this.employeeRepository.updateRole(employeeId, dto.role, tx);

      // 3. Log Activity
      await logActivity({
        organizationId: orgId,
        userId: adminUserId,
        action: 'EMPLOYEE_ROLE_UPDATED',
        entityType: 'Employee',
        entityId: employeeId,
        details: { oldRole, newRole: dto.role }
      });

      // 4. Create Notification
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: employeeId,
          title: 'Role Promoted/Updated',
          message: `Your organizational access role has been updated from "${oldRole}" to "${dto.role}".`,
          type: 'Role Changed',
          relatedEntityType: 'Employee',
          relatedEntityId: employeeId
        }
      });

      const { passwordHash: _, refreshToken: __, ...result } = updated;
      emitToOrg(orgId, 'employee.promoted', result);

      return result;
    });
  }

  /**
   * Transfers an employee's department, handling head de-allocations and status restrictions.
   */
  async updateDepartment(adminUserId: string, orgId: string, employeeId: string, dto: AssignDepartmentDTO) {
    const employee = await this.employeeRepository.findEmployeeById(employeeId, orgId);
    if (!employee) {
      throw new AppError('Employee record not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const oldDeptId = employee.departmentId;

    if (dto.departmentId) {
      // Validate new department exists and is active
      const targetDept = await prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId: orgId }
      });

      if (!targetDept) {
        throw new AppError('Target department not found.', 404, 'DEPARTMENT_NOT_FOUND');
      }

      if (targetDept.status !== 'Active') {
        throw new AppError('Cannot transfer employees to an inactive department.', 400, 'INACTIVE_DEPARTMENT_TARGET');
      }
    }

    return prisma.$transaction(async (tx) => {
      // Rule: If they were the Head of their old department, strip their head status since they are transferring out
      if (oldDeptId) {
        const oldDept = await tx.department.findUnique({ where: { id: oldDeptId } });
        if (oldDept && oldDept.managerId === employeeId) {
          await tx.department.update({
            where: { id: oldDeptId },
            data: { managerId: null }
          });
        }
      }

      // Demote to Employee if their role was Department Head, since they are leaving the department they head
      if (employee.role === 'Department Head') {
        await tx.employee.update({
          where: { id: employeeId },
          data: { role: 'Employee' }
        });
      }

      // Perform transfer
      const updated = await this.employeeRepository.updateDepartment(employeeId, dto.departmentId, tx);

      // Log department history/change
      await logActivity({
        organizationId: orgId,
        userId: adminUserId,
        action: 'EMPLOYEE_DEPARTMENT_CHANGED',
        entityType: 'Employee',
        entityId: employeeId,
        details: { oldDepartmentId: oldDeptId, newDepartmentId: dto.departmentId }
      });

      // Notify employee
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: employeeId,
          title: 'Department Transferred',
          message: `Your department assignment has been updated.`,
          type: 'Department Changed',
          relatedEntityType: 'Employee',
          relatedEntityId: employeeId
        }
      });

      const { passwordHash: _, refreshToken: __, ...result } = updated;
      emitToOrg(orgId, 'employee.department.changed', result);

      return result;
    });
  }

  /**
   * Deactivates or reactivates employee accounts. Strips active refresh tokens upon deactivation.
   */
  async updateStatus(adminUserId: string, orgId: string, employeeId: string, dto: UpdateStatusDTO) {
    if (adminUserId === employeeId) {
      throw new AppError('Admins cannot modify their own status.', 400, 'SELF_STATUS_CHANGE');
    }

    const employee = await this.employeeRepository.findEmployeeById(employeeId, orgId);
    if (!employee) {
      throw new AppError('Employee record not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const oldStatus = employee.status;

    return prisma.$transaction(async (tx) => {
      const updated = await this.employeeRepository.updateStatusAndClearSession(employeeId, dto.status, tx);

      // If deactivating, also invalidate their active head status if they headed a department
      if (dto.status === 'Inactive' && employee.departmentId) {
        const dept = await tx.department.findUnique({ where: { id: employee.departmentId } });
        if (dept && dept.managerId === employeeId) {
          await tx.department.update({
            where: { id: employee.departmentId },
            data: { managerId: null }
          });
        }
      }

      await logActivity({
        organizationId: orgId,
        userId: adminUserId,
        action: 'EMPLOYEE_STATUS_UPDATED',
        entityType: 'Employee',
        entityId: employeeId,
        details: { oldStatus, newStatus: dto.status }
      });

      // Create Notification
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: employeeId,
          title: dto.status === 'Inactive' ? 'Account Deactivated' : 'Account Activated',
          message: `Your account has been set to ${dto.status.toLowerCase()}.`,
          type: dto.status === 'Inactive' ? 'Employee Deactivated' : 'Employee Activated',
          relatedEntityType: 'Employee',
          relatedEntityId: employeeId
        }
      });

      const { passwordHash: _, refreshToken: __, ...result } = updated;
      emitToOrg(orgId, 'employee.status.changed', result);

      return result;
    });
  }
}
export default EmployeeService;
