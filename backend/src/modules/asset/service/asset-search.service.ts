import { Prisma } from '@prisma/client';
import { AssetRepository } from '../repository/asset.repository';

export class AssetSearchService {
  private assetRepository: AssetRepository;

  constructor(assetRepository = new AssetRepository()) {
    this.assetRepository = assetRepository;
  }

  /**
   * Performs advanced pagination, sorting, search, and category filter operations.
   */
  async searchAssets(orgId: string, query: any) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {};

    // Filter by Category
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    // Filter by Status & Condition
    if (query.status) {
      where.status = query.status;
    }
    if (query.condition) {
      where.condition = query.condition;
    }
    if (query.location) {
      where.location = { contains: query.location };
    }

    // Shared Flag
    if (query.isShared !== undefined) {
      where.isShared = query.isShared === 'true' || query.isShared === true;
    }

    // Search query (partial matches across tag, name, serial number, and location)
    if (query.search) {
      const searchStr = query.search;
      where.OR = [
        { name: { contains: searchStr } },
        { assetTag: { contains: searchStr } },
        { serialNumber: { contains: searchStr } },
        { location: { contains: searchStr } }
      ];
    }

    // Sort controls mapping
    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy) {
      orderBy = { [query.sortBy]: query.sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    const total = await this.assetRepository.countDirectory(orgId, where);
    const assets = await this.assetRepository.findDirectory(orgId, where, skip, limit, orderBy);

    return {
      assets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
export default AssetSearchService;
