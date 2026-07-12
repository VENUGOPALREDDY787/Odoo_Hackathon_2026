import cron from 'node-cron';
import prisma from '../database/db';
import { getNotificationQueue, getReminderQueue } from '../core/queue/queue.client';
import { bookingStatusService } from '../modules/booking/service/booking-status.service';
import logger from '../config/logger';

/**
 * startOverdueCron — Registers all background scheduled jobs.
 *
 * OPTIMIZED vs. original:
 *  - Eliminated N+1 pattern: no more "find all orgs then loop per org"
 *  - All DB operations use batch queries (findMany across ALL orgs in one query)
 *  - Heavy operations dispatched to BullMQ workers, not inline
 *  - Org IDs fetched once per cron cycle, not per-service-call
 *
 * Schedule Map:
 *   every-1-min   → booking status transitions (inline — fast)
 *   every-1-min   → booking reminders (enqueue to BullMQ)
 *   every-5-min   → overdue allocation scan + enqueue notifications
 *   every-60-min  → maintenance overdue reminders (enqueue to BullMQ)
 *   every-65-min  → audit overdue detection (enqueue to BullMQ)
 *   every-midnight→ notification archival (inline updateMany — single query)
 */
export function startOverdueCron(): void {

  // ─── Every Minute: Booking Status Transitions ────────────────────────────
  // Inline — fast DB batch updates, no per-org looping needed.
  cron.schedule('*/1 * * * *', async () => {
    try {
      // Single batch query — transitions ALL orgs' bookings at once
      const [started, completed] = await Promise.all([
        bookingStatusService.processStartingBookings(),
        bookingStatusService.processEndingBookings(),
      ]);

      if (started > 0) logger.info(`[Cron] ${started} booking(s) → Ongoing.`);
      if (completed > 0) logger.info(`[Cron] ${completed} booking(s) → Completed.`);
    } catch (err: any) {
      logger.error('[Cron] Booking status transition error:', err.message);
    }
  });

  // ─── Every Minute: Booking Reminders (via BullMQ) ─────────────────────────
  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();
      const reminderWindow = new Date(now.getTime() + 30 * 60 * 1000); // 30 min ahead

      // Single query across ALL orgs — no per-org loop
      const upcoming = await prisma.resourceBooking.findMany({
        where: {
          status: 'Upcoming',
          startTime: { gte: now, lte: reminderWindow },
          reminderSent: false,
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true, location: true } },
          booker: { select: { id: true, name: true, email: true, organizationId: true } },
        },
      });

      if (!upcoming.length) return;

      const reminderQueue = getReminderQueue();
      const jobs = upcoming.map(booking => ({
        name: 'booking-reminder',
        data: {
          type: 'booking' as const,
          orgId: booking.organizationId,
          recipientId: booking.bookedBy,
          title: `Reminder: Booking starts in 30 minutes`,
          message: `Your booking for ${booking.asset?.name} (${booking.asset?.assetTag}) starts at ${booking.startTime.toLocaleTimeString()}.`,
          relatedEntityId: booking.id,
          relatedEntityType: 'ResourceBooking',
          recipientEmail: booking.booker.email,
          recipientName: booking.booker.name,
        },
      }));

      // Batch insert all reminders into queue in one operation
      await reminderQueue.addBulk(jobs);

      // Mark all as reminded in one batch updateMany
      await prisma.resourceBooking.updateMany({
        where: { id: { in: upcoming.map(b => b.id) } },
        data: { reminderSent: true } as any,
      });

      logger.info(`[Cron] ${upcoming.length} booking reminder(s) queued.`);
    } catch (err: any) {
      logger.error('[Cron] Booking reminder error:', err.message);
    }
  });

  // ─── Every 5 Minutes: Overdue Allocation Detection ────────────────────────
  // OPTIMIZED: One query across ALL orgs instead of per-org loop.
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Single batch query across all orgs — finds ALL overdue allocations
      const overdue = await prisma.allocation.findMany({
        where: {
          status: 'Active',
          expectedReturnDate: { lt: now },
          actualReturnDate: null,
          deletedAt: null,
        },
        select: {
          id: true,
          organizationId: true,
          assetId: true,
          employeeId: true,
          expectedReturnDate: true,
          asset: { select: { name: true, assetTag: true } },
          employee: { select: { id: true, name: true, email: true } },
        },
      });

      if (!overdue.length) return;

      // Batch update all overdue allocations status in one query
      await prisma.allocation.updateMany({
        where: { id: { in: overdue.map(a => a.id) } },
        data: { status: 'Overdue' },
      });

      // Enqueue notifications for all employees in one batch
      const notifQueue = getNotificationQueue();
      const notifJobs = overdue
        .filter(a => a.employee)
        .map(a => ({
          name: 'overdue-allocation',
          data: {
            orgId: a.organizationId,
            recipientId: a.employee!.id,
            title: 'Asset Return Overdue',
            message: `Your allocation of ${a.asset?.name} (${a.asset?.assetTag}) was due on ${a.expectedReturnDate?.toLocaleDateString()}. Please return it immediately.`,
            type: 'Allocation Overdue',
            relatedEntityType: 'Allocation',
            relatedEntityId: a.id,
            recipientEmail: a.employee!.email,
            recipientName: a.employee!.name,
          },
        }));

      if (notifJobs.length) {
        await notifQueue.addBulk(notifJobs);
      }

      logger.info(`[Cron] ${overdue.length} overdue allocation(s) marked + notifications queued.`);
    } catch (err: any) {
      logger.error('[Cron] Overdue allocation error:', err.message);
    }
  });

  // ─── Every Hour: Maintenance Overdue Reminders (via BullMQ) ───────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();

      // Single cross-org query instead of per-org loop
      const overdue = await prisma.maintenanceRequest.findMany({
        where: {
          status: { in: ['Approved', 'Technician Assigned', 'In Progress'] },
          estimatedCompletionDate: { lt: now },
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          raiser: { select: { id: true, name: true, email: true } },
        },
      });

      if (!overdue.length) return;

      const reminderQueue = getReminderQueue();
      const jobs = overdue.map(req => ({
        name: 'maintenance-overdue',
        data: {
          type: 'maintenance' as const,
          orgId: req.organizationId,
          recipientId: req.raisedBy,
          title: 'Maintenance Request Overdue',
          message: `Maintenance for ${(req as any).asset?.name} (${(req as any).asset?.assetTag}) is overdue. Please follow up with the technician.`,
          relatedEntityId: req.id,
          relatedEntityType: 'MaintenanceRequest',
          recipientEmail: (req as any).raiser?.email,
          recipientName: (req as any).raiser?.name,
        },
      }));

      await reminderQueue.addBulk(jobs);
      logger.info(`[Cron] ${jobs.length} maintenance overdue reminder(s) queued.`);
    } catch (err: any) {
      logger.error('[Cron] Maintenance reminder error:', err.message);
    }
  });

  // ─── Every 65 Minutes: Audit Overdue Detection ──────────────────────────
  // Offset from maintenance cron to avoid Redis/DB spike at top of hour.
  cron.schedule('5 * * * *', async () => {
    try {
      const now = new Date();

      // Mark overdue audit cycles (past scheduled end date and still In Progress)
      const overdueResult = await prisma.auditCycle.updateMany({
        where: {
          status: 'In Progress',
          scheduledEndDate: { lt: now },
          deletedAt: null,
        },
        data: { status: 'Overdue' } as any,
      });

      if (overdueResult.count > 0) {
        logger.info(`[Cron] ${overdueResult.count} audit cycle(s) marked overdue.`);
      }
    } catch (err: any) {
      logger.error('[Cron] Audit overdue error:', err.message);
    }
  });

  // ─── Every Midnight: Auto-Archive Notifications ──────────────────────────
  // Single updateMany across all orgs — no per-org loop needed.
  cron.schedule('0 0 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const archivedCount = await prisma.notification.updateMany({
        where: {
          status: 'Read',
          createdAt: { lt: thirtyDaysAgo },
          deletedAt: null,
        },
        data: { status: 'Archived' },
      });

      if (archivedCount.count > 0) {
        logger.info(`[Cron] Archived ${archivedCount.count} notification(s).`);
      }
    } catch (err: any) {
      logger.error('[Cron] Notification archive error:', err.message);
    }
  });

  logger.info('[Cron] All scheduled jobs registered.');
}
