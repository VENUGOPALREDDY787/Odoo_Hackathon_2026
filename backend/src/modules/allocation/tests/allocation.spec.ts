import { AllocationService } from '../service/allocation.service';
import { AllocationRepository } from '../repository/allocation.repository';
import prisma from '../../../database/db';
import { AppError } from '../../../core/errors/AppError';
import { mockPrismaTransaction, prismaMock } from '../../../tests/mocks/prisma.mock';

describe('AllocationService', () => {
  let allocationService: AllocationService;
  let allocationRepoMock: jest.Mocked<AllocationRepository>;
  
  const orgId = 'org-1';
  const allocatedByUserId = 'admin-1';

  beforeEach(() => {
    mockPrismaTransaction(prismaMock);
    allocationRepoMock = {
      createAllocation: jest.fn(),
      countAll: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<AllocationRepository>;

    allocationService = new AllocationService(allocationRepoMock);
  });

  describe('allocateAsset', () => {
    const validDto = {
      assetId: 'asset-1',
      allocatedToType: 'Employee' as const,
      employeeId: 'emp-1',
      expectedReturnDate: '2026-12-31T00:00:00.000Z'
    };

    it('should allocate asset to employee successfully', async () => {
      // Mock the row-lock raw query to return an available asset
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { id: 'asset-1', status: 'Available', name: 'Laptop', asset_tag: 'LPT-01' }
      ]);

      // Mock employee lookup to return active employee
      (prisma.employee.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'emp-1',
        organizationId: orgId,
        status: 'Active',
        name: 'John Doe',
      });

      // Mock allocation creation
      const mockAllocation = { id: 'alloc-1', status: 'Active' };
      allocationRepoMock.createAllocation.mockResolvedValueOnce(mockAllocation as any);

      const result = await allocationService.allocateAsset(allocatedByUserId, orgId, validDto);

      expect(result).toEqual(mockAllocation);
      
      // Verify raw lock query was executed
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, status, name, asset_tag FROM assets WHERE id = ? FOR UPDATE'),
        validDto.assetId
      );

      // Verify asset status update
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: validDto.assetId },
        data: { status: 'Allocated', updatedBy: allocatedByUserId }
      });
    });

    it('should throw AppError if asset is not found', async () => {
      // Return empty array to simulate asset not found
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

      await expect(
        allocationService.allocateAsset(allocatedByUserId, orgId, validDto)
      ).rejects.toThrow(new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND'));
    });

    it('should throw AppError if asset is not Available', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { id: 'asset-1', status: 'In Repair', name: 'Laptop', asset_tag: 'LPT-01' }
      ]);

      await expect(
        allocationService.allocateAsset(allocatedByUserId, orgId, validDto)
      ).rejects.toThrow(/is currently not available for checkout/);
    });

    it('should throw AppError if employee is inactive', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { id: 'asset-1', status: 'Available', name: 'Laptop', asset_tag: 'LPT-01' }
      ]);

      // Return inactive employee
      (prisma.employee.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'emp-1',
        organizationId: orgId,
        status: 'Inactive',
        name: 'John Doe',
      });

      await expect(
        allocationService.allocateAsset(allocatedByUserId, orgId, validDto)
      ).rejects.toThrow(/Cannot allocate assets to an inactive employee/);
    });
  });
});
