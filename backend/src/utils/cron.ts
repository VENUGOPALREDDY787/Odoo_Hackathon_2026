import cron from 'node-cron';
import prisma from '../database/db';
import { overdueService } from '../modules/allocation/service/overdue.service';
import { bookingStatusService } from '../modules/booking/service/booking-status.service';
import { reminderService as bookingReminderService } from '../modules/booking/service/reminder.service';
import { maintenanceReminderService } from '../modules/maintenance/service/maintenance-reminder.service';
import { auditReminderService } from '../modules/audit/service/audit-reminder.service';

/**
 * startOverdueCron — Registers all background scheduled jobs.
 *
 * Schedule Map:
 *   every-1-min   → booking status transitions + reminder dispatch
 *   every-5-min   → overdue allocation scan
 *   every-60-min  → maintenance overdue reminders
 */
export function startOverdueCron(): void {

  // ─── Every Minute: Booking Status Transitions + Reminders ─────────────────
  cron.schedule('*/1 * * * *', async () => {
    try {
      // 1. Transition Upcoming → Ongoing for bookings whose startTime has passed
      const started = await bookingStatusService.processStartingBookings();
      if (started > 0) {
        console.log(`[Cron] ${started} booking(s) transitioned to Ongoing.`);
      }

      // 2. Transition Ongoing → Completed for bookings whose endTime has passed
      const completed = await bookingStatusService.processEndingBookings();
      if (completed > 0) {
        console.log(`[Cron] ${completed} booking(s) transitioned to Completed.`);
      }

      // 3. Dispatch reminder notifications for upcoming bookings
      const reminders = await bookingReminderService.sendPendingReminders();
      if (reminders > 0) {
        console.log(`[Cron] ${reminders} booking reminder(s) dispatched.`);
      }
    } catch (error) {
      console.error('[Cron] Booking status transition error:', error);
    }
  });

  // ─── Every 5 Minutes: Overdue Allocation Detection ────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        const count = await overdueService.checkOverdueAllocations(org.id);
        if (count > 0) {
          console.log(`[Cron] ${count} overdue allocation(s) detected for org ${org.id}.`);
        }
      }
    } catch (error) {
      console.error('[Cron] Overdue allocation check error:', error);
    }
  });

  // ─── Every Hour: Maintenance Overdue Reminders ────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        const count = await maintenanceReminderService.sendOverdueReminders(org.id);
        if (count > 0) {
          console.log(`[Cron] ${count} overdue maintenance reminder(s) sent for org ${org.id}.`);
        }
      }
    } catch (error) {
      console.error('[Cron] Maintenance overdue reminder error:', error);
    }
  });

  // ─── Every Hour: Audit Overdue Detection + Pending Verification Reminders ────
  cron.schedule('0 * * * *', async () => {
    try {
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        const overdue = await auditReminderService.processOverdueAudits(org.id);
        const reminded = await auditReminderService.sendPendingVerificationReminders(org.id);
        if (overdue > 0) console.log(`[Cron] ${overdue} overdue audit(s) for org ${org.id}.`);
        if (reminded > 0) console.log(`[Cron] ${reminded} audit pending reminder(s) sent for org ${org.id}.`);
      }
    } catch (error) {
      console.error('[Cron] Audit reminder error:', error);
    }
  });
}
