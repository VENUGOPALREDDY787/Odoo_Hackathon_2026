import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

export class TransferRepository {
  /**
   * Finds a transfer record by ID.
   */
  async findById(id: string, orgId: string) {
    return prisma.transfer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        fromEmployee: { select: { id: true, name: true, email: true } },
        toEmployee: { select: { id: true, name: true, email: true } },
        fromDepartment: { select: { id: true, name: true } },
        toDepartment: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Registers a new transfer request. Supports transaction context.
   */
  async createTransfer(data: Prisma.TransferCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.transfer.create({
      data,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } }
      }
    });
  }

  /**
   * Updates a transfer request status (e.g. approve/reject). Supports transaction context.
   */
  async updateTransfer(id: string, data: Prisma.TransferUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.transfer.update({
      where: { id },
      data,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } }
      }
    });
  }

  /**
   * Returns list of transfers matching criteria.
   */
  async findAll(orgId: string, filters: any = {}, skip?: number, limit?: number) {
    return prisma.transfer.findMany({
      where: { organizationId: orgId, ...filters },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        fromEmployee: { select: { id: true, name: true } },
        toEmployee: { select: { id: true, name: true } },
        fromDepartment: { select: { id: true, name: true } },
        toDepartment: { select: { id: true, name: true } }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Returns count of transfers matching criteria.
   */
  async countAll(orgId: string, filters: any = {}): Promise<number> {
    return prisma.transfer.count({
      where: { organizationId: orgId, ...filters }
    });
  }
}
export default TransferRepository;
