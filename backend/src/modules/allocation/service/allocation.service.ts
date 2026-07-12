import prisma from '../../../database/db';
import { AllocationRepository } from '../repository/allocation.repository';
import { AllocateAssetDTO, BulkAllocateDTO } from '../dto/allocate-asset.dto';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emitToOrg, emitToUser } from '../../../utils/socket';

export class AllocationService {
  private allocationRepository: AllocationRepository;

  constructor(allocationRepository = new AllocationRepository()) {
    this.allocationRepository = allocationRepository;
  }

  /**
   * Allocates an asset to an employee or department, using interactive transactions and SELECT FOR UPDATE row locking.
   */
  async allocateAsset(allocatedByUserId: string, orgId: string, dto: AllocateAssetDTO) {
    return prisma.$transaction(async (tx) => {
      // 1. Concurrency Row Lock: SELECT FOR UPDATE to prevent race conditions
      const lockedAssets = await tx.$queryRawUnsafe<any[]>(
        `SELECT id, status, name, asset_tag FROM assets WHERE id = ? FOR UPDATE`,
        dto.assetId
      );

      if (lockedAssets.length === 0) {
        throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
      }

      const lockedAsset = lockedAssets[0];

      // 2. Validate Asset is Available
      if (lockedAsset.status !== 'Available') {
        throw new AppError(
          `Asset "${lockedAsset.name}" (${lockedAsset.asset_tag}) is currently not available for checkout. Current status: ${lockedAsset.status}.`,
          409,
          'ASSET_NOT_AVAILABLE'
        );
      }

      // 3. Validate Target Entity
      let recipientName = '';
      if (dto.allocatedToType === 'Employee') {
        const emp = await tx.employee.findFirst({
          where: { id: dto.employeeId || '', organizationId: orgId, deletedAt: null }
        });
        if (!emp) {
          throw new AppError('Target employee profile not found.', 404, 'EMPLOYEE_NOT_FOUND');
        }
        if (emp.status !== 'Active') {
          throw new AppError('Cannot allocate assets to an inactive employee.', 400, 'INACTIVE_RECIPIENT');
        }
        recipientName = emp.name;
      } else {
        const dept = await tx.department.findFirst({
          where: { id: dto.departmentId || '', organizationId: orgId }
        });
        if (!dept) {
          throw new AppError('Target department not found.', 404, 'DEPARTMENT_NOT_FOUND');
        }
        if (dept.status !== 'Active') {
          throw new AppError('Cannot allocate assets to an inactive department.', 400, 'INACTIVE_RECIPIENT');
        }
        recipientName = dept.name;
      }

      // 4. Create Allocation record
      const allocation = await this.allocationRepository.createAllocation(
        {
          organization: { connect: { id: orgId } },
          asset: { connect: { id: dto.assetId } },
          employee: dto.employeeId ? { connect: { id: dto.employeeId } } : undefined,
          department: dto.departmentId ? { connect: { id: dto.departmentId } } : undefined,
          allocator: { connect: { id: allocatedByUserId } },
          allocatedToType: dto.allocatedToType,
          expectedReturnDate: dto.expectedReturnDate ? new Date(dto.expectedReturnDate) : null,
          status: 'Active'
        },
        tx
      );

      // 5. Update Asset Status to Allocated
      await tx.asset.update({
        where: { id: dto.assetId },
        data: { status: 'Allocated', updatedBy: allocatedByUserId }
      });

      // 6. Write Activity Log
      await logActivity({
        organizationId: orgId,
        userId: allocatedByUserId,
        action: 'ALLOCATION_CREATED',
        entityType: 'Allocation',
        entityId: allocation.id,
        details: { assetTag: lockedAsset.asset_tag, type: dto.allocatedToType, recipient: recipientName }
      });

      // 7. Write Notification if allocated to employee
      if (dto.employeeId) {
        await tx.notification.create({
          data: {
            organizationId: orgId,
            recipientId: dto.employeeId,
            title: 'Asset Assigned',
            message: `The asset "${lockedAsset.name}" (${lockedAsset.asset_tag}) has been checked out to you.`,
            type: 'Asset Assigned',
            relatedEntityType: 'Allocation',
            relatedEntityId: allocation.id
          }
        });
        emitToUser(dto.employeeId, 'notification', { title: 'Asset Assigned', message: `Assetchecked out to you.` });
      }

      emitToOrg(orgId, 'allocation.created', allocation);
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });

      return allocation;
    });
  }

  /**
   * Performs bulk allocations inside a single interactive database transaction.
   */
  async bulkAllocate(allocatedByUserId: string, orgId: string, dto: BulkAllocateDTO) {
    const allocations = [];

    await prisma.$transaction(async (tx) => {
      for (const item of dto.allocations) {
        // Concurrency lock each row
        const lockedAssets = await tx.$queryRawUnsafe<any[]>(
          `SELECT id, status, name, asset_tag FROM assets WHERE id = ? FOR UPDATE`,
          item.assetId
        );

        if (lockedAssets.length === 0) {
          throw new AppError(`Asset with ID ${item.assetId} not found.`, 404, 'ASSET_NOT_FOUND');
        }

        const lockedAsset = lockedAssets[0];

        if (lockedAsset.status !== 'Available') {
          throw new AppError(
            `Asset "${lockedAsset.name}" (${lockedAsset.asset_tag}) is unavailable for checkout.`,
            409,
            'ASSET_NOT_AVAILABLE'
          );
        }

        const allocation = await this.allocationRepository.createAllocation(
          {
            organization: { connect: { id: orgId } },
            asset: { connect: { id: item.assetId } },
            employee: item.employeeId ? { connect: { id: item.employeeId } } : undefined,
            department: item.departmentId ? { connect: { id: item.departmentId } } : undefined,
            allocator: { connect: { id: allocatedByUserId } },
            allocatedToType: item.allocatedToType,
            expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : null,
            status: 'Active'
          },
          tx
        );

        await tx.asset.update({
          where: { id: item.assetId },
          data: { status: 'Allocated' }
        });

        allocations.push(allocation);
      }
    });

    await logActivity({
      organizationId: orgId,
      userId: allocatedByUserId,
      action: 'ALLOCATION_CREATED',
      entityType: 'Allocation',
      entityId: null,
      details: { count: allocations.length }
    });

    emitToOrg(orgId, 'allocation.created', { count: allocations.length });
    emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });

    return { allocatedCount: allocations.length };
  }

  /**
   * Fetches allocations listing.
   */
  async listAllocations(orgId: string, query: any) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filters: any = {};
    if (query.status) {
      filters.status = query.status;
    }
    if (query.employeeId) {
      filters.employeeId = query.employeeId;
    }
    if (query.departmentId) {
      filters.departmentId = query.departmentId;
    }

    const total = await this.allocationRepository.countAll(orgId, filters);
    const allocations = await this.allocationRepository.findAll(orgId, filters, skip, limit);

    return {
      allocations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retrieves detail profile of an allocation.
   */
  async getAllocation(orgId: string, id: string) {
    const allocation = await this.allocationRepository.findById(id, orgId);
    if (!allocation) {
      throw new AppError('Allocation details not found.', 404, 'ALLOCATION_NOT_FOUND');
    }
    return allocation;
  }
}
export default AllocationService;
