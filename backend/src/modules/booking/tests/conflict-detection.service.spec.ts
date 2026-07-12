import { ConflictDetectionService } from '../service/conflict-detection.service';
import { BookingRepository } from '../repository/booking.repository';
import { prismaMock } from '../../../tests/mocks/prisma.mock';
import { AppError } from '../../../core/errors/AppError';

describe('ConflictDetectionService', () => {
  let conflictDetectionService: ConflictDetectionService;
  let bookingRepoMock: jest.Mocked<BookingRepository>;

  beforeEach(() => {
    bookingRepoMock = {
      findConflictingBookings: jest.fn(),
    } as unknown as jest.Mocked<BookingRepository>;

    conflictDetectionService = new ConflictDetectionService(bookingRepoMock);
  });

  describe('assertAssetIsBookable', () => {
    const orgId = 'org-1';
    const assetId = 'asset-1';

    it('should pass if asset exists, is shared, and has bookable status', async () => {
      prismaMock.asset.findFirst.mockResolvedValue({
        id: assetId,
        organizationId: orgId,
        isShared: true,
        status: 'Available',
        name: 'Projector',
      });

      await expect(
        conflictDetectionService.assertAssetIsBookable(assetId, orgId)
      ).resolves.not.toThrow();
    });

    it('should throw AppError if asset does not exist', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(
        conflictDetectionService.assertAssetIsBookable(assetId, orgId)
      ).rejects.toThrow(new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND'));
    });

    it('should throw AppError if asset is not shared', async () => {
      prismaMock.asset.findFirst.mockResolvedValue({
        id: assetId,
        organizationId: orgId,
        isShared: false,
        status: 'Available',
        name: 'Personal Laptop',
      });

      await expect(
        conflictDetectionService.assertAssetIsBookable(assetId, orgId)
      ).rejects.toThrow(/not marked as a shared\/bookable resource/);
    });

    it('should throw AppError if asset status is non-bookable', async () => {
      prismaMock.asset.findFirst.mockResolvedValue({
        id: assetId,
        organizationId: orgId,
        isShared: true,
        status: 'Under Maintenance',
        name: 'Projector',
      });

      await expect(
        conflictDetectionService.assertAssetIsBookable(assetId, orgId)
      ).rejects.toThrow(/cannot be booked/);
    });
  });

  describe('assertNoConflict', () => {
    const assetId = 'asset-1';
    const startTime = new Date('2026-07-20T10:00:00Z');
    const endTime = new Date('2026-07-20T11:00:00Z');

    it('should pass if no conflicting bookings are found', async () => {
      bookingRepoMock.findConflictingBookings.mockResolvedValue([]);

      await expect(
        conflictDetectionService.assertNoConflict(assetId, startTime, endTime)
      ).resolves.not.toThrow();

      expect(bookingRepoMock.findConflictingBookings).toHaveBeenCalledWith(
        assetId,
        startTime,
        endTime,
        undefined,
        undefined
      );
    });

    it('should throw AppError if conflicting booking is found', async () => {
      const conflictStart = new Date('2026-07-20T10:30:00Z');
      const conflictEnd = new Date('2026-07-20T11:30:00Z');
      
      bookingRepoMock.findConflictingBookings.mockResolvedValue([
        {
          id: 'booking-conflict-1',
          startTime: conflictStart,
          endTime: conflictEnd,
          booker: { name: 'John Doe' }
        } as any
      ]);

      await expect(
        conflictDetectionService.assertNoConflict(assetId, startTime, endTime)
      ).rejects.toThrow(/Booking conflict detected/);
    });
  });
});
