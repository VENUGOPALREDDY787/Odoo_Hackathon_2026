import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

/**
 * AuditRepository — Pure data-access layer for all audit-related tables.
 *
 * Tables managed: audit_cycles, audit_auditors, audit_items,
 *                 audit_discrepancies, audit_evidence
 *
 * Responsibilities:
 *  - All Prisma queries against audit tables
 *  - Optimized joins to prevent N+1 queries
 *  - Transactional context support via optional `tx` parameter
 *  - Pagination for large audit result sets
 *
 * No business logic. No workflow decisions. Data access only.
 */
export class AuditRepository {

  /** Standard AuditCycle include shape shared across queries */
  private readonly cycleInclude = {
    department: { select: { id: true, name: true } },
    scopeCategory: { select: { id: true, name: true } },
    auditors: {
      include: { employee: { select: { id: true, name: true, email: true } } }
    },
    _count: { select: { items: true, discrepancies: true } }
  };

  // ─── AuditCycle ────────────────────────────────────────────────────────────

  async findCycleById(id: string, orgId: string) {
    return prisma.auditCycle.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: this.cycleInclude
    });
  }

  async findCycleByIdWithTx(id: string, orgId: string, tx: Prisma.TransactionClient) {
    return tx.auditCycle.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: this.cycleInclude
    });
  }

  async createCycle(data: Prisma.AuditCycleCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditCycle.create({ data, include: this.cycleInclude });
  }

  async updateCycle(id: string, data: Prisma.AuditCycleUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditCycle.update({ where: { id }, data, include: this.cycleInclude });
  }

  async listCycles(
    orgId: string,
    filters: Prisma.AuditCycleWhereInput = {},
    skip = 0,
    take = 20
  ) {
    return prisma.auditCycle.findMany({
      where: { organizationId: orgId, deletedAt: null, ...filters },
      include: this.cycleInclude,
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  }

  async countCycles(orgId: string, filters: Prisma.AuditCycleWhereInput = {}) {
    return prisma.auditCycle.count({
      where: { organizationId: orgId, deletedAt: null, ...filters }
    });
  }

  // ─── AuditItem ─────────────────────────────────────────────────────────────

  /** Standard AuditItem include shape */
  private readonly itemInclude = {
    asset: {
      select: {
        id: true, name: true, assetTag: true, status: true,
        location: true, condition: true,
        category: { select: { id: true, name: true } }
      }
    },
    auditor: { select: { id: true, name: true, email: true } },
    evidence: true
  };

  async findItemById(id: string) {
    return prisma.auditItem.findUnique({ where: { id }, include: this.itemInclude });
  }

  async findItemByAsset(auditCycleId: string, assetId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditItem.findUnique({
      where: { auditCycleId_assetId: { auditCycleId, assetId } },
      include: this.itemInclude
    });
  }

  async createItem(data: Prisma.AuditItemCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditItem.create({ data, include: this.itemInclude });
  }

  async updateItem(id: string, data: Prisma.AuditItemUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditItem.update({ where: { id }, data, include: this.itemInclude });
  }

  async listItems(
    auditCycleId: string,
    filters: Prisma.AuditItemWhereInput = {},
    skip = 0,
    take = 50
  ) {
    return prisma.auditItem.findMany({
      where: { auditCycleId, ...filters },
      include: this.itemInclude,
      skip,
      take,
      orderBy: { createdAt: 'asc' }
    });
  }

  async countItems(auditCycleId: string, filters: Prisma.AuditItemWhereInput = {}) {
    return prisma.auditItem.count({ where: { auditCycleId, ...filters } });
  }

  /**
   * Bulk-creates AuditItems for all assets matching the cycle's scope.
   * Called when the audit is started (Draft → In Progress).
   * Uses createMany for performance at scale (1M+ assets).
   */
  async bulkCreateItems(
    auditCycleId: string,
    orgId: string,
    createdBy: string,
    scopeFilter: Prisma.AssetWhereInput,
    tx: Prisma.TransactionClient
  ) {
    const assets = await tx.asset.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { notIn: ['Disposed', 'Retired'] },
        ...scopeFilter
      },
      select: { id: true }
    });

    if (assets.length === 0) return 0;

    await tx.auditItem.createMany({
      data: assets.map((a) => ({
        auditCycleId,
        assetId: a.id,
        verificationStatus: 'Pending',
        createdBy
      })),
      skipDuplicates: true
    });

    return assets.length;
  }

  // ─── AuditDiscrepancy ──────────────────────────────────────────────────────

  async createDiscrepancy(data: Prisma.AuditDiscrepancyCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditDiscrepancy.create({ data });
  }

  async listDiscrepancies(auditCycleId: string, filters: Prisma.AuditDiscrepancyWhereInput = {}) {
    return prisma.auditDiscrepancy.findMany({
      where: { auditCycleId, ...filters },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ─── AuditEvidence ─────────────────────────────────────────────────────────

  async createEvidence(data: Prisma.AuditEvidenceCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditEvidence.create({ data });
  }

  // ─── AuditAuditor ──────────────────────────────────────────────────────────

  async addAuditors(
    auditCycleId: string,
    auditorIds: string[],
    assignedBy: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.auditAuditor.createMany({
      data: auditorIds.map((empId) => ({
        auditCycleId,
        employeeId: empId,
        assignedBy
      })),
      skipDuplicates: true
    });
  }

  async removeAuditors(auditCycleId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditAuditor.deleteMany({ where: { auditCycleId } });
  }

  async findAuditors(auditCycleId: string) {
    return prisma.auditAuditor.findMany({
      where: { auditCycleId },
      include: { employee: { select: { id: true, name: true, email: true } } }
    });
  }

  // ─── Statistics / Reporting ────────────────────────────────────────────────

  async getVerificationStats(auditCycleId: string) {
    return prisma.auditItem.groupBy({
      by: ['verificationStatus'],
      where: { auditCycleId },
      _count: { id: true }
    });
  }

  async getDiscrepancyStats(auditCycleId: string) {
    return prisma.auditDiscrepancy.groupBy({
      by: ['discrepancyType'],
      where: { auditCycleId },
      _count: { id: true }
    });
  }

  /**
   * Dashboard aggregate across all active cycles in an org.
   */
  async getOrgAuditDashboard(orgId: string) {
    const [total, active, pending, verified, missing, damaged] = await Promise.all([
      prisma.auditCycle.count({ where: { organizationId: orgId, deletedAt: null } }),
      prisma.auditCycle.count({ where: { organizationId: orgId, status: 'In Progress' } }),
      prisma.auditItem.count({
        where: { auditCycle: { organizationId: orgId }, verificationStatus: 'Pending' }
      }),
      prisma.auditItem.count({
        where: { auditCycle: { organizationId: orgId }, verificationStatus: 'Verified' }
      }),
      prisma.auditItem.count({
        where: { auditCycle: { organizationId: orgId }, verificationStatus: 'Missing' }
      }),
      prisma.auditItem.count({
        where: { auditCycle: { organizationId: orgId }, verificationStatus: 'Damaged' }
      })
    ]);

    return { total, active, pending, verified, missing, damaged };
  }
}

export default AuditRepository;
