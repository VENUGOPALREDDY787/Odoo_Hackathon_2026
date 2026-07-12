import prisma from '../../../database/db';
import { TransferRepository } from '../repository/transfer.repository';
import { AllocationRepository } from '../repository/allocation.repository';
import { TransferRequestDTO } from '../dto/transfer-request.dto';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emitToOrg } from '../../../utils/socket';

export class TransferService {
  private transferRepository: TransferRepository;
  private allocationRepository: AllocationRepository;

  constructor(transferRepository = new TransferRepository(), allocationRepository = new AllocationRepository()) {
    this.transferRepository = transferRepository;
    this.allocationRepository = allocationRepository;
  }

  /**
   * Submits a transfer request for an allocated asset.
   */
  async requestTransfer(requesterUserId: string, orgId: string, dto: TransferRequestDTO) {
    const allocation = await this.allocationRepository.findActiveAllocation(dto.assetId);
    if (!allocation) {
      throw new AppError('Asset is not currently allocated.', 400, 'ASSET_NOT_ALLOCATED');
    }

    // RBAC check: Employees can only request transfer for assets checked out to them
    const requester = await prisma.employee.findUnique({ where: { id: requesterUserId } });
    if (!requester) {
      throw new AppError('Requester profile not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    if (requester.role === 'Employee' && allocation.employeeId !== requesterUserId) {
      throw new AppError('Forbidden. You do not hold this asset allocation.', 403, 'FORBIDDEN');
    }

    // Validate target destination
    if (dto.toEmployeeId) {
      const targetEmp = await prisma.employee.findFirst({
        where: { id: dto.toEmployeeId, organizationId: orgId, deletedAt: null }
      });
      if (!targetEmp || targetEmp.status !== 'Active') {
        throw new AppError('Target employee is inactive or not found.', 400, 'INACTIVE_TARGET');
      }
    } else if (dto.toDepartmentId) {
      const targetDept = await prisma.department.findFirst({
        where: { id: dto.toDepartmentId, organizationId: orgId }
      });
      if (!targetDept || targetDept.status !== 'Active') {
        throw new AppError('Target department is inactive or not found.', 400, 'INACTIVE_TARGET');
      }
    }

    const transfer = await this.transferRepository.createTransfer({
      organization: { connect: { id: orgId } },
      asset: { connect: { id: dto.assetId } },
      fromEmployee: allocation.employeeId ? { connect: { id: allocation.employeeId } } : undefined,
      fromDepartment: allocation.departmentId ? { connect: { id: allocation.departmentId } } : undefined,
      toEmployee: dto.toEmployeeId ? { connect: { id: dto.toEmployeeId } } : undefined,
      toDepartment: dto.toDepartmentId ? { connect: { id: dto.toDepartmentId } } : undefined,
      requester: { connect: { id: requesterUserId } },
      status: 'Pending',
      requestNotes: dto.requestNotes || null
    });

    await logActivity({
      organizationId: orgId,
      userId: requesterUserId,
      action: 'TRANSFER_REQUESTED',
      entityType: 'Transfer',
      entityId: transfer.id,
      details: { assetTag: allocation.asset.assetTag }
    });

    emitToOrg(orgId, 'transfer.requested', transfer);

    return transfer;
  }

  /**
   * Approves a transfer request: closes the active allocation, opens a new allocation, and updates logs.
   */
  async approveTransfer(approverUserId: string, orgId: string, transferId: string, approvalNotes?: string | null) {
    const transfer = await this.transferRepository.findById(transferId, orgId);
    if (!transfer) {
      throw new AppError('Transfer request not found.', 404, 'TRANSFER_NOT_FOUND');
    }

    if (transfer.status !== 'Pending') {
      throw new AppError('Transfer request is not pending.', 400, 'TRANSFER_NOT_PENDING');
    }

    const activeAllocation = await this.allocationRepository.findActiveAllocation(transfer.assetId);
    if (!activeAllocation) {
      throw new AppError('No active allocation found to transfer.', 404, 'ACTIVE_ALLOCATION_NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Close current allocation
      await tx.allocation.update({
        where: { id: activeAllocation.id },
        data: {
          actualReturnDate: now,
          status: 'Returned',
          returnCondition: activeAllocation.asset.status as any || 'Good',
          returnNotes: 'Released via transfer approval.'
        }
      });

      // 2. Open new allocation
      const newAllocation = await tx.allocation.create({
        data: {
          organizationId: orgId,
          assetId: transfer.assetId,
          allocatedToType: transfer.toEmployeeId ? 'Employee' : 'Department',
          employeeId: transfer.toEmployeeId || null,
          departmentId: transfer.toDepartmentId || null,
          allocatedBy: approverUserId,
          status: 'Active'
        }
      });

      // 3. Update Transfer record
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'Approved',
          approver: { connect: { id: approverUserId } },
          approvalNotes
        }
      });

      // 4. Log Activity
      await logActivity({
        organizationId: orgId,
        userId: approverUserId,
        action: 'TRANSFER_APPROVED',
        entityType: 'Transfer',
        entityId: transferId,
        details: { assetTag: transfer.asset.assetTag }
      });

      // 5. Notify target recipient (if employee)
      if (transfer.toEmployeeId) {
        await tx.notification.create({
          data: {
            organizationId: orgId,
            recipientId: transfer.toEmployeeId,
            title: 'Asset Transferred to You',
            message: `The asset "${transfer.asset.name}" (${transfer.asset.assetTag}) has been transferred to you.`,
            type: 'Transfer Approved',
            relatedEntityType: 'Allocation',
            relatedEntityId: newAllocation.id
          }
        });
      }

      emitToOrg(orgId, 'transfer.approved', updatedTransfer);
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });

      return updatedTransfer;
    });
  }

  /**
   * Rejects a transfer request.
   */
  async rejectTransfer(approverUserId: string, orgId: string, transferId: string, approvalNotes?: string | null) {
    const transfer = await this.transferRepository.findById(transferId, orgId);
    if (!transfer) {
      throw new AppError('Transfer request not found.', 404, 'TRANSFER_NOT_FOUND');
    }

    if (transfer.status !== 'Pending') {
      throw new AppError('Transfer request is not pending.', 400, 'TRANSFER_NOT_PENDING');
    }

    const updated = await this.transferRepository.updateTransfer(transferId, {
      status: 'Rejected',
      approver: { connect: { id: approverUserId } },
      approvalNotes
    });

    await logActivity({
      organizationId: orgId,
      userId: approverUserId,
      action: 'TRANSFER_REJECTED',
      entityType: 'Transfer',
      entityId: transferId,
      details: { assetTag: transfer.asset.assetTag }
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientId: transfer.requestedBy,
        title: 'Transfer Request Rejected',
        message: `Your transfer request for "${transfer.asset.name}" has been rejected.`,
        type: 'Transfer Rejected',
        relatedEntityType: 'Transfer',
        relatedEntityId: transferId
      }
    });

    emitToOrg(orgId, 'transfer.rejected', updated);

    return updated;
  }

  /**
   * Cancels a pending transfer request.
   */
  async cancelTransfer(requesterUserId: string, orgId: string, transferId: string) {
    const transfer = await this.transferRepository.findById(transferId, orgId);
    if (!transfer) {
      throw new AppError('Transfer request not found.', 404, 'TRANSFER_NOT_FOUND');
    }

    if (transfer.requestedBy !== requesterUserId) {
      throw new AppError('Forbidden. You did not request this transfer.', 403, 'FORBIDDEN');
    }

    if (transfer.status !== 'Pending') {
      throw new AppError('Transfer request is not pending.', 400, 'TRANSFER_NOT_PENDING');
    }

    const updated = await this.transferRepository.updateTransfer(transferId, {
      status: 'Cancelled'
    });

    await logActivity({
      organizationId: orgId,
      userId: requesterUserId,
      action: 'TRANSFER_CANCELLED',
      entityType: 'Transfer',
      entityId: transferId,
      details: { assetTag: transfer.asset.assetTag }
    });

    emitToOrg(orgId, 'transfer.cancelled', updated);

    return updated;
  }

  /**
   * Lists transfers matching query criteria.
   */
  async listTransfers(orgId: string, query: any) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filters: any = {};
    if (query.status) {
      filters.status = query.status;
    }
    if (query.assetId) {
      filters.assetId = query.assetId;
    }

    const total = await this.transferRepository.countAll(orgId, filters);
    const transfers = await this.transferRepository.findAll(orgId, filters, skip, limit);

    return {
      transfers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
export default TransferService;
