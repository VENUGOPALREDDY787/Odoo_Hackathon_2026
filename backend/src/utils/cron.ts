import cron from 'node-cron';
import prisma from '../database/db';
import * as socket from './socket';
import { overdueService } from '../modules/allocation/service/overdue.service';

/**
 * Initializes and schedules background cron jobs.
 */
export function startOverdueCron(): void {
  // Run checks every 5 minutes in development
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron Job] Checking for overdue allocations and resource booking states...');
    const now = new Date();

    try {
      // -----------------------------------------------------------------
      // 1. Process Overdue Allocations (Scoped by Active Organizations)
      // -----------------------------------------------------------------
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        await overdueService.checkOverdueAllocations(org.id);
      }

      // -----------------------------------------------------------------
      // 2. Process Resource Bookings: Upcoming -> Ongoing
      // -----------------------------------------------------------------
      const bookingsToOngoing = await prisma.resourceBooking.findMany({
        where: {
          status: 'Upcoming',
          startTime: { lte: now }
        },
        include: {
          asset: true
        }
      });

      for (const booking of bookingsToOngoing) {
        await prisma.resourceBooking.update({
          where: { id: booking.id },
          data: { status: 'Ongoing' }
        });

        // Flip parent asset state to Reserved if it is Available
        if (booking.asset.status === 'Available') {
          await prisma.asset.update({
            where: { id: booking.assetId },
            data: { status: 'Reserved' }
          });
        }

        // Notify the booker
        const notif = await prisma.notification.create({
          data: {
            organizationId: booking.organizationId,
            recipientId: booking.bookedBy,
            title: 'Booking In Progress',
            message: `Your reservation for shared resource "${booking.asset.name}" has officially started.`,
            type: 'Booking confirmed',
            relatedEntityType: 'Booking',
            relatedEntityId: booking.id
          }
        });
        socket.emitToUser(booking.bookedBy, 'notification', notif);

        // Broadcast updates to the organization (to update calendar/UI slots)
        socket.emitToOrg(booking.organizationId, 'booking_update', { bookingId: booking.id, status: 'Ongoing' });
        socket.emitToOrg(booking.organizationId, 'kpi_update', { type: 'booking' });
      }

      // -----------------------------------------------------------------
      // 3. Process Resource Bookings: Ongoing -> Completed
      // -----------------------------------------------------------------
      const bookingsToCompleted = await prisma.resourceBooking.findMany({
        where: {
          status: 'Ongoing',
          endTime: { lte: now }
        },
        include: {
          asset: true
        }
      });

      for (const booking of bookingsToCompleted) {
        await prisma.resourceBooking.update({
          where: { id: booking.id },
          data: { status: 'Completed' }
        });

        // Revert parent asset status to Available if no other active/ongoing bookings exist
        const activeCount = await prisma.resourceBooking.count({
          where: {
            assetId: booking.assetId,
            status: { in: ['Ongoing', 'Upcoming'] }
          }
        });

        if (activeCount === 0 && booking.asset.status === 'Reserved') {
          await prisma.asset.update({
            where: { id: booking.assetId },
            data: { status: 'Available' }
          });
        }

        // Notify the booker
        const notif = await prisma.notification.create({
          data: {
            organizationId: booking.organizationId,
            recipientId: booking.bookedBy,
            title: 'Booking Concluded',
            message: `Your reservation for shared resource "${booking.asset.name}" has completed.`,
            type: 'Booking confirmed',
            relatedEntityType: 'Booking',
            relatedEntityId: booking.id
          }
        });
        socket.emitToUser(booking.bookedBy, 'notification', notif);

        // Broadcast update signals
        socket.emitToOrg(booking.organizationId, 'booking_update', { bookingId: booking.id, status: 'Completed' });
        socket.emitToOrg(booking.organizationId, 'kpi_update', { type: 'booking' });
      }

    } catch (error) {
      console.error('[Cron Job Error] Error executing scheduled checks:', error);
    }
  });
}
