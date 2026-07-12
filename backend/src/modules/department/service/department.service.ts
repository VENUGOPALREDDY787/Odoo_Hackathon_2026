import prisma from '../../../database/db';
import { DepartmentRepository } from '../repository/department.repository';
import { CreateDepartmentDTO } from '../dto/create-department.dto';
import { UpdateDepartmentDTO } from '../dto/update-department.dto';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emitToOrg } from '../../../utils/socket';

export class DepartmentService {
  private departmentRepository: DepartmentRepository;

  constructor(departmentRepository = new DepartmentRepository()) {
    this.departmentRepository = departmentRepository;
  }

  /**
   * Registers a new department, checking parent status and name uniqueness.
   */
  async createDepartment(adminUserId: string, orgId: string, dto: CreateDepartmentDTO) {
    const existing = await this.departmentRepository.findByName(orgId, dto.name);
    if (existing) {
      throw new AppError(`Department with name "${dto.name}" already exists.`, 409, 'DUPLICATE_DEPARTMENT_NAME');
    }

    if (dto.parentId) {
      const parent = await this.departmentRepository.findById(dto.parentId, orgId);
      if (!parent) {
        throw new AppError('Parent department not found.', 404, 'PARENT_DEPARTMENT_NOT_FOUND');
      }
      if (parent.status !== 'Active') {
        throw new AppError('Cannot parent under an inactive department.', 400, 'INACTIVE_PARENT_DEPARTMENT');
      }
    }

    if (dto.managerId) {
      // Validate manager exists in organization
      const employee = await prisma.employee.findFirst({
        where: { id: dto.managerId, organizationId: orgId, deletedAt: null }
      });
      if (!employee) {
        throw new AppError('Assigned manager employee profile not found.', 404, 'MANAGER_NOT_FOUND');
      }
    }

    const department = await this.departmentRepository.create({
      organization: { connect: { id: orgId } },
      name: dto.name,
      status: dto.status || 'Active',
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
      manager: dto.managerId ? { connect: { id: dto.managerId } } : undefined,
      createdBy: adminUserId
    });

    await logActivity({
      organizationId: orgId,
      userId: adminUserId,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
      entityId: department.id,
      details: { name: dto.name, parentId: dto.parentId }
    });

    emitToOrg(orgId, 'department.created', department);

    return department;
  }

  /**
   * Updates department details, running circular reference checks.
   */
  async updateDepartment(adminUserId: string, orgId: string, id: string, dto: UpdateDepartmentDTO) {
    const department = await this.departmentRepository.findById(id, orgId);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    const data: any = {};

    if (dto.name && dto.name !== department.name) {
      const existing = await this.departmentRepository.findByName(orgId, dto.name);
      if (existing) {
        throw new AppError(`Department with name "${dto.name}" already exists.`, 409, 'DUPLICATE_DEPARTMENT_NAME');
      }
      data.name = dto.name;
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new AppError('A department cannot be its own parent.', 400, 'INVALID_PARENT_DEPARTMENT');
      }

      if (dto.parentId) {
        const parent = await this.departmentRepository.findById(dto.parentId, orgId);
        if (!parent) {
          throw new AppError('Parent department not found.', 404, 'PARENT_DEPARTMENT_NOT_FOUND');
        }
        if (parent.status !== 'Active') {
          throw new AppError('Cannot parent under an inactive department.', 400, 'INACTIVE_PARENT_DEPARTMENT');
        }

        // Circular Reference Check: trace parentId upward to verify it does not contain the current department ID
        let currentParentId: string | null = dto.parentId;
        while (currentParentId) {
          if (currentParentId === id) {
            throw new AppError('Circular hierarchy reference detected.', 400, 'CIRCULAR_HIERARCHY');
          }
          const parentDept: { parentId: string | null } | null = await prisma.department.findUnique({
            where: { id: currentParentId },
            select: { parentId: true }
          });
          currentParentId = parentDept?.parentId || null;
        }

        data.parent = { connect: { id: dto.parentId } };
      } else {
        data.parent = { disconnect: true };
      }
    }

    if (dto.managerId !== undefined) {
      if (dto.managerId) {
        const employee = await prisma.employee.findFirst({
          where: { id: dto.managerId, organizationId: orgId, deletedAt: null }
        });
        if (!employee) {
          throw new AppError('Assigned manager not found.', 404, 'MANAGER_NOT_FOUND');
        }

        // Rule: Department Head must belong to the department
        if (employee.departmentId !== id) {
          throw new AppError('Department Head must belong to the department.', 400, 'MANAGER_MUST_BELONG_TO_DEPARTMENT');
        }

        data.manager = { connect: { id: dto.managerId } };
      } else {
        data.manager = { disconnect: true };
      }
    }

