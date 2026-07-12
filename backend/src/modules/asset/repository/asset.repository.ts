import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

export class AssetRepository {
  /**
   * Finds an asset by its tag name.
   */
  async findByTag(orgId: string, tag: string) {
    return prisma.asset.findFirst({
      where: { assetTag: tag, organizationId: orgId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Finds an asset by its unique serial number.
   */
  async findBySerialNumber(orgId: string, serialNumber: string) {
    return prisma.asset.findFirst({
      where: { serialNumber, organizationId: orgId, deletedAt: null }
    });
  }

  /**
   * Finds an active asset by ID.
   */
  async findById(id: string, orgId: string) {
    return prisma.asset.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Finds even soft-deleted assets (for restore queries).
   */
  async findIncludingDeleted(id: string, orgId: string) {
    return prisma.asset.findFirst({
      where: { id, organizationId: orgId }
    });
  }

  /**
   * Finds the last sequential asset tag number to increment from.
   */
  async findLastTagNumber(orgId: string, tx?: Prisma.TransactionClient): Promise<string | null> {
    const client = tx || prisma;
    const lastAsset = await client.asset.findFirst({
      where: { organizationId: orgId },
      orderBy: { assetTag: 'desc' },
      select: { assetTag: true }
    });
    return lastAsset ? lastAsset.assetTag : null;
  }

  /**
   * Registers a new asset.
   */
  async create(data: Prisma.AssetCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.asset.create({
      data,
      include: {
        category: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Updates asset fields.
   */
  async update(id: string, data: Prisma.AssetUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.asset.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Performs soft deletion on an asset.
   */
  async softDelete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.asset.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restores a soft-deleted asset.
   */
  async restore(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.asset.update({
      where: { id },
      data: { deletedAt: null }
    });
  }

  /**
   * Returns paginated asset records matching criteria.
   */
  async findDirectory(orgId: string, where: Prisma.AssetWhereInput, skip: number, limit: number, orderBy: any = { createdAt: 'desc' }) {
    return prisma.asset.findMany({
      where: { organizationId: orgId, deletedAt: null, ...where },
      include: {
        category: { select: { id: true, name: true } }
      },
      skip,
      take: limit,
      orderBy
    });
  }

  /**
   * Returns count of directory matches.
   */
  async countDirectory(orgId: string, where: Prisma.AssetWhereInput): Promise<number> {
    return prisma.asset.count({
      where: { organizationId: orgId, deletedAt: null, ...where }
    });
  }
}
export default AssetRepository;
