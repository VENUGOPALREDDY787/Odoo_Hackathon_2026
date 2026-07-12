import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

/**
 * MaintenanceRepository — Pure data-access layer for MaintenanceRequest records.
 *
 * Responsibilities:
 *  - All Prisma queries against maintenance_requests table
 *  - Optimized joins with asset, raiser, approver (avoids N+1)
 *  - Offset and cursor pagination support
 *  - Transaction-aware via optional tx parameter
 *
 * No business logic. No workflow decisions. Data access only.
 */
export class MaintenanceRepository {
  /** Shared include shape reused across all queries to avoid N+1 */
  private readonly defaultInclude = {
    asset: {
      select: {
        id: true, name: true, assetTag: true, status: true,
        location: true, condition: true,
        category: { select: { id: true, name: true } }
      }
    },
    raiser: { select: { id: true, name: true, email: true, departmentId: true } },
    approver: { select: { id: true, name: true, email: true } }
  };

  /**
   * Finds a maintenance request by ID within an organization.
   */
  async findById(id: string, orgId: string) {
    return prisma.maintenanceRequest.findFirst({
      where: { id, organizationId: orgId },
      include: this.defaultInclude
    });
  }

  /**
   * Finds a maintenance request by ID inside a transaction context.
   */
  async findByIdWithTx(id: string, orgId: string, tx: Prisma.TransactionClient) {
    return tx.maintenanceRequest.findFirst({
      where: { id, organizationId: orgId },
      include: this.defaultInclude
    });
  }

  /**
   * Checks if an asset already has an active maintenance request.
   * Prevents duplicate active maintenance on the same asset.
   */
  async findActiveByAsset(assetId: string, orgId: string) {
    return prisma.maintenanceRequest.findFirst({
      where: {
        assetId,
        organizationId: orgId,
        status: { in: ['Pending', 'Approved', 'Technician Assigned', 'In Progress'] }
      }
    });
  }

  /**
   * Creates a new maintenance request. Supports transactional context.
   */
  async create(data: Prisma.MaintenanceRequestCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.maintenanceRequest.create({
      data,
      include: this.defaultInclude
    });
  }

  /**
   * Updates a maintenance request. Supports transactional context.
   */
  async update(id: string, data: Prisma.MaintenanceRequestUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.maintenanceRequest.update({
      where: { id },
      data,
      include: this.defaultInclude
    });
  }

  /**
   * Lists maintenance requests matching dynamic filters with offset pagination.
   */
  async findMany(
    orgId: string,
    filters: Prisma.MaintenanceRequestWhereInput = {},
    skip = 0,
    take = 20,
    orderBy: Prisma.MaintenanceRequestOrderByWithRelationInput = { createdAt: 'desc' }
  ) {
    return prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId, ...filters },
      include: this.defaultInclude,
      skip,
      take,
      orderBy
    });
  }

  /**
   * Returns count matching given filter (used for pagination metadata).
   */
  async count(orgId: string, filters: Prisma.MaintenanceRequestWhereInput = {}): Promise<number> {
    return prisma.maintenanceRequest.count({
      where: { organizationId: orgId, ...filters }
    });
  }

  /**
   * Returns all maintenance requests raised by a specific employee.
   */
  async findByRaiser(orgId: string, employeeId: string) {
    return prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId, raisedBy: employeeId },
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Returns cost aggregation grouped by asset for reporting.
   */
  async getCostReport(orgId: string) {
    return (prisma.maintenanceRequest.groupBy as any)({
      by: ['assetId'],
      where: { organizationId: orgId, status: { in: ['Resolved', 'Closed'] } },
      _sum: { actualCost: true },
      _count: { id: true }
    });
  }

  /**
   * Fetches overdue maintenance requests (past estimated completion date and not yet resolved).
   */
  async findOverdue(orgId: string, now: Date) {
    return prisma.maintenanceRequest.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['Approved', 'Technician Assigned', 'In Progress'] },
        estimatedCompletionDate: { lt: now }
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        raiser: { select: { id: true, name: true, email: true } }
      }
    });
  }
}

export default MaintenanceRepository;
