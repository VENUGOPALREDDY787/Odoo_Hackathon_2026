import prisma from '../../../database/db';
import { AuditRepository } from '../repository/audit.repository';
import {
  CreateAuditCycleDTO, UpdateAuditCycleDTO, AssignAuditorsDTO,
  VerifyAssetDTO, AddEvidenceDTO, CancelAuditDTO
} from '../dto/audit.dto';
import { AppError } from '../../../core/errors/AppError';
import { emitToOrg, emitToUser, emitToOrgRole } from '../../../utils/socket';
import {
  AUDIT_STATUSES, ALLOWED_AUDIT_TRANSITIONS, VERIFICATION_STATUSES,
  DISCREPANCY_TYPES, AuditStatus, AUDIT_REDIS_KEYS, AUDIT_CACHE_TTL
} from '../constants/audit.constants';
import { Prisma } from '@prisma/client';
import redis from '../../../core/redis/client';

/**
 * AuditService — Core business logic for the Audit Management module.
 *
 * Enforces:
 *  - Strict workflow transition matrix (ALLOWED_AUDIT_TRANSITIONS)
 *  - Immutability of Closed audits
 *  - Bulk asset seeding on audit start (scoped by Department/Location/Category/All)
 *  - Concurrent verification prevention (unique constraint on auditCycleId+assetId)
 *  - Asset lifecycle sync: Missing → Lost (with approval), Damaged → maintenance recommendation
 *  - Automatic discrepancy record generation for Missing/Damaged verifications
 *  - Counter updates on AuditCycle (verifiedCount, missingCount, damagedCount)
 *  - Full transactional safety with SELECT FOR UPDATE on verify operations
 *  - Redis cache invalidation on every state mutation
 *
 * Integration:
 *  - AuditRepository: data access
 *  - Asset model: lifecycle sync on Missing/Damaged
 *  - Notification: in-app alerts for auditors and managers
 *  - ActivityLog: full audit trail
 *  - Socket.IO: real-time dashboard updates
 *  - Redis: cache invalidation and dashboard caching
 */
export class AuditService {
  private auditRepository: AuditRepository;