    if (dto.status) {
      data.status = dto.status;
    }

    const updated = await this.departmentRepository.update(id, data);

    await logActivity({
      organizationId: orgId,
      userId: adminUserId,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'Department',
      entityId: id,
      details: dto
    });

    emitToOrg(orgId, 'department.updated', updated);

    return updated;
  }

  /**
   * Deactivates a department (checks active allocations and active employees first).
   */
  async deactivateDepartment(adminUserId: string, orgId: string, id: string) {
    const employeesCount = await this.departmentRepository.countEmployees(id);
    if (employeesCount > 0) {
      throw new AppError('Cannot deactivate department. Active employees are assigned to it.', 400, 'EMPLOYEES_ASSIGNED');
    }

    const allocationsCount = await this.departmentRepository.countAllocations(id);
    if (allocationsCount > 0) {
      throw new AppError('Cannot deactivate department. Active assets are allocated to it.', 400, 'ASSETS_ALLOCATED');
    }

    const updated = await this.departmentRepository.update(id, { status: 'Inactive', updatedBy: adminUserId });

    await logActivity({
      organizationId: orgId,
      userId: adminUserId,
      action: 'DEPARTMENT_DEACTIVATED',
      entityType: 'Department',
      entityId: id
    });

    emitToOrg(orgId, 'department.deactivated', updated);

    return updated;
  }

  /**
   * Reactivates a department, verifying its parent is active.
   */
  async restoreDepartment(adminUserId: string, orgId: string, id: string) {
    const department = await this.departmentRepository.findById(id, orgId);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    if (department.parentId) {
      const parent = await this.departmentRepository.findById(department.parentId, orgId);
      if (parent && parent.status !== 'Active') {
        throw new AppError('Cannot restore department. Parent department is inactive.', 400, 'INACTIVE_PARENT_DEPARTMENT');
      }
    }

    const updated = await this.departmentRepository.update(id, { status: 'Active', updatedBy: adminUserId });

    await logActivity({
      organizationId: orgId,
      userId: adminUserId,
      action: 'DEPARTMENT_RESTORED',
      entityType: 'Department',
      entityId: id
    });

    emitToOrg(orgId, 'department.updated', updated);

    return updated;
  }

  /**
   * Returns details of a specific department.
   */
  async getDepartment(orgId: string, id: string) {
    const dept = await this.departmentRepository.findById(id, orgId);
    if (!dept) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }
    return dept;
  }

  /**
   * Lists all departments.
   */
  async listDepartments(orgId: string, query: any) {
    const filters: any = {};
    if (query.status) {
      filters.status = query.status;
    }
    if (query.search) {
      filters.name = { contains: query.search };
    }

    return this.departmentRepository.findAll(orgId, filters);
  }

  /**
   * Assigns the Department Head, automatically promoting the employee's role.
   */
  async assignDepartmentHead(adminUserId: string, orgId: string, departmentId: string, managerId: string) {
    const department = await this.departmentRepository.findById(departmentId, orgId);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: managerId, organizationId: orgId, deletedAt: null }
    });

    if (!employee) {
      throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    if (employee.departmentId !== departmentId) {
      throw new AppError('Assigned Department Head must belong to the target department.', 400, 'HEAD_MUST_BELONG_TO_DEPARTMENT');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Assign manager to department
      const updatedDept = await tx.department.update({
        where: { id: departmentId },
        data: { managerId },
        include: {
          manager: { select: { id: true, name: true, email: true } }
        }
      });

      // 2. Promote employee's role to Department Head (if they aren't already Admin/Asset Manager)
      let updatedRole = employee.role;
      if (employee.role === 'Employee') {
        updatedRole = 'Department Head';
        await tx.employee.update({
          where: { id: managerId },
          data: { role: 'Department Head' }
        });
      }

      // 3. Write activity log
      await logActivity({
        organizationId: orgId,
        userId: adminUserId,
        action: 'DEPARTMENT_HEAD_ASSIGNED',
        entityType: 'Department',
        entityId: departmentId,
        details: { managerId, rolePromotedTo: updatedRole }
      });

      // 4. Create notification
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: managerId,
          title: 'Assigned as Department Head',
          message: `You have been assigned as the Head of "${department.name}" department.`,
          type: 'Role Changed',
          relatedEntityType: 'Department',
          relatedEntityId: departmentId
        }
      });

      emitToOrg(orgId, 'department.head.changed', updatedDept);

      return updatedDept;
    });
  }
}
export default DepartmentService;
