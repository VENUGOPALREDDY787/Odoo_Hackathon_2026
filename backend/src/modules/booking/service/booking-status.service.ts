import prisma from '../../../database/db';
import { emitToOrg, emitToUser } from '../../../utils/socket';
import redis from '../../../core/redis/client';
import { REDIS_KEYS } from '../constants/booking.constants';

/**
 * BookingStatusService — Automated lifecycle status transitions.
 *
 * Runs on the cron scheduler (every minute) and handles:
 *  1. Upcoming  → Ongoing   when startTime ≤ now
 *  2. Ongoing   → Completed when endTime   ≤ now
 *
 * Each transition:
 *  - Runs inside a Prisma transaction for atomicity
 *  - Updates parent asset status accordingly
 *  - Writes activity logs
 *  - Sends in-app notifications
 *  - Emits real-time socket events
 *  - Invalidates relevant Redis calendar caches
 *
 * Integration:
 *  - Called from cron.ts (replaces the inline booking cron logic)
 *  - Integrates with Asset model to set status Reserved/Available
 */
export class BookingStatusService {

  /**
   * Transitions all qualifying Upcoming bookings to Ongoing.
   */
  async processStartingBookings(): Promise<number> {
    const now = new Date();

    const bookings = await prisma.resourceBooking.findMany({
      where: { status: 'Upcoming', startTime: { lte: now } },
      include: {
        asset: { select: { id: true, name: true, status: true, organizationId: true } },
        booker: { select: { id: true, name: true } }
      }
    });

    for (const booking of bookings) {
      await prisma.$transaction(async (tx) => {
        await tx.resourceBooking.update({
          where: { id: booking.id },
          data: { status: 'Ongoing' }
        });

        // Mark asset as Reserved during the booking window
        if (booking.asset.status === 'Available') {
          await tx.asset.update({
            where: { id: booking.assetId },
            data: { status: 'Reserved' }
          });
        }

        await tx.notification.create({
          data: {
            organizationId: booking.organizationId,
            recipientId: booking.bookedBy,
            title: 'Booking Started',
            message: `Your reservation for "${booking.asset.name}" is now in progress.`,
            type: 'Booking Started',
            relatedEntityType: 'ResourceBooking',
            relatedEntityId: booking.id
          }
        });

        await tx.activityLog.create({
          data: {
            organizationId: booking.organizationId,
            userId: null,
            action: 'BOOKING_STARTED',
            entityType: 'ResourceBooking',
            entityId: booking.id,
            details: { assetId: booking.assetId }
          }
        });
      });

      emitToOrg(booking.organizationId, 'booking.updated', { bookingId: booking.id, status: 'Ongoing' });
      emitToUser(booking.bookedBy, 'notification', { title: 'Booking Started', bookingId: booking.id });
      await this.invalidateDayCache(booking.organizationId, booking.startTime);
    }

    return bookings.length;
  }

  /**
   * Transitions all qualifying Ongoing bookings to Completed.
   */
  async processEndingBookings(): Promise<number> {
    const now = new Date();

    const bookings = await prisma.resourceBooking.findMany({
      where: { status: 'Ongoing', endTime: { lte: now } },
      include: {
        asset: { select: { id: true, name: true, status: true, organizationId: true } },
        booker: { select: { id: true } }
      }
    });

    for (const booking of bookings) {
      await prisma.$transaction(async (tx) => {
        await tx.resourceBooking.update({
          where: { id: booking.id },
          data: { status: 'Completed' }
        });

        // Revert asset to Available only if no other active bookings remain
        const activeCount = await tx.resourceBooking.count({
          where: {
            assetId: booking.assetId,
            status: { in: ['Upcoming', 'Ongoing'] },
            id: { not: booking.id }
          }
        });

        if (activeCount === 0 && booking.asset.status === 'Reserved') {
          await tx.asset.update({
            where: { id: booking.assetId },
            data: { status: 'Available' }
          });
        }

        await tx.notification.create({
          data: {
            organizationId: booking.organizationId,
            recipientId: booking.bookedBy,
            title: 'Booking Completed',
            message: `Your reservation for "${booking.asset.name}" has ended. Thank you!`,
            type: 'Booking Completed',
            relatedEntityType: 'ResourceBooking',
            relatedEntityId: booking.id
          }
        });

        await tx.activityLog.create({
          data: {
            organizationId: booking.organizationId,
            userId: null,
            action: 'BOOKING_COMPLETED',
            entityType: 'ResourceBooking',
            entityId: booking.id,
            details: { assetId: booking.assetId }
          }
        });
      });

      emitToOrg(booking.organizationId, 'booking.completed', { bookingId: booking.id });
      emitToOrg(booking.organizationId, 'dashboard.updated', { type: 'kpi_update' });
      await this.invalidateDayCache(booking.organizationId, booking.endTime);
    }

    return bookings.length;
  }

  private async invalidateDayCache(orgId: string, date: Date): Promise<void> {
    try {
      const dayStr = date.toISOString().split('T')[0];
      await Promise.all([
        redis.del(REDIS_KEYS.calendarDay(orgId, dayStr)),
        redis.del(REDIS_KEYS.todayBookings(orgId)),
        redis.del(REDIS_KEYS.upcomingBookings(orgId))
      ]);
    } catch {
      // Non-fatal
    }
  }
}

export const bookingStatusService = new BookingStatusService();
export default bookingStatusService;
