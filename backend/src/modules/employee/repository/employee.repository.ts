import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

export class EmployeeRepository {
  /**
   * Retrieves a single employee by ID within their organization.
   */
  async findEmployeeById(id: string, orgId: string) {
    return prisma.employee.findFirst({
      where: { id, organizationId: orgId, deletedAt: null }
    });
  }

  /**
   * Returns a paginated list of employees matching search terms and filters.
   */
  async findDirectory(orgId: string, filters: any, skip: number, limit: number) {
    const where: Prisma.EmployeeWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      ...filters
    };

    return prisma.employee.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Returns the total count of directory records matching filters.
   */
  async countDirectory(orgId: string, filters: any) {
    const where: Prisma.EmployeeWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      ...filters
    };

    return prisma.employee.count({ where });
  }

  /**
   * Updates an employee's role. Runs inside transaction context if tx is provided.
   */
  async updateRole(id: string, role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee', tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.employee.update({
      where: { id },
      data: { role }
    });
  }

  /**
   * Updates an employee's status and clears their refresh token (forces logout if deactivating).
   */
  async updateStatusAndClearSession(id: string, status: 'Active' | 'Inactive', tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.employee.update({
      where: { id },
      data: {
        status,
        refreshToken: status === 'Inactive' ? null : undefined
      }
    });
  }
  /**
   * Updates an employee's department. Supports transactional context.
   */
  async updateDepartment(id: string, departmentId: string | null, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.employee.update({
      where: { id },
      data: { departmentId }
    });
  }
}
export default EmployeeRepository;
