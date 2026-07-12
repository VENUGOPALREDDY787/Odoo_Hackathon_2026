import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

export class CategoryRepository {
  /**
   * Finds a category by its name within an organization.
   */
  async findByName(orgId: string, name: string) {
    return prisma.assetCategory.findFirst({
      where: { name, organizationId: orgId }
    });
  }

  /**
   * Finds a category by ID.
   */
  async findById(id: string, orgId: string) {
    return prisma.assetCategory.findFirst({
      where: { id, organizationId: orgId }
    });
  }

  /**
   * Lists all categories in the organization.
   */
  async findAll(orgId: string, filters: any = {}) {
    return prisma.assetCategory.findMany({
      where: { organizationId: orgId, ...filters },
      include: {
        _count: { select: { assets: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Inserts a new category.
   */
  async create(data: Prisma.AssetCategoryCreateInput) {
    return prisma.assetCategory.create({
      data
    });
  }

  /**
   * Updates category details.
   */
  async update(id: string, data: Prisma.AssetCategoryUpdateInput) {
    return prisma.assetCategory.update({
      where: { id },
      data
    });
  }

  /**
   * Deletes a category completely from the database.
   */
  async delete(id: string) {
    return prisma.assetCategory.delete({
      where: { id }
    });
  }

  /**
   * Counts assets assigned directly to this category.
   */
  async countAssets(id: string): Promise<number> {
    return prisma.asset.count({
      where: { categoryId: id, deletedAt: null }
    });
  }
}
export default CategoryRepository;
