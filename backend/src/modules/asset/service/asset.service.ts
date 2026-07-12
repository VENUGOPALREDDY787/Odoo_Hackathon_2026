import prisma from '../../../database/db';
import { AssetRepository } from '../repository/asset.repository';
import { CreateAssetDTO } from '../dto/create-asset.dto';
import { UpdateAssetDTO } from '../dto/update-asset.dto';
import { AppError } from '../../../core/errors/AppError';
import { TagGenerator } from '../helpers/tag-generator';
import { assetLifecycleService } from './asset-lifecycle.service';
import { assetHistoryService } from './asset-history.service';
import { assetImportService } from './asset-import.service';
import { emitToOrg } from '../../../utils/socket';
import { logActivity } from '../../../utils/logger';

export class AssetService {
  private assetRepository: AssetRepository;

  constructor(assetRepository = new AssetRepository()) {
    this.assetRepository = assetRepository;
  }

  /**
   * Registers a new asset with auto-sequential tag locks to prevent collisions under load.
   */
  async createAsset(userId: string, orgId: string, dto: CreateAssetDTO) {
    // 1. Validate Category exists
    const category = await prisma.assetCategory.findFirst({
      where: { id: dto.categoryId, organizationId: orgId }
    });
    if (!category) {
      throw new AppError('Asset category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    // 2. Validate Serial Number uniqueness within organization
    if (dto.serialNumber) {
      const existingSerial = await this.assetRepository.findBySerialNumber(orgId, dto.serialNumber);
      if (existingSerial) {
        throw new AppError(`Asset with serial number "${dto.serialNumber}" already exists.`, 409, 'DUPLICATE_SERIAL_NUMBER');
      }
    }

    // 3. Run Transaction: Lock last tag number, increment, and insert
    const asset = await prisma.$transaction(async (tx) => {
      const lastTag = await this.assetRepository.findLastTagNumber(orgId, tx);
      const nextTag = TagGenerator.generateNextTag(lastTag);

      return this.assetRepository.create(
        {
          organization: { connect: { id: orgId } },
          category: { connect: { id: dto.categoryId } },
          assetTag: nextTag, // Locked sequential tag
          serialNumber: dto.serialNumber || null,
          name: dto.name,
          acquisitionDate: new Date(dto.acquisitionDate),
          acquisitionCost: dto.acquisitionCost,
          condition: dto.condition || 'Good',
          location: dto.location,
          status: dto.status || 'Available',
          isShared: dto.isShared || false,
          imageUrl: dto.imageUrl || null,
          documentsUrl: dto.documentsUrl || null,
          createdBy: userId
        },
        tx
      );
    });

    // 4. Audit Trail & Notification triggers
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'ASSET_CREATED',
      entityType: 'Asset',
      entityId: asset.id,
      details: { assetTag: asset.assetTag, name: asset.name }
    });

    emitToOrg(orgId, 'asset.created', asset);

    return asset;
  }

  /**
   * Updates asset fields, validating lifecycle state transitions and recording change history.
   */
  async updateAsset(userId: string, orgId: string, id: string, dto: UpdateAssetDTO) {
    const asset = await this.assetRepository.findById(id, orgId);
    if (!asset) {
      throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
    }

    // Lifecycle Status Checks
    if (dto.status && dto.status !== asset.status) {
      assetLifecycleService.validateTransition(asset.status, dto.status);
    }

    // Perform database update
    const updated = await prisma.$transaction(async (tx) => {
      return this.assetRepository.update(
        id,
        {
          name: dto.name,
          category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
          serialNumber: dto.serialNumber !== undefined ? dto.serialNumber : undefined,
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
          acquisitionCost: dto.acquisitionCost,
          condition: dto.condition,
          location: dto.location,
          status: dto.status,
          isShared: dto.isShared,
          imageUrl: dto.imageUrl,
          documentsUrl: dto.documentsUrl,
          updatedBy: userId
        },
        tx
      );
    });

    // Record History entries for audit trails
    if (dto.status && dto.status !== asset.status) {
      await assetHistoryService.recordChange(userId, orgId, id, 'ASSET_STATUS_CHANGED', asset.status, dto.status);
      emitToOrg(orgId, 'asset.status.changed', { id, status: dto.status });
    }
    if (dto.location && dto.location !== asset.location) {
      await assetHistoryService.recordChange(userId, orgId, id, 'ASSET_LOCATION_CHANGED', asset.location, dto.location);
      emitToOrg(orgId, 'asset.location.changed', { id, location: dto.location });
    }
    if (dto.condition && dto.condition !== asset.condition) {
      await assetHistoryService.recordChange(userId, orgId, id, 'ASSET_CONDITION_CHANGED', asset.condition, dto.condition);
      emitToOrg(orgId, 'asset.condition.changed', { id, condition: dto.condition });
    }

    await logActivity({
      organizationId: orgId,
      userId,
      action: 'ASSET_UPDATED',
      entityType: 'Asset',
      entityId: id,
      details: dto
    });

    emitToOrg(orgId, 'asset.updated', updated);

    return updated;
  }

