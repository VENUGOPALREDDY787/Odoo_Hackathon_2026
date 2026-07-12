import { MaintenanceRepository } from '../repository/maintenance.repository';
import { MaintenanceService } from '../service/maintenance.service';
import { MAINTENANCE_STATUSES, ALLOWED_TRANSITIONS } from '../constants/maintenance.constants';
import { AppError } from '../../../core/errors/AppError';
import prisma from '../../../database/db';

jest.mock('../repository/maintenance.repository');
jest.mock('../../../database/db', () => {
  const localMockDb = {
    asset: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    maintenanceRequest: {
      update: jest.fn(),
    },
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

describe('Maintenance Workflow Tests', () => {
  let service: MaintenanceService;
  let mockRepo: jest.Mocked<MaintenanceRepository>;
  const userId = 'user-123';
  const orgId = 'org-456';

  beforeEach(() => {
    mockRepo = new MaintenanceRepository() as any;
    service = new MaintenanceService(mockRepo);
    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(prisma));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Transition Matrix', () => {
    it('should allow Pending → Approved', () => {
      const allowed = ALLOWED_TRANSITIONS['Pending'];
      expect(allowed).toContain(MAINTENANCE_STATUSES.APPROVED);
    });

    it('should allow Approved → Technician Assigned', () => {
      const allowed = ALLOWED_TRANSITIONS['Approved'];
      expect(allowed).toContain(MAINTENANCE_STATUSES.TECHNICIAN_ASSIGNED);
    });

    it('should allow In Progress → Resolved', () => {
      const allowed = ALLOWED_TRANSITIONS['In Progress'];
      expect(allowed).toContain(MAINTENANCE_STATUSES.RESOLVED);
    });

    it('should NOT allow Resolved → Pending (invalid transition)', () => {
      const allowed = ALLOWED_TRANSITIONS['Resolved'];
      expect(allowed).not.toContain(MAINTENANCE_STATUSES.PENDING);
    });

    it('should NOT allow Closed → any status', () => {
      const allowed = ALLOWED_TRANSITIONS['Closed'];
      expect(allowed).toHaveLength(0);
    });

    it('should NOT allow Rejected → any status', () => {
      const allowed = ALLOWED_TRANSITIONS['Rejected'];
      expect(allowed).toHaveLength(0);
    });
  });

  describe('createRequest', () => {
    it('should throw AppError if asset is not found', async () => {
      (prisma.asset.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createRequest(userId, orgId, { assetId: 'invalid-asset', issueDescription: 'Broken screen' })
      ).rejects.toThrow(new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND'));
    });

    it('should throw AppError if asset status is blocked (e.g. Disposed)', async () => {
      (prisma.asset.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Disposed' });

      await expect(
        service.createRequest(userId, orgId, { assetId: 'a1', issueDescription: 'Broken screen' })
      ).rejects.toThrow(new AppError('Cannot raise maintenance for asset in "Disposed" status.', 400, 'ASSET_STATUS_BLOCKED'));
    });

    it('should throw AppError if asset already has an active maintenance request', async () => {
      (prisma.asset.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', name: 'Laptop', status: 'Good' });
      mockRepo.findActiveByAsset.mockResolvedValue({ id: 'req-1' } as any);

      await expect(
        service.createRequest(userId, orgId, { assetId: 'a1', issueDescription: 'Broken screen' })
      ).rejects.toThrow(new AppError('Asset "Laptop" already has an active maintenance request (ID: req-1).', 409, 'DUPLICATE_MAINTENANCE_REQUEST'));
    });

    it('should create maintenance request successfully', async () => {
      (prisma.asset.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', name: 'Laptop', status: 'Good', assetTag: 'TAG-1' });
      mockRepo.findActiveByAsset.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'req-2', status: 'Pending' } as any);

      const result = await service.createRequest(userId, orgId, { assetId: 'a1', issueDescription: 'Broken screen', priority: 'High' });

      expect(result.id).toBe('req-2');
      expect(mockRepo.create).toHaveBeenCalled();
    });
  });

  describe('updateRequest', () => {
    it('should throw error if request not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateRequest(userId, orgId, 'invalid-id', { issueDescription: 'Updated description' }, 'Employee')
      ).rejects.toThrow(new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND'));
    });

    it('should throw error if non-raiser employee attempts to update', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'req-1', raisedBy: 'other-user', status: 'Pending' } as any);

      await expect(
        service.updateRequest(userId, orgId, 'req-1', { issueDescription: 'Updated description' }, 'Employee')
      ).rejects.toThrow(new AppError('Forbidden. You can only update your own requests.', 403, 'FORBIDDEN'));
    });

    it('should throw error if updating a request that is not Pending', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'req-1', raisedBy: userId, status: 'Approved' } as any);

      await expect(
        service.updateRequest(userId, orgId, 'req-1', { issueDescription: 'Updated' }, 'Employee')
      ).rejects.toThrow(new AppError('Cannot update a request with status "Approved". Only Pending requests can be updated.', 400, 'INVALID_STATUS_TRANSITION'));
    });
  });

  describe('approveRequest', () => {
    it('should throw error if request not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.approveRequest(userId, orgId, 'invalid-id', {})
      ).rejects.toThrow(new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND'));
    });

    it('should change status to Approved and change asset status to Under Maintenance', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'req-1', assetId: 'a1', status: 'Pending', raisedBy: 'emp-1' } as any);
      (prisma.maintenanceRequest.update as jest.Mock).mockResolvedValue({ id: 'req-1', status: 'Approved', asset: { name: 'Laptop' } });

      const result = await service.approveRequest(userId, orgId, 'req-1', {});

      expect(result.status).toBe('Approved');
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { status: 'Under Maintenance', updatedBy: userId },
      });
    });
  });

  describe('completeMaintenance', () => {
    it('should throw error if request not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.completeMaintenance(userId, orgId, 'invalid-id', { resolutionNotes: 'Fixed' })
      ).rejects.toThrow(new AppError('Maintenance request not found.', 404, 'REQUEST_NOT_FOUND'));
    });

    it('should resolve request and restore asset to Available', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'req-1', assetId: 'a1', status: 'In Progress', raisedBy: 'emp-1' } as any);
      (prisma.maintenanceRequest.update as jest.Mock).mockResolvedValue({ id: 'req-1', status: 'Resolved', asset: { name: 'Laptop' } });

      const result = await service.completeMaintenance(userId, orgId, 'req-1', { resolutionNotes: 'Fixed' });

      expect(result.status).toBe('Resolved');
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { status: 'Available', updatedBy: userId },
      });
    });
  });
});
