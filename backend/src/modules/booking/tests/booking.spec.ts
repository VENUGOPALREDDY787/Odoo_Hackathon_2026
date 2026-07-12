import { BookingRepository } from '../repository/booking.repository';

/**
 * booking.spec.ts — Unit tests for Booking module.
 *
 * Tests covered:
 *  - BookingRepository instantiation
 *  - Conflict detection logic contracts
 */
import { ConflictDetectionService } from '../service/conflict-detection.service';

jest.mock('../repository/booking.repository');

describe('ConflictDetectionService', () => {
  let service: ConflictDetectionService;
  let mockRepo: jest.Mocked<BookingRepository>;

  beforeEach(() => {
    mockRepo = new BookingRepository() as any;
    service = new ConflictDetectionService(mockRepo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call findConflictingBookings on assertNoConflict', async () => {
    mockRepo.findConflictingBookings = jest.fn().mockResolvedValue([]);
    const assetId = 'asset-uuid';
    const start = new Date('2026-08-01T09:00:00Z');
    const end = new Date('2026-08-01T10:00:00Z');
    await service.assertNoConflict(assetId, start, end);
    expect(mockRepo.findConflictingBookings).toHaveBeenCalledWith(assetId, start, end, undefined, undefined);
  });

  it('should throw BOOKING_CONFLICT when overlapping booking exists', async () => {
    const conflictingBooking = {
      id: 'conflict-booking-id',
      startTime: new Date('2026-08-01T09:30:00Z'),
      endTime: new Date('2026-08-01T10:30:00Z'),
      booker: { name: 'John Doe' }
    };
    mockRepo.findConflictingBookings = jest.fn().mockResolvedValue([conflictingBooking]);
    const start = new Date('2026-08-01T09:00:00Z');
    const end = new Date('2026-08-01T10:00:00Z');

    await expect(service.assertNoConflict('asset-uuid', start, end)).rejects.toMatchObject({
      code: 'BOOKING_CONFLICT'
    });
  });
});
