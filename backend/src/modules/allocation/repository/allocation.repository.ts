import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

export class AllocationRepository {
  /**
   * Finds the currently active allocation for a given asset.
   */
  async findActiveAllocation(assetId: string) {
    return prisma.allocation.findFirst({
      where: {
        assetId,
        status: { in: ['Active', 'Overdue'] },
        actualReturnDate: null,
        deletedAt: null
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        employee: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Finds details of a specific allocation.
   */
  async findById(id: string, orgId: string) {
    return prisma.allocation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        employee: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Registers a new allocation. Supports transactional boundaries.
   */
  async createAllocation(data: Prisma.AllocationCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.allocation.create({
      data,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } }
      }
    });
  }

  /**
   * Updates an allocation. Supports transactional boundaries.
   */
  async updateAllocation(id: string, data: Prisma.AllocationUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.allocation.update({
      where: { id },
      data,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } }
      }
    });
  }

  /**
   * Scans for overdue active allocations.
   */
  async findOverdueAllocations(orgId: string, now: Date) {
    return prisma.allocation.findMany({
      where: {
        organizationId: orgId,
        status: 'Active',
        expectedReturnDate: { lt: now },
        actualReturnDate: null,
        deletedAt: null
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        employee: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * Returns list of allocations matching filters.
   */
  async findAll(orgId: string, filters: any = {}, skip?: number, limit?: number) {
    return prisma.allocation.findMany({
      where: { organizationId: orgId, deletedAt: null, ...filters },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        employee: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } }
      },
      skip,
      take: limit,
      orderBy: { allocationDate: 'desc' }
    });
  }

  /**
   * Returns count of matching allocations.
   */
  async countAll(orgId: string, filters: any = {}): Promise<number> {
    return prisma.allocation.count({
      where: { organizationId: orgId, deletedAt: null, ...filters }
    });
  }
}
export default AllocationRepository;