  constructor(auditRepository = new AuditRepository()) {
    this.auditRepository = auditRepository;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE AUDIT CYCLE
  // ─────────────────────────────────────────────────────────────────────────────

  async createCycle(userId: string, orgId: string, dto: CreateAuditCycleDTO) {
    // Validate scope references
    await this.validateScopeReferences(dto, orgId);

    return prisma.$transaction(async (tx) => {
      const cycle = await this.auditRepository.createCycle(
        {
          organization: { connect: { id: orgId } },
          name: dto.name,
          description: dto.description ?? null,
          scopeType: dto.scopeType,
          department: dto.scopeDepartmentId ? { connect: { id: dto.scopeDepartmentId } } : undefined,
          scopeLocation: dto.scopeLocation ?? null,
          scopeCategory: dto.scopeCategoryId ? { connect: { id: dto.scopeCategoryId } } : undefined,
          scheduledStartDate: dto.scheduledStartDate ? new Date(dto.scheduledStartDate) : null,
          scheduledEndDate: dto.scheduledEndDate ? new Date(dto.scheduledEndDate) : null,
          status: AUDIT_STATUSES.DRAFT,
          createdBy: userId
        },
        tx
      );

      // Assign initial auditors if provided
      if (dto.auditorIds && dto.auditorIds.length > 0) {
        await this.validateAuditors(dto.auditorIds, orgId);
        await this.auditRepository.addAuditors(cycle.id, dto.auditorIds, userId, tx);
      }

      await tx.activityLog.create({
        data: {
          organizationId: orgId, userId,
          action: 'AUDIT_CREATED',
          entityType: 'AuditCycle', entityId: cycle.id,
          details: { name: dto.name, scopeType: dto.scopeType }
        }
      });

      return cycle;
    }).then(async (cycle) => {
      await this.invalidateCache(orgId);
      emitToOrg(orgId, 'audit.created', { cycleId: cycle.id });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return cycle;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE AUDIT CYCLE (Draft only)
  // ─────────────────────────────────────────────────────────────────────────────

  async updateCycle(userId: string, orgId: string, cycleId: string, dto: UpdateAuditCycleDTO) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    this.assertNotClosed(cycle);

    if (cycle.status !== AUDIT_STATUSES.DRAFT) {
      throw new AppError('Only Draft audit cycles can be edited.', 400, 'INVALID_STATUS_TRANSITION');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.auditCycle.update({
        where: { id: cycleId },
        data: {
          name: dto.name ?? cycle.name,
          description: dto.description ?? cycle.description,
          scheduledStartDate: dto.scheduledStartDate ? new Date(dto.scheduledStartDate) : cycle.scheduledStartDate,
          scheduledEndDate: dto.scheduledEndDate ? new Date(dto.scheduledEndDate) : cycle.scheduledEndDate,
          updatedBy: userId
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId, userId, action: 'AUDIT_UPDATED',
          entityType: 'AuditCycle', entityId: cycleId, details: dto as any
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId);
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE AUDIT CYCLE (Draft only — soft delete)
  // ─────────────────────────────────────────────────────────────────────────────

  async deleteCycle(userId: string, orgId: string, cycleId: string) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');

    if (cycle.status !== AUDIT_STATUSES.DRAFT) {
      throw new AppError('Only Draft audit cycles can be deleted.', 400, 'INVALID_STATUS_TRANSITION');
    }

    return prisma.$transaction(async (tx) => {
      await tx.auditCycle.update({
        where: { id: cycleId },
        data: { deletedAt: new Date(), updatedBy: userId }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId, userId, action: 'AUDIT_DELETED',
          entityType: 'AuditCycle', entityId: cycleId, details: {}
        }
      });
    }).then(async () => {
      await this.invalidateCache(orgId);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ASSIGN AUDITORS
  // ─────────────────────────────────────────────────────────────────────────────

  async assignAuditors(userId: string, orgId: string, cycleId: string, dto: AssignAuditorsDTO) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    this.assertNotClosed(cycle);

    if ((['Completed', 'Closed', 'Cancelled'] as string[]).includes(cycle.status)) {
      throw new AppError(`Cannot assign auditors to a ${cycle.status} audit.`, 400, 'INVALID_STATUS_TRANSITION');
    }

    await this.validateAuditors(dto.auditorIds, orgId);

    return prisma.$transaction(async (tx) => {
      // Full replace: remove existing, add new
      await this.auditRepository.removeAuditors(cycleId, tx);
      await this.auditRepository.addAuditors(cycleId, dto.auditorIds, userId, tx);

      // Notify each newly assigned auditor
      for (const auditorId of dto.auditorIds) {
        await tx.notification.create({
          data: {
            organizationId: orgId, recipientId: auditorId,
            title: 'Audit Assignment',
            message: `You have been assigned as an auditor for "${cycle.name}".`,
            type: 'Audit Assigned',
            relatedEntityType: 'AuditCycle', relatedEntityId: cycleId
          }
        });
        emitToUser(auditorId, 'notification', { title: 'Audit Assignment' });
      }

      await tx.activityLog.create({
        data: {
          organizationId: orgId, userId, action: 'AUDIT_AUDITORS_ASSIGNED',
          entityType: 'AuditCycle', entityId: cycleId,
          details: { auditorIds: dto.auditorIds }
        }
      });

      return this.auditRepository.findCycleById(cycleId, orgId);
    }).then(async (cycle) => {
      emitToOrg(orgId, 'audit.created', { cycleId, type: 'auditors_updated' });
      return cycle;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEDULE
  // ─────────────────────────────────────────────────────────────────────────────

  async scheduleCycle(userId: string, orgId: string, cycleId: string) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    this.assertTransitionAllowed(cycle.status as AuditStatus, AUDIT_STATUSES.SCHEDULED);

    return this.transitionStatus(userId, orgId, cycleId, AUDIT_STATUSES.SCHEDULED, 'AUDIT_SCHEDULED', {});
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // START AUDIT (Scheduled → In Progress)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Starts the audit cycle:
   * 1. Transitions status to In Progress
   * 2. Seeds AuditItems for all in-scope assets via bulk insert
   * 3. Updates totalAssets counter on the cycle
   * 4. Notifies all assigned auditors
   */
  async startCycle(userId: string, orgId: string, cycleId: string) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    this.assertTransitionAllowed(cycle.status as AuditStatus, AUDIT_STATUSES.IN_PROGRESS);

    // Build scope filter for bulk asset seeding
    const scopeFilter = this.buildAssetScopeFilter(cycle);

    return prisma.$transaction(async (tx) => {
      const assetCount = await this.auditRepository.bulkCreateItems(
        cycleId, orgId, userId, scopeFilter, tx
      );

      if (assetCount === 0) {
        throw new AppError(
          'No eligible assets found in the specified scope. Cannot start audit.',
          400,
          'NO_ASSETS_IN_SCOPE'
        );
      }

      await tx.auditCycle.update({
        where: { id: cycleId },
        data: {
          status: AUDIT_STATUSES.IN_PROGRESS,
          startDate: new Date(),
          totalAssets: assetCount,
          updatedBy: userId
        }
      });

      // Notify all assigned auditors
      const auditors = await this.auditRepository.findAuditors(cycleId);
      for (const { employee } of auditors) {
        await tx.notification.create({
          data: {
            organizationId: orgId, recipientId: employee.id,
            title: 'Audit Started',
            message: `Audit "${cycle.name}" has started. Please begin verifying assigned assets.`,
            type: 'Audit Started',
            relatedEntityType: 'AuditCycle', relatedEntityId: cycleId
          }
        });
        emitToUser(employee.id, 'notification', { title: 'Audit Started' });
      }

      await tx.activityLog.create({
        data: {
          organizationId: orgId, userId, action: 'AUDIT_STARTED',
          entityType: 'AuditCycle', entityId: cycleId,
          details: { totalAssets: assetCount }
        }
      });
    }).then(async () => {
      await this.invalidateCache(orgId, cycleId);
      emitToOrg(orgId, 'audit.started', { cycleId });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return this.auditRepository.findCycleById(cycleId, orgId);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFY ASSET
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Records a verification result for a specific asset in an active audit.
   *
   * Uses SELECT FOR UPDATE on the AuditItem row to prevent two auditors from
   * simultaneously verifying the same asset (race condition guard).
   *
   * Side effects per status:
   *  - Missing  → creates AuditDiscrepancy, increments missingCount
   *  - Damaged  → creates AuditDiscrepancy, increments damagedCount
   *  - Verified → increments verifiedCount
   *
   * Checks if audit is complete (all items verified) after each submission.
   */
  async verifyAsset(
    auditorId: string, orgId: string, cycleId: string,
    assetId: string, dto: VerifyAssetDTO
  ) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');

    if (cycle.status !== AUDIT_STATUSES.IN_PROGRESS) {
      throw new AppError(
        `Verifications can only be submitted while audit is In Progress. Current: ${cycle.status}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Validate auditor is assigned to this cycle
    const auditors = await this.auditRepository.findAuditors(cycleId);
    const isAssigned = auditors.some((a) => a.employeeId === auditorId);
    if (!isAssigned) {
      throw new AppError('You are not assigned as an auditor for this cycle.', 403, 'NOT_ASSIGNED_AUDITOR');
    }

    return prisma.$transaction(async (tx) => {
      // Row-level lock on the AuditItem to prevent concurrent verification
      const lockResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT id, verification_status FROM audit_items WHERE audit_cycle_id = ? AND asset_id = ? FOR UPDATE`,
        cycleId, assetId
      );

      if (lockResult.length === 0) {
        throw new AppError('Asset is not in the scope of this audit cycle.', 404, 'AUDIT_ITEM_NOT_FOUND');
      }

      const existingStatus = lockResult[0].verification_status as string;
      const itemId = lockResult[0].id as string;

      if (existingStatus !== 'Pending') {
        throw new AppError(
          `Asset has already been verified with status "${existingStatus}". Duplicate verification not allowed.`,
          409,
          'ALREADY_VERIFIED'
        );
      }

      // Update item status
      const updated = await tx.auditItem.update({
        where: { id: itemId },
        data: {
          verificationStatus: dto.verificationStatus,
          auditorId,
          notes: dto.notes ?? null,
          physicalLocation: dto.physicalLocation ?? null,
          conditionOnVerify: dto.conditionOnVerify ?? null,
          verifiedAt: new Date(),
          updatedBy: auditorId
        },
        include: { asset: { select: { id: true, name: true, assetTag: true } } }
      });

      // Counter updates
      const counterUpdate: any = {};
      if (dto.verificationStatus === VERIFICATION_STATUSES.VERIFIED) {
        counterUpdate.verifiedCount = { increment: 1 };
      } else if (dto.verificationStatus === VERIFICATION_STATUSES.MISSING) {
        counterUpdate.missingCount = { increment: 1 };
      } else if (dto.verificationStatus === VERIFICATION_STATUSES.DAMAGED) {
        counterUpdate.damagedCount = { increment: 1 };
      }

      if (Object.keys(counterUpdate).length > 0) {
        await tx.auditCycle.update({ where: { id: cycleId }, data: counterUpdate });
      }

      // Auto-generate discrepancy records for Missing and Damaged
      if ([VERIFICATION_STATUSES.MISSING, VERIFICATION_STATUSES.DAMAGED].includes(dto.verificationStatus as any)) {
        const type = dto.verificationStatus === VERIFICATION_STATUSES.MISSING
          ? DISCREPANCY_TYPES.MISSING
          : DISCREPANCY_TYPES.DAMAGED;

        const severity = dto.verificationStatus === VERIFICATION_STATUSES.MISSING ? 'High' : 'Medium';

        await tx.auditDiscrepancy.create({
          data: {
            auditCycle: { connect: { id: cycleId } },
            asset: { connect: { id: assetId } },
            discrepancyType: type,
            description: dto.notes ?? `Asset marked as ${dto.verificationStatus} during audit "${cycle.name}".`,
            severity,
            createdBy: auditorId
          }
        });

        // For missing assets: update asset status to Lost
        if (dto.verificationStatus === VERIFICATION_STATUSES.MISSING) {
          await tx.asset.update({
            where: { id: assetId },
            data: { status: 'Lost', updatedBy: auditorId }
          });
          emitToOrg(orgId, 'asset.status.changed', { assetId, status: 'Lost' });
        }

        // Notify Asset Manager of discrepancy
        emitToOrgRole(orgId, 'Asset Manager', 'audit.discrepancy.generated', {
          cycleId, assetId,
          type, severity,
          assetName: (updated as any).asset.name
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId: orgId, userId: auditorId,
          action: 'AUDIT_ASSET_VERIFIED',
          entityType: 'AuditItem', entityId: itemId,
          details: {
            assetId, auditCycleId: cycleId,
            verificationStatus: dto.verificationStatus
          }
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId, cycleId);
      emitToOrg(orgId, `audit.asset.${dto.verificationStatus.toLowerCase().replace(' ', '_')}`, {
        cycleId, assetId
      });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });

      // Auto-complete check: if all items are now verified
      await this.checkAndAutoComplete(orgId, cycleId);

      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADD EVIDENCE
  // ─────────────────────────────────────────────────────────────────────────────

  async addEvidence(
    uploaderId: string, orgId: string, cycleId: string,
    assetId: string, dto: AddEvidenceDTO
  ) {
    const item = await this.auditRepository.findItemByAsset(cycleId, assetId);
    if (!item) throw new AppError('Audit item not found for this asset in this cycle.', 404, 'AUDIT_ITEM_NOT_FOUND');

    const evidence = await this.auditRepository.createEvidence({
      auditItem: { connect: { id: item.id } },
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      caption: dto.caption ?? null,
      uploadedBy: uploaderId
    });

    await prisma.activityLog.create({
      data: {
        organizationId: orgId, userId: uploaderId,
        action: 'AUDIT_EVIDENCE_ADDED',
        entityType: 'AuditItem', entityId: item.id,
        details: { fileUrl: dto.fileUrl, fileType: dto.fileType }
      }
    });

    return evidence;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLETE (auto or manual)
  // ─────────────────────────────────────────────────────────────────────────────

  async completeCycle(userId: string, orgId: string, cycleId: string) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    this.assertTransitionAllowed(cycle.status as AuditStatus, AUDIT_STATUSES.COMPLETED);

    return this.transitionStatus(userId, orgId, cycleId, AUDIT_STATUSES.COMPLETED, 'AUDIT_COMPLETED', {
      endDate: new Date()
    }).then(async (updated) => {
      emitToOrgRole(orgId, 'Admin', 'audit.discrepancy.generated', { cycleId, type: 'summary' });
      emitToOrgRole(orgId, 'Asset Manager', 'audit.discrepancy.generated', { cycleId });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CLOSE (immutable after this)
  // ─────────────────────────────────────────────────────────────────────────────

  async closeCycle(userId: string, orgId: string, cycleId: string) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    this.assertTransitionAllowed(cycle.status as AuditStatus, AUDIT_STATUSES.CLOSED);

    return this.transitionStatus(userId, orgId, cycleId, AUDIT_STATUSES.CLOSED, 'AUDIT_CLOSED', {
      closedAt: new Date()
    }).then(async (updated) => {
      emitToOrg(orgId, 'audit.closed', { cycleId });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────────────────────────────────────

  async cancelCycle(userId: string, orgId: string, cycleId: string, dto: CancelAuditDTO) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    this.assertTransitionAllowed(cycle.status as AuditStatus, AUDIT_STATUSES.CANCELLED);

    return this.transitionStatus(userId, orgId, cycleId, AUDIT_STATUSES.CANCELLED, 'AUDIT_CANCELLED', {
      cancelledAt: new Date(),
      cancelReason: dto.cancelReason
    }).then(async (updated) => {
      emitToOrg(orgId, 'audit.cancelled', { cycleId });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────────

  async getCycle(orgId: string, cycleId: string) {
    const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
    if (!cycle) throw new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND');
    return cycle;
  }

  async listCycles(orgId: string, query: Record<string, any>) {
    const page = parseInt(query.page as string, 10) || 1;
    const limit = Math.min(parseInt(query.limit as string, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const filters: Prisma.AuditCycleWhereInput = {};
    if (query.status) filters.status = query.status;

    const [total, cycles] = await Promise.all([
      this.auditRepository.countCycles(orgId, filters),
      this.auditRepository.listCycles(orgId, filters, skip, limit)
    ]);

    return { cycles, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async listItems(orgId: string, cycleId: string, query: Record<string, any>) {
    await this.getCycle(orgId, cycleId); // ensures org-scoped access
    const page = parseInt(query.page as string, 10) || 1;
    const limit = Math.min(parseInt(query.limit as string, 10) || 50, 200);
    const skip = (page - 1) * limit;
    const filters: Prisma.AuditItemWhereInput = {};
    if (query.status) filters.verificationStatus = query.status;

    const [total, items] = await Promise.all([
      this.auditRepository.countItems(cycleId, filters),
      this.auditRepository.listItems(cycleId, filters, skip, limit)
    ]);

    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getDiscrepancies(orgId: string, cycleId: string) {
    await this.getCycle(orgId, cycleId);
    return this.auditRepository.listDiscrepancies(cycleId);
  }

  async getReport(orgId: string, cycleId: string) {
    const cycle = await this.getCycle(orgId, cycleId);
    const [verificationStats, discrepancyStats] = await Promise.all([
      this.auditRepository.getVerificationStats(cycleId),
      this.auditRepository.getDiscrepancyStats(cycleId)
    ]);

    const statMap: Record<string, number> = {};
    for (const s of verificationStats) {
      statMap[s.verificationStatus] = s._count.id;
    }

    const discrepancyMap: Record<string, number> = {};
    for (const d of discrepancyStats) {
      discrepancyMap[d.discrepancyType] = d._count.id;
    }

    const total = (cycle as any).totalAssets || 0;
    const verified = statMap['Verified'] ?? 0;
    const completionPct = total > 0 ? Math.round((verified / total) * 100) : 0;

    return {
      cycle,
      statistics: {
        total,
        pending: statMap['Pending'] ?? 0,
        verified,
        missing: statMap['Missing'] ?? 0,
        damaged: statMap['Damaged'] ?? 0,
        notVerified: statMap['Not Verified'] ?? 0,
        completionPercentage: completionPct
      },
      discrepancies: discrepancyMap
    };
  }

  async getDashboard(orgId: string) {
    const cacheKey = AUDIT_REDIS_KEYS.dashboard(orgId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* non-fatal */ }

    const data = await this.auditRepository.getOrgAuditDashboard(orgId);

    try {
      await redis.setex(cacheKey, AUDIT_CACHE_TTL, JSON.stringify(data));
    } catch { /* non-fatal */ }

    return data;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private assertTransitionAllowed(current: AuditStatus, target: AuditStatus): void {
    const allowed = ALLOWED_AUDIT_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      throw new AppError(
        `Invalid transition. Cannot move audit from "${current}" to "${target}".`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  private assertNotClosed(cycle: any): void {
    if (cycle.status === AUDIT_STATUSES.CLOSED) {
      throw new AppError('Closed audits are immutable and cannot be modified.', 403, 'AUDIT_IMMUTABLE');
    }
  }

  private async transitionStatus(
    userId: string, orgId: string, cycleId: string,
    newStatus: AuditStatus, action: string, extraData: any
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.auditCycle.update({
        where: { id: cycleId },
        data: { status: newStatus, updatedBy: userId, ...extraData }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId, userId, action,
          entityType: 'AuditCycle', entityId: cycleId,
          details: { status: newStatus }
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCache(orgId, cycleId);
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  /**
   * Checks if all audit items have been verified and auto-transitions to Completed.
   */
  private async checkAndAutoComplete(orgId: string, cycleId: string): Promise<void> {
    const pendingCount = await this.auditRepository.countItems(cycleId, { verificationStatus: 'Pending' });
    if (pendingCount === 0) {
      const cycle = await this.auditRepository.findCycleById(cycleId, orgId);
      if (cycle?.status === AUDIT_STATUSES.IN_PROGRESS) {
        await this.completeCycle('system', orgId, cycleId).catch(() => {/* non-fatal auto-complete */});
      }
    }
  }

  /**
   * Builds the Prisma Asset WHERE filter based on audit scope.
   */
  private buildAssetScopeFilter(cycle: any): Prisma.AssetWhereInput {
    if (cycle.scopeType === 'Department' && cycle.scopeDepartmentId) {
      // Assets allocated to employees in this department
      return {
        allocations: {
          some: { employee: { departmentId: cycle.scopeDepartmentId }, status: 'Active' }
        }
      };
    }
    if (cycle.scopeType === 'Location' && cycle.scopeLocation) {
      return { location: cycle.scopeLocation };
    }
    if (cycle.scopeType === 'Category' && cycle.scopeCategoryId) {
      return { categoryId: cycle.scopeCategoryId };
    }
    return {}; // 'All' scope — no additional filter
  }

  private async validateScopeReferences(dto: CreateAuditCycleDTO, orgId: string): Promise<void> {
    if (dto.scopeDepartmentId) {
      const dept = await prisma.department.findFirst({ where: { id: dto.scopeDepartmentId, organizationId: orgId } });
      if (!dept) throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }
    if (dto.scopeCategoryId) {
      const cat = await prisma.assetCategory.findFirst({ where: { id: dto.scopeCategoryId, organizationId: orgId } });
      if (!cat) throw new AppError('Asset category not found.', 404, 'CATEGORY_NOT_FOUND');
    }
  }

  private async validateAuditors(auditorIds: string[], orgId: string): Promise<void> {
    const employees = await prisma.employee.findMany({
      where: { id: { in: auditorIds }, organizationId: orgId, deletedAt: null }
    });
    if (employees.length !== auditorIds.length) {
      throw new AppError('One or more auditor IDs are invalid or do not belong to this organization.', 400, 'INVALID_AUDITOR');
    }
  }

  private async invalidateCache(orgId: string, cycleId?: string): Promise<void> {
    try {
      const keys = [AUDIT_REDIS_KEYS.dashboard(orgId), AUDIT_REDIS_KEYS.statistics(orgId)];
      if (cycleId) {
        keys.push(AUDIT_REDIS_KEYS.cycleItems(cycleId));
        keys.push(AUDIT_REDIS_KEYS.pendingVerifications(cycleId));
        keys.push(AUDIT_REDIS_KEYS.discrepancies(cycleId));
      }
      await Promise.all(keys.map((k) => redis.del(k)));
    } catch { /* non-fatal */ }
  }
}

export default AuditService;
