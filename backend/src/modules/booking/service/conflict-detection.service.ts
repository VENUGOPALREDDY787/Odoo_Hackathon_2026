import prisma from '../../../database/db';
import { BookingRepository } from '../repository/booking.repository';
import { AppError } from '../../../core/errors/AppError';
import { NON_BOOKABLE_ASSET_STATUSES } from '../constants/booking.constants';

/**
 * ConflictDetectionService — Dedicated service for booking overlap validation.
 *
 * This service is the single source of truth for conflict checking.
 * It must be called INSIDE a Prisma interactive transaction to guarantee
 * that the conflict check and booking creation are atomic.
 *
 * The overlap algorithm uses Allen's Interval Algebra:
 *   Two intervals [S1,E1] and [S2,E2] overlap if:
 *     S1 < E2 AND E1 > S2
 *
 * Edge case: Adjacent bookings (S2 = E1) do NOT conflict. This allows
 * back-to-back bookings (10:00–11:00 followed by 11:00–12:00).
 */
export class ConflictDetectionService {
  private bookingRepository: BookingRepository;

  constructor(bookingRepository = new BookingRepository()) {
    this.bookingRepository = bookingRepository;
  }

  /**
   * Validates that an asset is bookable in principle (flag + status checks).
   * Throws AppError if the asset cannot be booked.
   */
  async assertAssetIsBookable(assetId: string, orgId: string): Promise<void> {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId: orgId, deletedAt: null }
    });

    if (!asset) {
      throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
    }

    if (!asset.isShared) {
      throw new AppError(
        `Asset "${asset.name}" (${asset.assetTag}) is not marked as a shared/bookable resource.`,
        400,
        'ASSET_NOT_BOOKABLE'
      );
    }

    if ((NON_BOOKABLE_ASSET_STATUSES as readonly string[]).includes(asset.status)) {
      throw new AppError(
        `Asset "${asset.name}" (${asset.assetTag}) cannot be booked. Current status: ${asset.status}.`,
        409,
        'ASSET_UNAVAILABLE'
      );
    }
  }

  /**
   * Checks for overlapping bookings for a given asset within the proposed time window.
   * Must be called inside a transaction with a SELECT FOR UPDATE row lock for full safety.
   *
   * @param assetId - The target asset
   * @param startTime - Proposed booking start
   * @param endTime - Proposed booking end
   * @param excludeBookingId - Optional booking ID to exclude (for reschedule scenarios)
   * @param tx - Prisma transaction client
   */
  async assertNoConflict(
    assetId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
    tx?: any
  ): Promise<void> {
    const conflicts = await this.bookingRepository.findConflictingBookings(
      assetId,
      startTime,
      endTime,
      excludeBookingId,
      tx
    );

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      throw new AppError(
        `Booking conflict detected. The resource is already booked from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()} by ${(conflict as any).booker?.name ?? 'another user'}.`,
        409,
        'BOOKING_CONFLICT',
        {
          conflictingBookingId: conflict.id,
          conflictStart: conflict.startTime,
          conflictEnd: conflict.endTime
        }
      );
    }
  }
}

export const conflictDetectionService = new ConflictDetectionService();
export default conflictDetectionService;
