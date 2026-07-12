/**
 * Concurrency Tests: Double Booking Overlap Prevention
 *
 * Validates that ConflictDetectionService correctly rejects any booking
 * that time-overlaps with an existing confirmed booking for the same asset.
 */
import { ConflictDetectionService } from '../service/conflict-detection.service';
import { BookingRepository } from '../repository/booking.repository';
import { AppError } from '../../../core/errors/AppError';
import prisma from '../../../database/db';

jest.mock('../repository/booking.repository');
jest.mock('../../../database/db', () => {
  const localDb = {
    asset: { findFirst: jest.fn() },
    resourceBooking: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  localDb.$transaction.mockImplementation((cb) => cb(localDb));
  return { __esModule: true, default: localDb };
});

describe('Booking Concurrency — Double Booking Prevention', () => {
  let conflictService: ConflictDetectionService;
  let mockRepo: jest.Mocked<BookingRepository>;

  beforeEach(() => {
    mockRepo = new BookingRepository() as any;
    conflictService = new ConflictDetectionService(mockRepo);
    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(prisma));
    jest.clearAllMocks();
  });

  describe('Overlap Detection', () => {
    const assetId = 'asset-1';
    const startTime = new Date('2026-08-01T09:00:00Z');
    const endTime = new Date('2026-08-01T11:00:00Z');

    it('should throw BOOKING_CONFLICT when new booking exactly overlaps existing booking', async () => {
      // Existing booking: 09:00–11:00
      mockRepo.findConflictingBookings.mockResolvedValue([
        { id: 'existing-booking', startTime, endTime, status: 'Upcoming', booker: { name: 'Alice' } } as any,
      ]);

      await expect(
        conflictService.assertNoConflict(assetId, startTime, endTime, undefined)
      ).rejects.toMatchObject({ code: 'BOOKING_CONFLICT', statusCode: 409 });
    });

    it('should throw BOOKING_CONFLICT when new booking partially overlaps (start inside existing)', async () => {
      // Existing: 09:00–11:00. New: 10:00–12:00 (starts inside existing)
      const overlapStart = new Date('2026-08-01T10:00:00Z');
      const overlapEnd = new Date('2026-08-01T12:00:00Z');

      mockRepo.findConflictingBookings.mockResolvedValue([
        { id: 'existing-booking', startTime, endTime, status: 'Upcoming', booker: { name: 'Alice' } } as any,
      ]);

      await expect(
        conflictService.assertNoConflict(assetId, overlapStart, overlapEnd, undefined)
      ).rejects.toMatchObject({ code: 'BOOKING_CONFLICT', statusCode: 409 });
    });

    it('should throw BOOKING_CONFLICT when new booking fully contains an existing booking', async () => {
      // Existing: 09:00–11:00. New: 08:00–12:00 (surrounds existing)
      const wideStart = new Date('2026-08-01T08:00:00Z');
      const wideEnd = new Date('2026-08-01T12:00:00Z');

      mockRepo.findConflictingBookings.mockResolvedValue([
        { id: 'existing-booking', startTime, endTime, status: 'Upcoming', booker: { name: 'Alice' } } as any,
      ]);

      await expect(
        conflictService.assertNoConflict(assetId, wideStart, wideEnd, undefined)
      ).rejects.toMatchObject({ code: 'BOOKING_CONFLICT', statusCode: 409 });
    });

    it('should allow booking that ends exactly when existing booking starts (adjacent, no overlap)', async () => {
      // Adjacent: new booking ends at 09:00 exactly when existing starts
      mockRepo.findConflictingBookings.mockResolvedValue([]);

      await expect(
        conflictService.assertNoConflict(
          assetId,
          new Date('2026-08-01T07:00:00Z'),
          startTime, // 09:00 exactly
          undefined
        )
      ).resolves.not.toThrow();
    });

    it('should allow booking that starts exactly when existing booking ends (adjacent, no overlap)', async () => {
      // Adjacent: new booking starts at 11:00 exactly when existing ends
      mockRepo.findConflictingBookings.mockResolvedValue([]);

      await expect(
        conflictService.assertNoConflict(
          assetId,
          endTime, // 11:00 exactly
          new Date('2026-08-01T13:00:00Z'),
          undefined
        )
      ).resolves.not.toThrow();
    });

    it('should allow concurrent non-overlapping bookings for same asset on different days', async () => {
      mockRepo.findConflictingBookings.mockResolvedValue([]);

      await expect(
        conflictService.assertNoConflict(
          assetId,
          new Date('2026-08-02T09:00:00Z'),
          new Date('2026-08-02T11:00:00Z'),
          undefined
        )
      ).resolves.not.toThrow();
    });
  });
});
