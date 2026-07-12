import prisma from '../../../database/db';
import { BookingRepository } from '../repository/booking.repository';
import { ConflictDetectionService } from './conflict-detection.service';
import { CreateBookingDTO, UpdateBookingDTO, RescheduleBookingDTO } from '../dto/booking.dto';
import { AppError } from '../../../core/errors/AppError';
import { emitToOrg, emitToUser } from '../../../utils/socket';
import { REDIS_KEYS } from '../constants/booking.constants';
import redis from '../../../core/redis/client';

/**
 * BookingService — Core business logic for the Resource Booking module.
 *
 * Every state-mutating operation runs inside a Prisma interactive transaction.
 * Conflict detection is performed INSIDE the transaction with a SELECT FOR UPDATE
 * row lock to prevent race conditions under concurrent load.
 *
 * Integration:
 *  - BookingRepository: data persistence layer
 *  - ConflictDetectionService: overlap validation
 *  - Redis: calendar/availability cache invalidation
 *  - Socket.IO: real-time calendar & dashboard updates
 *  - ActivityLog: full audit trail
 *  - Notification: in-app alerts
 */
export class BookingService {
  private bookingRepository: BookingRepository;
  private conflictDetectionService: ConflictDetectionService;

  constructor(
    bookingRepository = new BookingRepository(),
    conflictDetection = new ConflictDetectionService()
  ) {
    this.bookingRepository = bookingRepository;
    this.conflictDetectionService = conflictDetection;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new booking inside a transaction with row-level locking.
   *
   * Steps:
   *  1. Validate asset is bookable (isShared flag + status check)
   *  2. Lock asset row using SELECT FOR UPDATE to prevent concurrent modifications
   *  3. Run overlap conflict detection inside the locked transaction
   *  4. Create booking record
   *  5. Write activity log + notification
   *  6. Invalidate Redis calendar cache
   *  7. Emit socket events
   */
  async createBooking(userId: string, orgId: string, dto: CreateBookingDTO) {
    // Business validation BEFORE entering transaction
    await this.conflictDetectionService.assertAssetIsBookable(dto.assetId, orgId);

    if (dto.bookedOnBehalfOfDeptId) {
      const dept = await prisma.department.findFirst({
        where: { id: dto.bookedOnBehalfOfDeptId, organizationId: orgId }
      });
      if (!dept) throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    return prisma.$transaction(async (tx) => {
      // 1. SELECT FOR UPDATE — row-level lock prevents concurrent checkout of same asset
      await tx.$queryRawUnsafe<any[]>(
        `SELECT id FROM assets WHERE id = ? FOR UPDATE`,
        dto.assetId
      );

      // 2. Conflict detection inside the lock window
      await this.conflictDetectionService.assertNoConflict(dto.assetId, startTime, endTime, undefined, tx);

      // 3. Create booking
      const booking = await this.bookingRepository.create(
        {
          organization: { connect: { id: orgId } },
          asset: { connect: { id: dto.assetId } },
          booker: { connect: { id: userId } },
          department: dto.bookedOnBehalfOfDeptId ? { connect: { id: dto.bookedOnBehalfOfDeptId } } : undefined,
          startTime,
          endTime,
          notes: dto.notes ?? null,
          status: 'Upcoming',
          createdBy: userId
        },
        tx
      );

      // 4. Write activity log (within transaction for rollback safety)
      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'BOOKING_CREATED',
          entityType: 'ResourceBooking',
          entityId: booking.id,
          details: {
            assetId: dto.assetId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          }
        }
      });

      // 5. Write in-app notification to the booker
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: userId,
          title: 'Booking Confirmed',
          message: `Your reservation for "${(booking as any).asset.name}" is confirmed from ${startTime.toLocaleString()} to ${endTime.toLocaleString()}.`,
          type: 'Booking Confirmed',
          relatedEntityType: 'ResourceBooking',
          relatedEntityId: booking.id
        }
      });

      return booking;
    }).then(async (booking) => {
      // Post-transaction: cache invalidation + socket emissions
      await this.invalidateCalendarCache(orgId, startTime);
      emitToOrg(orgId, 'booking.created', { bookingId: booking.id });
      emitToOrg(orgId, 'calendar.updated', { assetId: dto.assetId });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      emitToUser(userId, 'notification', { title: 'Booking Confirmed' });
      return booking;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE (metadata only)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Updates booking notes/department — does NOT move the time window.
   * Use rescheduleBooking for time changes.
   */
  async updateBooking(userId: string, orgId: string, bookingId: string, dto: UpdateBookingDTO) {
    const booking = await this.bookingRepository.findById(bookingId, orgId);
    if (!booking) throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND');

    this.assertBookingIsEditable(booking);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.resourceBooking.update({
        where: { id: bookingId },
        data: {
          notes: dto.notes ?? booking.notes,
          bookedOnBehalfOfDeptId: dto.bookedOnBehalfOfDeptId ?? booking.bookedOnBehalfOfDeptId,
          updatedBy: userId
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          booker: { select: { id: true, name: true } }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'BOOKING_UPDATED',
          entityType: 'ResourceBooking',
          entityId: bookingId,
          details: JSON.parse(JSON.stringify(dto))
        }
      });

      return updated;
    }).then(async (updated) => {
      emitToOrg(orgId, 'booking.updated', { bookingId });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESCHEDULE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Moves a booking to a new time window.
   * Performs conflict detection excluding itself (so self-overlap doesn't trigger false positive).
   * Must be run inside a transaction with row lock.
   */
  async rescheduleBooking(userId: string, orgId: string, bookingId: string, dto: RescheduleBookingDTO) {
    const booking = await this.bookingRepository.findById(bookingId, orgId);
    if (!booking) throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND');

    this.assertBookingIsEditable(booking);

    const newStart = new Date(dto.startTime);
    const newEnd = new Date(dto.endTime);

    return prisma.$transaction(async (tx) => {
      // Row lock on asset
      await tx.$queryRawUnsafe<any[]>(
        `SELECT id FROM assets WHERE id = ? FOR UPDATE`,
        booking.assetId
      );

      // Conflict check excluding self
      await this.conflictDetectionService.assertNoConflict(booking.assetId, newStart, newEnd, bookingId, tx);

      const updated = await tx.resourceBooking.update({
        where: { id: bookingId },
        data: {
          startTime: newStart,
          endTime: newEnd,
          reminderSent: false, // reset reminder flag after reschedule
          updatedBy: userId
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          booker: { select: { id: true, name: true } }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'BOOKING_RESCHEDULED',
          entityType: 'ResourceBooking',
          entityId: bookingId,
          details: {
            previousStart: booking.startTime,
            previousEnd: booking.endTime,
            newStart: newStart.toISOString(),
            newEnd: newEnd.toISOString(),
            reason: dto.reason
          }
        }
      });

      // Notify booker
      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: userId,
          title: 'Booking Rescheduled',
          message: `Your booking for "${(updated as any).asset.name}" has been rescheduled to ${newStart.toLocaleString()} – ${newEnd.toLocaleString()}.`,
          type: 'Booking Updated',
          relatedEntityType: 'ResourceBooking',
          relatedEntityId: bookingId
        }
      });

      return updated;
    }).then(async (updated) => {
      await this.invalidateCalendarCache(orgId, newStart);
      await this.invalidateCalendarCache(orgId, booking.startTime);
      emitToOrg(orgId, 'booking.updated', { bookingId });
      emitToOrg(orgId, 'calendar.updated', { assetId: booking.assetId });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Cancels an upcoming or ongoing booking.
   * After cancellation, checks if the asset can be reverted to Available.
   */
  async cancelBooking(userId: string, orgId: string, bookingId: string, role: string) {
    const booking = await this.bookingRepository.findById(bookingId, orgId);
    if (!booking) throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND');

    if (!['Upcoming', 'Ongoing'].includes(booking.status)) {
      throw new AppError(`Cannot cancel a booking with status "${booking.status}".`, 400, 'INVALID_STATUS_TRANSITION');
    }

    // RBAC: Employees may only cancel their own bookings
    if (role === 'Employee' && booking.bookedBy !== userId) {
      throw new AppError('Forbidden. You can only cancel your own bookings.', 403, 'FORBIDDEN');
    }

    return prisma.$transaction(async (tx) => {
      const cancelled = await tx.resourceBooking.update({
        where: { id: bookingId },
        data: { status: 'Cancelled', updatedBy: userId },
        include: { asset: { select: { id: true, name: true, assetTag: true, status: true } } }
      });

      // Revert asset status if no other active bookings remain
      const activeCount = await tx.resourceBooking.count({
        where: {
          assetId: booking.assetId,
          status: { in: ['Upcoming', 'Ongoing'] },
          id: { not: bookingId }
        }
      });

      if (activeCount === 0 && (cancelled as any).asset.status === 'Reserved') {
        await tx.asset.update({
          where: { id: booking.assetId },
          data: { status: 'Available' }
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'BOOKING_CANCELLED',
          entityType: 'ResourceBooking',
          entityId: bookingId,
          details: { assetId: booking.assetId }
        }
      });

      await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: booking.bookedBy,
          title: 'Booking Cancelled',
          message: `Your booking for "${(cancelled as any).asset.name}" has been cancelled.`,
          type: 'Booking Cancelled',
          relatedEntityType: 'ResourceBooking',
          relatedEntityId: bookingId
        }
      });

      return cancelled;
    }).then(async (cancelled) => {
      await this.invalidateCalendarCache(orgId, booking.startTime);
      emitToOrg(orgId, 'booking.cancelled', { bookingId });
      emitToOrg(orgId, 'calendar.updated', { assetId: booking.assetId });
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
      emitToUser(booking.bookedBy, 'notification', { title: 'Booking Cancelled' });
      return cancelled;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────────

  async getBooking(orgId: string, bookingId: string) {
    const booking = await this.bookingRepository.findById(bookingId, orgId);
    if (!booking) throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND');
    return booking;
  }

  async listBookings(userId: string, orgId: string, role: string, query: Record<string, any>) {
    const page = parseInt(query.page as string, 10) || 1;
    const limit = Math.min(parseInt(query.limit as string, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filters: any = {};

    // Status filter
    if (query.status) filters.status = query.status;
    if (query.assetId) filters.assetId = query.assetId;
    if (query.deptId) filters.bookedOnBehalfOfDeptId = query.deptId;

    // RBAC scoping
    if (role === 'Employee') {
      filters.bookedBy = userId;
    }

    const [total, bookings] = await Promise.all([
      this.bookingRepository.count(orgId, filters),
      this.bookingRepository.findMany(orgId, filters, skip, limit)
    ]);

    return {
      bookings,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Asserts that a booking can still be mutated (not completed/cancelled).
   * Also enforces RBAC: employees can only edit their own bookings.
   */
  private assertBookingIsEditable(booking: any): void {
    if (['Completed', 'Cancelled', 'Expired'].includes(booking.status)) {
      throw new AppError(
        `Cannot modify a booking with status "${booking.status}".`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Invalidates Redis calendar cache keys for the given date.
   */
  private async invalidateCalendarCache(orgId: string, date: Date): Promise<void> {
    try {
      const dayStr = date.toISOString().split('T')[0];
      const weekStr = this.getWeekKey(date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      await Promise.all([
        redis.del(REDIS_KEYS.calendarDay(orgId, dayStr)),
        redis.del(REDIS_KEYS.calendarWeek(orgId, weekStr)),
        redis.del(REDIS_KEYS.calendarMonth(orgId, monthStr)),
        redis.del(REDIS_KEYS.todayBookings(orgId)),
        redis.del(REDIS_KEYS.upcomingBookings(orgId))
      ]);
    } catch (err) {
      // Non-fatal: cache invalidation failure should not break the request
      console.error('[Booking] Redis cache invalidation failed:', err);
    }
  }

  /**
   * Returns ISO week string (YYYY-Www) for a given date.
   */
  private getWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
}

export default BookingService;
