/**
 * Concurrency Tests: Double Allocation Race Condition Prevention
 *
 * Validates that AllocationService correctly prevents the same asset
 * from being allocated twice simultaneously via SELECT FOR UPDATE row locking
 * and asset status mutation ordering.
 */
import { AllocationService } from '../service/allocation.service';
import { AllocationRepository } from '../repository/allocation.repository';
import { AppError } from '../../../core/errors/AppError';
import prisma from '../../../database/db';

jest.mock('../repository/allocation.repository');
jest.mock('../../../database/db', () => {
  const localDb = {
    asset: { findFirst: jest.fn(), update: jest.fn() },
    employee: { findFirst: jest.fn() },
    department: { findFirst: jest.fn() },
    allocation: { create: jest.fn() },
    activityLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };
  localDb.$transaction.mockImplementation((cb) => cb(localDb));
  return { __esModule: true, default: localDb };
});
jest.mock('../../../core/redis/client', () => ({
  del: jest.fn().mockResolvedValue(1),
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue('OK'),
}));
jest.mock('../../../utils/socket', () => ({
  emitToOrg: jest.fn(),
  emitToUser: jest.fn(),
  emitToOrgRole: jest.fn(),
}));
jest.mock('../../../utils/logger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

describe('AllocationService — Concurrency Tests', () => {
  let service: AllocationService;
  let mockRepo: jest.Mocked<AllocationRepository>;
  const orgId = 'org-1';
  const adminId = 'admin-1';
  const assetId = 'asset-1';
  const employeeId1 = 'emp-1';
  const employeeId2 = 'emp-2';

  beforeEach(() => {
    mockRepo = new AllocationRepository() as any;
    service = new AllocationService(mockRepo);
    // Re-establish $transaction mock since resetMocks clears it
    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(prisma));
    jest.clearAllMocks();
    // Re-set after clearAllMocks
    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(prisma));
    // Ensure repository mock methods exist
    mockRepo.createAllocation = jest.fn();
  });

  describe('Double Allocation Prevention via SELECT FOR UPDATE', () => {
    it('should throw ASSET_NOT_AVAILABLE when asset is already Allocated (race condition)', async () => {
      // tx.$queryRawUnsafe returns the row-locked asset with status = Allocated
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        { id: assetId, name: 'Laptop', asset_tag: 'TAG-1', status: 'Allocated' },
      ]);

      await expect(
        service.allocateAsset(adminId, orgId, {
          assetId,
          allocatedToType: 'Employee',
          employeeId: employeeId2,
        })
      ).rejects.toMatchObject({ code: 'ASSET_NOT_AVAILABLE', statusCode: 409 });
    });

    it('should throw ASSET_NOT_FOUND when asset row is not found in lock query', async () => {
      // Empty array = asset not found
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      await expect(
        service.allocateAsset(adminId, orgId, {
          assetId: 'non-existent',
          allocatedToType: 'Employee',
          employeeId: employeeId1,
        })
      ).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND', statusCode: 404 });
    });

    it('should succeed when asset row lock confirms Available status', async () => {
      const allocationRecord = { id: 'alloc-ok', assetId, status: 'Active' };

      // Lock returns Available
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        { id: assetId, name: 'Laptop', asset_tag: 'TAG-1', status: 'Available' },
      ]);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({
        id: employeeId1, name: 'Alice', status: 'Active', email: 'alice@test.com',
      });
      // The repository.createAllocation is called with tx
      (mockRepo.createAllocation as jest.Mock).mockResolvedValue(allocationRecord);
      (prisma.asset.update as jest.Mock).mockResolvedValue({});
      (prisma.activityLog.create as jest.Mock).mockResolvedValue({});
      (prisma.notification.create as jest.Mock).mockResolvedValue({});

      const result = await service.allocateAsset(adminId, orgId, {
        assetId,
        allocatedToType: 'Employee',
        employeeId: employeeId1,
      });

      expect(result.id).toBe('alloc-ok');
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE'),
        assetId
      );
    });
  });
});
