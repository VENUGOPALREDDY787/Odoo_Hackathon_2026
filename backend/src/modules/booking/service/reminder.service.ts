import prisma from '../../../database/db';
import { BookingRepository } from '../repository/booking.repository';
import { emitToUser } from '../../../utils/socket';
import { REMINDER_LEAD_MINUTES } from '../constants/booking.constants';

/**
 * ReminderService — Handles sending pre-booking reminder notifications.
 *
 * Called by the cron scheduler every minute.
 * Finds all Upcoming bookings whose startTime falls within the next
 * REMINDER_LEAD_MINUTES window and have not yet received a reminder.
 *
 * The reminderSent flag prevents duplicate reminder delivery across cron ticks.
 *
 * Integration:
 *  - BookingRepository: reminder lookup + flag update
 *  - Notification model: in-app alerts
 *  - Socket.IO: real-time push to booker
 *  - ActivityLog: audit trail
 */
export class ReminderService {
  private bookingRepository: BookingRepository;

  constructor(bookingRepository = new BookingRepository()) {
    this.bookingRepository = bookingRepository;
  }

  /**
   * Scans for upcoming bookings approaching their start time and dispatches reminders.
   * Returns the count of reminders sent.
   */
  async sendPendingReminders(): Promise<number> {
    const now = new Date();
    const bookings = await this.bookingRepository.findUpcomingForReminder(now, REMINDER_LEAD_MINUTES);

    for (const booking of bookings) {
      await prisma.$transaction(async (tx) => {
        // 1. Mark reminder as sent atomically to prevent duplicate sends
        await this.bookingRepository.markReminderSent(booking.id, tx);

        // 2. Create in-app notification
        await tx.notification.create({
          data: {
            organizationId: booking.organizationId,
            recipientId: booking.bookedBy,
            title: 'Booking Starting Soon',
            message: `Reminder: Your reservation for "${(booking as any).asset.name}" at ${(booking as any).asset.location} starts in ${REMINDER_LEAD_MINUTES} minutes (${booking.startTime.toLocaleString()}).`,
            type: 'Booking Reminder',
            relatedEntityType: 'ResourceBooking',
            relatedEntityId: booking.id
          }
        });

        // 3. Activity log
        await tx.activityLog.create({
          data: {
            organizationId: booking.organizationId,
            userId: null, // SYSTEM triggered
            action: 'BOOKING_REMINDER_SENT',
            entityType: 'ResourceBooking',
            entityId: booking.id,
            details: { assetId: booking.assetId, startTime: booking.startTime }
          }
        });
      });

      // 4. Real-time push notification (outside transaction — non-fatal if fails)
      emitToUser(booking.bookedBy, 'booking.reminder', {
        bookingId: booking.id,
        assetName: (booking as any).asset.name,
        startTime: booking.startTime,
        message: `Your booking starts in ${REMINDER_LEAD_MINUTES} minutes.`
      });
    }

    return bookings.length;
  }
}

export const reminderService = new ReminderService();
export default reminderService;