  /**
   * Performs soft deletion archiving.
   */
  async softDeleteAsset(userId: string, orgId: string, id: string) {
    const asset = await this.assetRepository.findById(id, orgId);
    if (!asset) {
      throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
    }

    // Deletion Safeguard: Cannot archive allocated assets directly
    if (asset.status === 'Allocated') {
      throw new AppError('Cannot delete a currently allocated asset. Check in the asset first.', 400, 'ALLOCATED_ASSET_DELETE_BLOCKED');
    }

    await this.assetRepository.softDelete(id);

    await logActivity({
      organizationId: orgId,
      userId,
      action: 'ASSET_ARCHIVED',
      entityType: 'Asset',
      entityId: id,
      details: { tag: asset.assetTag }
    });

    emitToOrg(orgId, 'asset.deleted', { id });

    return true;
  }

  /**
   * Restores a soft-deleted asset.
   */
  async restoreAsset(userId: string, orgId: string, id: string) {
    const asset = await this.assetRepository.findIncludingDeleted(id, orgId);
    if (!asset) {
      throw new AppError('Asset profile not found.', 404, 'ASSET_NOT_FOUND');
    }

    await this.assetRepository.restore(id);

    await logActivity({
      organizationId: orgId,
      userId,
      action: 'ASSET_RESTORED',
      entityType: 'Asset',
      entityId: id,
      details: { tag: asset.assetTag }
    });

    emitToOrg(orgId, 'asset.restored', { id });

    return true;
  }

  /**
   * Retrieves detail profile of an asset.
   */
  async getAsset(orgId: string, id: string) {
    const asset = await this.assetRepository.findById(id, orgId);
    if (!asset) {
      throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
    }
    return asset;
  }

  /**
   * Traces the modification history from activity logs.
   */
  async getAssetHistory(orgId: string, id: string) {
    return prisma.activityLog.findMany({
      where: {
        organizationId: orgId,
        entityType: 'Asset',
        entityId: id
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * Natively processes CSV file uploads and registers assets in batches.
   */
  async bulkImport(userId: string, orgId: string, csvText: string) {
    const parsedDTOs = assetImportService.parseCSV(csvText);
    if (parsedDTOs.length === 0) {
      throw new AppError('No valid asset rows found in CSV.', 400, 'EMPTY_CSV_IMPORT');
    }

    const importedAssets = [];

    // Run import loop in single transaction for atomic safety
    await prisma.$transaction(async (tx) => {
      let lastTag = await this.assetRepository.findLastTagNumber(orgId, tx);

      for (const item of parsedDTOs) {
        if (!item.name || !item.categoryId || !item.acquisitionDate || !item.acquisitionCost || !item.location) {
          throw new AppError('Missing required fields on CSV asset import rows.', 400, 'MALFORMED_CSV_ROW');
        }

        const nextTag = TagGenerator.generateNextTag(lastTag);
        lastTag = nextTag;

        const asset = await this.assetRepository.create(
          {
            organization: { connect: { id: orgId } },
            category: { connect: { id: item.categoryId } },
            assetTag: nextTag,
            serialNumber: item.serialNumber || null,
            name: item.name,
            acquisitionDate: new Date(item.acquisitionDate),
            acquisitionCost: item.acquisitionCost,
            condition: item.condition || 'Good',
            location: item.location,
            status: item.status || 'Available',
            isShared: item.isShared || false,
            createdBy: userId
          },
          tx
        );

        importedAssets.push(asset);
      }
    });

    await logActivity({
      organizationId: orgId,
      userId,
      action: 'ASSET_BULK_IMPORTED',
      entityType: 'Asset',
      entityId: null,
      details: { count: importedAssets.length }
    });

    emitToOrg(orgId, 'asset.bulk.imported', { count: importedAssets.length });

    return { importedCount: importedAssets.length };
  }
}
export default AssetService;
