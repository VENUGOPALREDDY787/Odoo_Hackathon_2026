import prisma from '../../../database/db';
import { MaintenanceRepository } from '../repository/maintenance.repository';
import { emitToUser, emitToOrgRole } from '../../../utils/socket';

/**
 * MaintenanceReminderService — Scans for overdue maintenance requests and dispatches alerts.
 *
 * Runs every hour via the cron scheduler.
 * Detects maintenance requests where estimatedCompletionDate has passed
 * but the request is still active (Approved, Technician Assigned, In Progress).
 *
 * Actions:
 *  1. Creates an in-app notification for the assigned technician and asset manager
 *  2. Emits Socket.IO alert to relevant users
 *  3. Writes an activity log entry (SYSTEM triggered)
 *
 * This service does NOT change request status — overdue is informational only.
 */
export class MaintenanceReminderService {
  private maintenanceRepository: MaintenanceRepository;

  constructor(maintenanceRepository = new MaintenanceRepository()) {
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * Finds all overdue maintenance requests and dispatches reminder notifications.
   * Returns number of reminders sent.
   */
  async sendOverdueReminders(orgId: string): Promise<number> {
    const now = new Date();
    const overdueRequests = await this.maintenanceRepository.findOverdue(orgId, now);

    for (const request of overdueRequests) {
      await prisma.$transaction(async (tx) => {
        // Notify the raiser
        await tx.notification.create({
          data: {
            organizationId: orgId,
            recipientId: request.raisedBy,
            title: 'Maintenance Overdue',
            message: `Maintenance for "${(request as any).asset.name}" (${(request as any).asset.assetTag}) was due on ${(request as any).estimatedCompletionDate?.toLocaleDateString()} and is still open.`,
            type: 'Maintenance Overdue',
            relatedEntityType: 'MaintenanceRequest',
            relatedEntityId: request.id
          }
        });

        // Log as SYSTEM action
        await tx.activityLog.create({
          data: {
            organizationId: orgId,
            userId: null,
            action: 'MAINTENANCE_OVERDUE_ALERT',
            entityType: 'MaintenanceRequest',
            entityId: request.id,
            details: {
              assetId: request.assetId,
              estimatedCompletionDate: (request as any).estimatedCompletionDate
            }
          }
        });
      });

      // Real-time push (outside transaction — non-fatal)
      emitToUser(request.raisedBy, 'maintenance.overdue', {
        requestId: request.id,
        assetName: (request as any).asset.name,
        dueDate: (request as any).estimatedCompletionDate
      });

      emitToOrgRole(orgId, 'Asset Manager', 'maintenance.overdue', {
        requestId: request.id,
        assetName: (request as any).asset.name,
        priority: (request as any).priority
      });
    }

    return overdueRequests.length;
  }
}

export const maintenanceReminderService = new MaintenanceReminderService();
export default maintenanceReminderService;
