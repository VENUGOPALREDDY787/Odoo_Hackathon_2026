import prisma from '../../../database/db';
import { MaintenanceRepository } from '../repository/maintenance.repository';
import {
  CreateMaintenanceRequestDTO,
  UpdateMaintenanceRequestDTO,
  ApproveMaintenanceDTO,
  RejectMaintenanceDTO,
  AssignTechnicianDTO,
  CompleteMaintenanceDTO,
  CancelMaintenanceDTO
} from '../dto/maintenance.dto';
import { AppError } from '../../../core/errors/AppError';
import { emitToOrg, emitToUser, emitToOrgRole } from '../../../utils/socket';
import {
  MAINTENANCE_STATUSES,
  ALLOWED_TRANSITIONS,
  BLOCKED_ASSET_STATUSES_FOR_MAINTENANCE,
  MaintenanceStatus,
  MAINTENANCE_REDIS_KEYS
} from '../constants/maintenance.constants';
import redis from '../../../core/redis/client';

/**
 * MaintenanceService — Core business logic for the Maintenance Management module.
 *
 * Enforces:
 *  - Strict workflow transition matrix (ALLOWED_TRANSITIONS)
 *  - Duplicate maintenance detection per asset (only one active request allowed)
 *  - Asset lifecycle synchronization (Under Maintenance on approve, Available on complete)
 *  - Full transactional safety for every state mutation
 *  - Row-level locking (SELECT FOR UPDATE) for approve + complete operations
 *  - Redis cache invalidation on every mutation
 *  - RBAC enforcement (Employees only raise/view own; Managers approve; Admin has full access)
 *
 * Integration:
 *  - MaintenanceRepository: data access
 *  - Asset model: lifecycle synchronization
 *  - ActivityLog: full audit trail
 *  - Notification model: in-app alerts
 *  - Socket.IO: real-time dashboard updates
 *  - Redis: cache invalidation
 */
export class MaintenanceService {
  private maintenanceRepository: MaintenanceRepository;

