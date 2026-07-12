import prisma from '../../../database/db';
import { AllocationRepository } from '../repository/allocation.repository';
import { ReturnAssetDTO, BulkReturnDTO } from '../dto/return-asset.dto';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emitToOrg } from '../../../utils/socket';

export class ReturnService {
  private allocationRepository: AllocationRepository;

  constructor(allocationRepository = new AllocationRepository()) {
    this.allocationRepository = allocationRepository;
  }

  /**
   * Returns an allocated asset, updates condition states, and releases the asset lock inside a transaction.
   */
  async returnAsset(approverUserId: string, orgId: string, assetId: string, dto: ReturnAssetDTO) {
    return prisma.$transaction(async (tx) => {
      // 1. Resolve active allocation
      const allocation = await this.allocationRepository.findActiveAllocation(assetId);
      if (!allocation) {
        throw new AppError('No active allocation found for this asset.', 404, 'ACTIVE_ALLOCATION_NOT_FOUND');
      }

      const now = new Date();

      // 2. Close allocation record
      const updatedAllocation = await tx.allocation.update({
        where: { id: allocation.id },
        data: {
          actualReturnDate: now,
          returnCondition: dto.returnCondition,
          returnNotes: dto.returnNotes || null,
          status: 'Returned',
          updatedBy: approverUserId
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } }
        }
      });

      // 3. Resolve target asset status based on condition returned
      let nextAssetStatus = 'Available';
      if (dto.returnCondition === 'Lost') {
        nextAssetStatus = 'Lost';
      } else if (dto.returnCondition === 'Disposed') {
        nextAssetStatus = 'Disposed';
      } else if (dto.returnCondition === 'Damaged') {
        nextAssetStatus = 'Under Maintenance'; // Automatically send damaged items to maintenance!
      }

      // 4. Revert/Update Asset Status
      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: nextAssetStatus,
          condition: dto.returnCondition,
          updatedBy: approverUserId
        }
      });

      // 5. Write activity logs
      await logActivity({
        organizationId: orgId,
        userId: approverUserId,
        action: 'ALLOCATION_RETURNED',
        entityType: 'Allocation',
        entityId: allocation.id,
        details: { assetTag: allocation.asset.assetTag, condition: dto.returnCondition }
      });

      // 6. Notify holding employee (if allocated to employee)
      if (allocation.employeeId) {
        await tx.notification.create({
          data: {
            organizationId: orgId,
            recipientId: allocation.employeeId,
            title: 'Return Checked In',
            message: `Your return check-in for "${allocation.asset.name}" has been approved.`,
            type: 'Return Approved',
            relatedEntityType: 'Allocation',
            relatedEntityId: allocation.id
          }
        });
      }

      emitToOrg(orgId, 'allocation.returned', updatedAllocation);
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });

      return updatedAllocation;
    });
  }

  /**
   * Processes bulk returns inside a single interactive transaction.
   */
  async bulkReturn(approverUserId: string, orgId: string, dto: BulkReturnDTO) {
    const returns = [];

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      for (const assetId of dto.assetIds) {
        const allocation = await this.allocationRepository.findActiveAllocation(assetId);
        if (!allocation) {
          throw new AppError(`No active allocation found for asset ID ${assetId}.`, 404, 'ACTIVE_ALLOCATION_NOT_FOUND');
        }

        const ret = await tx.allocation.update({
          where: { id: allocation.id },
          data: {
            actualReturnDate: now,
            returnCondition: dto.returnCondition,
            returnNotes: dto.returnNotes || null,
            status: 'Returned',
            updatedBy: approverUserId
          }
        });

        let nextAssetStatus = 'Available';
        if (dto.returnCondition === 'Lost') {
          nextAssetStatus = 'Lost';
        } else if (dto.returnCondition === 'Disposed') {
          nextAssetStatus = 'Disposed';
        } else if (dto.returnCondition === 'Damaged') {
          nextAssetStatus = 'Under Maintenance';
        }

        await tx.asset.update({
          where: { id: assetId },
          data: {
            status: nextAssetStatus,
            condition: dto.returnCondition
          }
        });

        returns.push(ret);
      }
    });

    await logActivity({
      organizationId: orgId,
      userId: approverUserId,
      action: 'ALLOCATION_RETURNED',
      entityType: 'Allocation',
      entityId: null,
      details: { count: returns.length }
    });

    emitToOrg(orgId, 'allocation.returned', { count: returns.length });
    emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });

    return { returnedCount: returns.length };
  }
}
export default ReturnService;
