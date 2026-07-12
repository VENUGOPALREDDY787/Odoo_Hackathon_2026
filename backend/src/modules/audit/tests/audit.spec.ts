import { AuditRepository } from '../repository/audit.repository';
import { AuditService } from '../service/audit.service';
import { AUDIT_STATUSES, ALLOWED_AUDIT_TRANSITIONS, VERIFICATION_STATUSES } from '../constants/audit.constants';
import { AppError } from '../../../core/errors/AppError';
import prisma from '../../../database/db';

jest.mock('../repository/audit.repository');
jest.mock('../../../database/db', () => {
  const localMockDb = {
    department: { findFirst: jest.fn() },
    assetCategory: { findFirst: jest.fn() },
    employee: { findMany: jest.fn() },
    auditCycle: { update: jest.fn() },
    activityLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    auditItem: { update: jest.fn() },
    auditDiscrepancy: { create: jest.fn() },
    asset: { update: jest.fn() },
    $transaction: jest.fn(),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };
  localMockDb.$transaction.mockImplementation((cb) => cb(localMockDb));
  return {
    __esModule: true,
    default: localMockDb,
  };
});
jest.mock('../../../core/redis/client', () => ({
  del: jest.fn().mockResolvedValue(1),
}));
jest.mock('../../../utils/socket', () => ({
  emitToOrg: jest.fn(),
  emitToUser: jest.fn(),
  emitToOrgRole: jest.fn(),
}));

describe('AuditService — Workflow Transition Tests', () => {
  let service: AuditService;
  let mockRepo: jest.Mocked<AuditRepository>;
  const userId = 'user-123';
  const orgId = 'org-456';

  beforeEach(() => {
    mockRepo = new AuditRepository() as any;
    service = new AuditService(mockRepo);
    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(prisma));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Transition Matrix Integrity', () => {
    it('should allow Draft → Scheduled', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.DRAFT]).toContain(AUDIT_STATUSES.SCHEDULED);
    });

    it('should allow Scheduled → In Progress', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.SCHEDULED]).toContain(AUDIT_STATUSES.IN_PROGRESS);
    });

    it('should allow In Progress → Completed', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.IN_PROGRESS]).toContain(AUDIT_STATUSES.COMPLETED);
    });

    it('should allow Completed → Closed', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.COMPLETED]).toContain(AUDIT_STATUSES.CLOSED);
    });

    it('should NOT allow Closed → any status (immutable)', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.CLOSED]).toHaveLength(0);
    });

    it('should NOT allow Cancelled → any status (terminal)', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.CANCELLED]).toHaveLength(0);
    });

    it('should allow Draft → Cancelled', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.DRAFT]).toContain(AUDIT_STATUSES.CANCELLED);
    });

    it('should NOT allow Closed → In Progress', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.CLOSED]).not.toContain(AUDIT_STATUSES.IN_PROGRESS);
    });
  });

  describe('createCycle', () => {
    it('should throw AppError if department scope is not found', async () => {
      (prisma.department.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createCycle(userId, orgId, { name: 'Audit', scopeType: 'Department', scopeDepartmentId: 'invalid-dept' })
      ).rejects.toThrow(new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND'));
    });

    it('should throw AppError if category scope is not found', async () => {
      (prisma.assetCategory.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createCycle(userId, orgId, { name: 'Audit', scopeType: 'Category', scopeCategoryId: 'invalid-cat' })
      ).rejects.toThrow(new AppError('Asset category not found.', 404, 'CATEGORY_NOT_FOUND'));
    });

    it('should create cycle successfully without initial auditors', async () => {
      mockRepo.createCycle.mockResolvedValue({ id: 'cycle-1', name: 'Audit', scopeType: 'All' } as any);

      const result = await service.createCycle(userId, orgId, { name: 'Audit', scopeType: 'All' });

      expect(result.id).toBe('cycle-1');
      expect(mockRepo.createCycle).toHaveBeenCalled();
    });
  });

  describe('updateCycle', () => {
    it('should throw AppError if audit cycle is not found', async () => {
      mockRepo.findCycleById.mockResolvedValue(null);

      await expect(
        service.updateCycle(userId, orgId, 'invalid-id', { name: 'New Name' })
      ).rejects.toThrow(new AppError('Audit cycle not found.', 404, 'AUDIT_NOT_FOUND'));
    });

    it('should throw AppError if cycle is not in Draft state', async () => {
      mockRepo.findCycleById.mockResolvedValue({ id: 'cycle-1', status: 'Scheduled' } as any);

      await expect(
        service.updateCycle(userId, orgId, 'cycle-1', { name: 'New Name' })
      ).rejects.toThrow(new AppError('Only Draft audit cycles can be edited.', 400, 'INVALID_STATUS_TRANSITION'));
    });
  });

  describe('verifyAsset', () => {
    it('should throw error if cycle not in progress', async () => {
      mockRepo.findCycleById.mockResolvedValue({ id: 'cycle-1', status: 'Draft' } as any);

      await expect(
        service.verifyAsset(userId, orgId, 'cycle-1', 'asset-1', { verificationStatus: 'Verified' })
      ).rejects.toThrow(new AppError('Verifications can only be submitted while audit is In Progress. Current: Draft', 400, 'INVALID_STATUS_TRANSITION'));
    });

    it('should throw error if auditor is not assigned', async () => {
      mockRepo.findCycleById.mockResolvedValue({ id: 'cycle-1', status: 'In Progress' } as any);
      mockRepo.findAuditors.mockResolvedValue([{ employeeId: 'other-auditor' }] as any);

      await expect(
        service.verifyAsset(userId, orgId, 'cycle-1', 'asset-1', { verificationStatus: 'Verified' })
      ).rejects.toThrow(new AppError('You are not assigned as an auditor for this cycle.', 403, 'NOT_ASSIGNED_AUDITOR'));
    });

    it('should verify asset and log discrepancy for missing status', async () => {
      mockRepo.findCycleById.mockResolvedValue({ id: 'cycle-1', status: 'In Progress', name: 'Annual Audit' } as any);
      mockRepo.findAuditors.mockResolvedValue([{ employeeId: userId }] as any);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([{ id: 'item-1', verification_status: 'Pending' }]);
      (prisma.auditItem.update as jest.Mock).mockResolvedValue({ id: 'item-1', asset: { name: 'Server Rack' } });
      mockRepo.countItems.mockResolvedValue(5); // Not empty, so won't auto-complete

      const result = await service.verifyAsset(userId, orgId, 'cycle-1', 'asset-1', { verificationStatus: 'Missing', notes: 'Cannot find asset' });

      expect(result.id).toBe('item-1');
      expect(prisma.auditDiscrepancy.create).toHaveBeenCalled();
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        data: { status: 'Lost', updatedBy: userId },
      });
    });
  });
});