  constructor(maintenanceRepository = new MaintenanceRepository()) {
    this.maintenanceRepository = maintenanceRepository;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RAISE REQUEST
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new maintenance request.
   *
   * Guards:
   *  1. Asset must exist and belong to the org
   *  2. Asset must not be in Disposed or Retired state
   *  3. Asset must NOT already have an active maintenance request (deduplication)
   */
  async createRequest(userId: string, orgId: string, dto: CreateMaintenanceRequestDTO) {
    // 1. Validate asset
    const asset = await prisma.asset.findFirst({
      where: { id: dto.assetId, organizationId: orgId, deletedAt: null }
    });
    if (!asset) throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');

    if ((BLOCKED_ASSET_STATUSES_FOR_MAINTENANCE as readonly string[]).includes(asset.status)) {
      throw new AppError(
        `Cannot raise maintenance for asset in "${asset.status}" status.`,
        400,
        'ASSET_STATUS_BLOCKED'
      );
    }

    // 2. Duplicate active check
    const existing = await this.maintenanceRepository.findActiveByAsset(dto.assetId, orgId);
    if (existing) {
      throw new AppError(
        `Asset "${asset.name}" already has an active maintenance request (ID: ${existing.id}).`,
        409,
        'DUPLICATE_MAINTENANCE_REQUEST'
      );
    }

    return prisma.$transaction(async (tx) => {
      const request = await this.maintenanceRepository.create(
        {
          organization: { connect: { id: orgId } },
          asset: { connect: { id: dto.assetId } },
          raiser: { connect: { id: userId } },
          issueDescription: dto.issueDescription,
          priority: dto.priority ?? 'Medium',
          photoUrl: dto.photoUrl ?? null,
          estimatedCompletionDate: dto.estimatedCompletionDate ? new Date(dto.estimatedCompletionDate) : null,
          estimatedCost: dto.estimatedCost ?? null,
          vendor: dto.vendor ?? null,
          status: MAINTENANCE_STATUSES.PENDING,
          createdBy: userId
        } as any,
        tx
      );

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'MAINTENANCE_REQUESTED',
          entityType: 'MaintenanceRequest',
          entityId: request.id,
          details: { assetId: dto.assetId, priority: dto.priority }
        }
      });

      // Notify Asset Managers and Admins
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: userId,
          title: 'Maintenance Request Submitted',
          message: `Your maintenance request for "${asset.name}" (${asset.assetTag}) has been submitted and is pending approval.`,
          type: 'Maintenance Requested',
          relatedEntityType: 'MaintenanceRequest',
          relatedEntityId: request.id
        }
      });

      return request;
    }).then(async (request) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.requested', { requestId: request.id, priority: dto.priority });
      emitToOrgRole(orgId, 'Asset Manager', 'maintenance.requested', { requestId: request.id });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return request;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE REQUEST (metadata only — before approval)
  // ─────────────────────────────────────────────────────────────────────────────

  async updateRequest(userId: string, orgId: string, requestId: string, dto: UpdateMaintenanceRequestDTO, role: string) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    // Only raiser or Admin/Asset Manager can update
    if (role === 'Employee' && request.raisedBy !== userId) {
      throw new AppError('Forbidden. You can only update your own requests.', 403, 'FORBIDDEN');
    }

    if (!['Pending'].includes(request.status)) {
      throw new AppError(
        `Cannot update a request with status "${request.status}". Only Pending requests can be updated.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          issueDescription: dto.issueDescription ?? request.issueDescription,
          priority: dto.priority ?? request.priority,
          photoUrl: dto.photoUrl ?? request.photoUrl,
          estimatedCompletionDate: dto.estimatedCompletionDate
            ? new Date(dto.estimatedCompletionDate)
            : (request as any).estimatedCompletionDate,
          estimatedCost: dto.estimatedCost ?? (request as any).estimatedCost,
          vendor: dto.vendor ?? (request as any).vendor,
          updatedBy: userId
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'MAINTENANCE_UPDATED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: JSON.parse(JSON.stringify(dto))
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.requested', { requestId, status: 'Pending' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // APPROVE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Approves a maintenance request.
   * Sets asset status to "Under Maintenance" atomically.
   * Uses SELECT FOR UPDATE row lock to prevent concurrent approval race conditions.
   */
  async approveRequest(approverUserId: string, orgId: string, requestId: string, dto: ApproveMaintenanceDTO) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    this.assertTransitionAllowed(request.status as MaintenanceStatus, MAINTENANCE_STATUSES.APPROVED);

    return prisma.$transaction(async (tx) => {
      // Row-level lock on asset to prevent concurrent lifecycle changes
      await tx.$queryRawUnsafe<any[]>(
        `SELECT id, status FROM assets WHERE id = ? FOR UPDATE`,
        request.assetId
      );

      const nextStatus = dto.assignedTechnician
        ? MAINTENANCE_STATUSES.TECHNICIAN_ASSIGNED
        : MAINTENANCE_STATUSES.APPROVED;

      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: nextStatus,
          approver: { connect: { id: approverUserId } },
          approvedAt: new Date(),
          assignedTechnician: dto.assignedTechnician ?? null,
          estimatedCompletionDate: dto.estimatedCompletionDate
            ? new Date(dto.estimatedCompletionDate)
            : (request as any).estimatedCompletionDate,
          estimatedCost: dto.estimatedCost ?? (request as any).estimatedCost,
          vendor: dto.vendor ?? (request as any).vendor,
          updatedBy: approverUserId
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          raiser: { select: { id: true, name: true } }
        }
      });

      // Sync asset status → Under Maintenance
      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: 'Under Maintenance', updatedBy: approverUserId }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId: approverUserId,
          action: 'MAINTENANCE_APPROVED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: { assetId: request.assetId, technician: dto.assignedTechnician }
        }
      });

      // Notify raiser
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: request.raisedBy,
          title: 'Maintenance Request Approved',
          message: `Your maintenance request for "${(updated as any).asset.name}" has been approved.`,
          type: 'Maintenance Approved',
          relatedEntityType: 'MaintenanceRequest',
          relatedEntityId: requestId
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.approved', { requestId });
      emitToUser(request.raisedBy, 'notification', { title: 'Maintenance Approved' });
      emitToOrg(orgId, 'asset.status.changed', { assetId: request.assetId, status: 'Under Maintenance' });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REJECT
  // ─────────────────────────────────────────────────────────────────────────────

  async rejectRequest(approverUserId: string, orgId: string, requestId: string, dto: RejectMaintenanceDTO) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    this.assertTransitionAllowed(request.status as MaintenanceStatus, MAINTENANCE_STATUSES.REJECTED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: MAINTENANCE_STATUSES.REJECTED,
          approver: { connect: { id: approverUserId } },
          rejectionReason: dto.rejectionReason,
          updatedBy: approverUserId
        },
        include: { asset: { select: { id: true, name: true, assetTag: true } } }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId: approverUserId,
          action: 'MAINTENANCE_REJECTED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: { reason: dto.rejectionReason }
        }
      });

      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: request.raisedBy,
          title: 'Maintenance Request Rejected',
          message: `Your maintenance request for "${(updated as any).asset.name}" was rejected. Reason: ${dto.rejectionReason}`,
          type: 'Maintenance Rejected',
          relatedEntityType: 'MaintenanceRequest',
          relatedEntityId: requestId
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.rejected', { requestId });
      emitToUser(request.raisedBy, 'notification', { title: 'Maintenance Rejected' });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ASSIGN TECHNICIAN
  // ─────────────────────────────────────────────────────────────────────────────

  async assignTechnician(managerId: string, orgId: string, requestId: string, dto: AssignTechnicianDTO) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    this.assertTransitionAllowed(request.status as MaintenanceStatus, MAINTENANCE_STATUSES.TECHNICIAN_ASSIGNED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: MAINTENANCE_STATUSES.TECHNICIAN_ASSIGNED,
          assignedTechnician: dto.assignedTechnician,
          updatedBy: managerId
        },
        include: { asset: { select: { id: true, name: true, assetTag: true } } }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId: managerId,
          action: 'MAINTENANCE_TECHNICIAN_ASSIGNED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: { technician: dto.assignedTechnician }
        }
      });

      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: request.raisedBy,
          title: 'Technician Assigned',
          message: `Technician "${dto.assignedTechnician}" has been assigned to fix "${(updated as any).asset.name}".`,
          type: 'Technician Assigned',
          relatedEntityType: 'MaintenanceRequest',
          relatedEntityId: requestId
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.assigned', { requestId, technician: dto.assignedTechnician });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // START MAINTENANCE
  // ─────────────────────────────────────────────────────────────────────────────

  async startMaintenance(userId: string, orgId: string, requestId: string) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    this.assertTransitionAllowed(request.status as MaintenanceStatus, MAINTENANCE_STATUSES.IN_PROGRESS);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: MAINTENANCE_STATUSES.IN_PROGRESS,
          startedAt: new Date(),
          updatedBy: userId
        },
        include: { asset: { select: { id: true, name: true, assetTag: true } } }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'MAINTENANCE_STARTED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: {}
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.started', { requestId });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLETE MAINTENANCE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Resolves a maintenance request and restores the asset to Available.
   * Uses SELECT FOR UPDATE to prevent concurrent asset status changes.
   */
  async completeMaintenance(userId: string, orgId: string, requestId: string, dto: CompleteMaintenanceDTO) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    this.assertTransitionAllowed(request.status as MaintenanceStatus, MAINTENANCE_STATUSES.RESOLVED);

    return prisma.$transaction(async (tx) => {
      // Row lock asset to prevent concurrent lifecycle changes
      await tx.$queryRawUnsafe<any[]>(
        `SELECT id, status FROM assets WHERE id = ? FOR UPDATE`,
        request.assetId
      );

      const now = new Date();
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: MAINTENANCE_STATUSES.RESOLVED,
          resolutionNotes: dto.resolutionNotes,
          actualCost: dto.actualCost ?? null,
          resolvedAt: dto.actualCompletionDate ? new Date(dto.actualCompletionDate) : now,
          updatedBy: userId
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          raiser: { select: { id: true } }
        }
      });

      // Restore asset status to Available
      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: 'Available', updatedBy: userId }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'MAINTENANCE_COMPLETED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: { resolutionNotes: dto.resolutionNotes, actualCost: dto.actualCost }
        }
      });

      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: request.raisedBy,
          title: 'Maintenance Completed',
          message: `The maintenance for "${(updated as any).asset.name}" has been resolved and the asset is now available.`,
          type: 'Maintenance Completed',
          relatedEntityType: 'MaintenanceRequest',
          relatedEntityId: requestId
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.completed', { requestId });
      emitToOrg(orgId, 'asset.status.changed', { assetId: request.assetId, status: 'Available' });
      emitToUser(request.raisedBy, 'notification', { title: 'Maintenance Completed' });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CLOSE
  // ─────────────────────────────────────────────────────────────────────────────

  async closeRequest(userId: string, orgId: string, requestId: string) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    this.assertTransitionAllowed(request.status as MaintenanceStatus, MAINTENANCE_STATUSES.CLOSED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: { status: MAINTENANCE_STATUSES.CLOSED, closedAt: new Date(), updatedBy: userId },
        include: { asset: { select: { id: true, name: true } } }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'MAINTENANCE_CLOSED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: {}
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────────────────────────────────────

  async cancelRequest(userId: string, orgId: string, requestId: string, dto: CancelMaintenanceDTO, role: string) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');

    // Employees can only cancel their own requests
    if (role === 'Employee' && request.raisedBy !== userId) {
      throw new AppError('Forbidden. You can only cancel your own requests.', 403, 'FORBIDDEN');
    }

    this.assertTransitionAllowed(request.status as MaintenanceStatus, MAINTENANCE_STATUSES.CANCELLED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: MAINTENANCE_STATUSES.CANCELLED,
          cancelReason: dto.cancelReason,
          updatedBy: userId
        },
        include: { asset: { select: { id: true, name: true, assetTag: true, status: true } } }
      });

      // If asset was put into maintenance, revert it to Available
      if ((updated as any).asset.status === 'Under Maintenance') {
        await tx.asset.update({
          where: { id: request.assetId },
          data: { status: 'Available', updatedBy: userId }
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'MAINTENANCE_CANCELLED',
          entityType: 'MaintenanceRequest',
          entityId: requestId,
          details: { reason: dto.cancelReason }
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'maintenance.cancelled', { requestId });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────────

  async getRequest(orgId: string, requestId: string) {
    const request = await this.maintenanceRepository.findById(requestId, orgId);
    if (!request) throw new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND');
    return request;
  }

  async listRequests(userId: string, orgId: string, role: string, query: Record<string, any>) {
    const page = parseInt(query.page as string, 10) || 1;
    const limit = Math.min(parseInt(query.limit as string, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filters: Prisma.MaintenanceRequestWhereInput = {};
    if (query.status) filters.status = query.status;
    if (query.priority) filters.priority = query.priority;
    if (query.assetId) filters.assetId = query.assetId as string;

    // RBAC scoping
    if (role === 'Employee') filters.raisedBy = userId;

    const [total, requests] = await Promise.all([
      this.maintenanceRepository.count(orgId, filters),
      this.maintenanceRepository.findMany(orgId, filters, skip, limit)
    ]);

    return {
      requests,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async getReport(orgId: string) {
    const [pending, inProgress, resolved, costData] = await Promise.all([
      this.maintenanceRepository.count(orgId, { status: MAINTENANCE_STATUSES.PENDING }),
      this.maintenanceRepository.count(orgId, { status: MAINTENANCE_STATUSES.IN_PROGRESS }),
      this.maintenanceRepository.count(orgId, { status: MAINTENANCE_STATUSES.RESOLVED }),
      this.maintenanceRepository.getCostReport(orgId)
    ]);

    const totalCost = costData.reduce(
      (sum: number, r: any) => sum + Number((r as any)._sum.actualCost ?? 0),
      0
    );

    return { pending, inProgress, resolved, totalCost, costByAsset: costData };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validates that the requested status transition is permitted by the workflow matrix.
   */
  private assertTransitionAllowed(current: MaintenanceStatus, target: MaintenanceStatus): void {
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      throw new AppError(
        `Invalid workflow transition. Cannot move from "${current}" to "${target}".`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Invalidates all Redis maintenance cache keys for the organization.
   */
  private async invalidateCache(orgId: string): Promise<void> {
    try {
      await Promise.all([
        redis.del(MAINTENANCE_REDIS_KEYS.pending(orgId)),
        redis.del(MAINTENANCE_REDIS_KEYS.inProgress(orgId)),
        redis.del(MAINTENANCE_REDIS_KEYS.dashboard(orgId))
      ]);
    } catch {
      // Non-fatal
    }
  }
}

// Import required for listing with type
import { Prisma } from '@prisma/client';

export default MaintenanceService;
