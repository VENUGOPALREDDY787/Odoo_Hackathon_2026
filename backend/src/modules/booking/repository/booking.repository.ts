import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

/**
 * BookingRepository — Pure data-access layer for ResourceBooking records.
 *
 * Responsibilities:
 *  - All direct Prisma queries for resource_bookings table
 *  - Optimized joins to avoid N+1
 *  - Cursor-based and offset pagination support
 *  - Supports transactional contexts (tx parameter)
 *
 * No business logic lives here.
 */
export class BookingRepository {
  /** Standard include shape reused across queries to avoid N+1 */
  private readonly defaultInclude = {
    asset: {
      select: { id: true, name: true, assetTag: true, status: true, location: true, isShared: true }
    },
    booker: {
      select: { id: true, name: true, email: true }
    },
    department: {
      select: { id: true, name: true }
    }
  };

  /**
   * Fetches a single booking by ID within an organization.
   */
  async findById(id: string, orgId: string) {
    return prisma.resourceBooking.findFirst({
      where: { id, organizationId: orgId },
      include: this.defaultInclude
    });
  }

  /**
   * Fetches a single booking by ID — used inside transactions where tx context is provided.
   */
  async findByIdWithTx(id: string, orgId: string, tx: Prisma.TransactionClient) {
    return tx.resourceBooking.findFirst({
      where: { id, organizationId: orgId },
      include: this.defaultInclude
    });
  }

  /**
   * Creates a new booking record. Supports transactional context.
   */
  async create(data: Prisma.ResourceBookingCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.resourceBooking.create({
      data,
      include: this.defaultInclude
    });
  }

  /**
   * Updates a booking by ID. Supports transactional context.
   */
  async update(id: string, data: Prisma.ResourceBookingUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.resourceBooking.update({
      where: { id },
      data,
      include: this.defaultInclude
    });
  }

  /**
   * Core conflict detection query.
   * Checks whether any active booking for the given asset overlaps with [startTime, endTime].
   *
   * Overlap logic (Allen's interval algebra):
   *   Conflict when: existingStart < newEnd AND existingEnd > newStart
   *
   * Excludes a specific bookingId to support reschedule scenarios (exclude self).
   */
  async findConflictingBookings(
    assetId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.resourceBooking.findMany({
      where: {
        assetId,
        status: { in: ['Upcoming', 'Ongoing'] },
        startTime: { lt: endTime },   // existing starts before new ends
        endTime: { gt: startTime },   // existing ends after new starts
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {})
      },
      include: {
        booker: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Lists bookings matching dynamic filter criteria with offset pagination.
   */
  async findMany(
    orgId: string,
    filters: Prisma.ResourceBookingWhereInput = {},
    skip = 0,
    take = 20,
    orderBy: Prisma.ResourceBookingOrderByWithRelationInput = { startTime: 'asc' }
  ) {
    return prisma.resourceBooking.findMany({
      where: { organizationId: orgId, ...filters },
      include: this.defaultInclude,
      skip,
      take,
      orderBy
    });
  }

  /**
   * Returns total count for a given filter set (used in pagination metadata).
   */
  async count(orgId: string, filters: Prisma.ResourceBookingWhereInput = {}): Promise<number> {
    return prisma.resourceBooking.count({
      where: { organizationId: orgId, ...filters }
    });
  }

  /**
   * Calendar range query — fetches all bookings within a date window for a given org.
   * Optimized for calendar rendering (daily / weekly / monthly views).
   */
  async findInDateRange(orgId: string, from: Date, to: Date, assetId?: string, employeeId?: string, deptId?: string) {
    return prisma.resourceBooking.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['Upcoming', 'Ongoing', 'Completed'] },
        startTime: { lt: to },
        endTime: { gt: from },
        ...(assetId ? { assetId } : {}),
        ...(employeeId ? { bookedBy: employeeId } : {}),
        ...(deptId ? { bookedOnBehalfOfDeptId: deptId } : {})
      },
      include: this.defaultInclude,
      orderBy: { startTime: 'asc' }
    });
  }

  /**
   * Fetches bookings whose startTime falls within the next `minutes` minutes.
   * Used by the reminder cron job.
   */
  async findUpcomingForReminder(now: Date, minutesAhead: number) {
    const reminderWindow = new Date(now.getTime() + minutesAhead * 60 * 1000);
    return prisma.resourceBooking.findMany({
      where: {
        status: 'Upcoming',
        startTime: { gte: now, lte: reminderWindow },
        reminderSent: false
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, location: true } },
        booker: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * Marks a booking's reminderSent flag to true so cron doesn't re-notify.
   */
  async markReminderSent(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.resourceBooking.update({
      where: { id },
      data: { reminderSent: true } as any
    });
  }
}

export default BookingRepository;
