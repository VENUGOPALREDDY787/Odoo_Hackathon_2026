import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

export class DepartmentRepository {
  /**
   * Finds a department by its unique name within an organization.
   */
  async findByName(orgId: string, name: string) {
    return prisma.department.findFirst({
      where: { name, organizationId: orgId }
    });
  }

  /**
   * Finds a department by ID.
   */
  async findById(id: string, orgId: string) {
    return prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: {
        parent: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * Lists all departments in the organization.
   */
  async findAll(orgId: string, filters: any = {}) {
    return prisma.department.findMany({
      where: { organizationId: orgId, ...filters },
      include: {
        parent: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { employees: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Inserts a new department.
   */
  async create(data: Prisma.DepartmentCreateInput) {
    return prisma.department.create({
      data
    });
  }

  /**
   * Updates department details. Supports transactional boundaries.
   */
  async update(id: string, data: Prisma.DepartmentUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.department.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * Counts active employees assigned directly to this department.
   */
  async countEmployees(id: string): Promise<number> {
    return prisma.employee.count({
      where: { departmentId: id, deletedAt: null }
    });
  }

  /**
   * Counts active allocations assigned directly to this department.
   */
  async countAllocations(id: string): Promise<number> {
    return prisma.allocation.count({
      where: { departmentId: id, status: 'Active', actualReturnDate: null }
    });
  }

  /**
   * Deletes a department completely from the DB.
   */
  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.department.delete({
      where: { id }
    });
  }
}
export default DepartmentRepository;
