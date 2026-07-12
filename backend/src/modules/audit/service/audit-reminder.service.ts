import prisma from '../../../database/db';
import { AuditRepository } from '../repository/audit.repository';
import { emitToUser, emitToOrgRole } from '../../../utils/socket';
import { AUDIT_STATUSES } from '../constants/audit.constants';

/**
 * AuditReminderService — Scheduled overdue audit detection and reminder dispatch.
 *
 * Run every hour by the cron scheduler.
 *
 * Handles:
 *  1. Active audits that have exceeded their scheduled end date → overdue alert
 *  2. Auditors with pending verifications → personal reminder push
 *
 * Integration:
 *  - AuditRepository: query active audits and pending items
 *  - Notification model: in-app alerts
 *  - Socket.IO: real-time push
 *  - ActivityLog: SYSTEM audit trail
 */
export class AuditReminderService {
  private auditRepository: AuditRepository;

  constructor(auditRepository = new AuditRepository()) {
    this.auditRepository = auditRepository;
  }

  /**
   * Checks all In Progress audits for overdue status and dispatches reminders.
   */
  async processOverdueAudits(orgId: string): Promise<number> {
    const now = new Date();

    const overdueAudits = await prisma.auditCycle.findMany({
      where: {
        organizationId: orgId,
        status: AUDIT_STATUSES.IN_PROGRESS,
        scheduledEndDate: { lt: now }
      },
      include: {
        auditors: {
          include: { employee: { select: { id: true, name: true } } }
        }
      }
    });

    for (const audit of overdueAudits) {
      await prisma.$transaction(async (tx) => {
        // Notify Asset Manager
        await tx.notification.create({
          data: {
            organizationId: orgId,
            recipientId: audit.createdBy ?? audit.auditors[0]?.employeeId ?? orgId,
            title: 'Audit Overdue',
            message: `Audit "${audit.name}" was scheduled to end on ${audit.scheduledEndDate?.toLocaleDateString()} but is still In Progress.`,
            type: 'Audit Overdue',
            relatedEntityType: 'AuditCycle',
            relatedEntityId: audit.id
          }
        });

        await tx.activityLog.create({
          data: {
            organizationId: orgId,
            userId: null,
            action: 'AUDIT_OVERDUE_ALERT',
            entityType: 'AuditCycle',
            entityId: audit.id,
            details: { scheduledEndDate: audit.scheduledEndDate }
          }
        });
      });

      emitToOrgRole(orgId, 'Asset Manager', 'audit.overdue', {
        cycleId: audit.id,
        name: audit.name,
        scheduledEndDate: audit.scheduledEndDate
      });

      for (const auditor of audit.auditors) {
        emitToUser(auditor.employee.id, 'audit.overdue', {
          cycleId: audit.id,
          name: audit.name
        });
      }
    }

    return overdueAudits.length;
  }

  /**
   * Sends pending verification reminders to each assigned auditor.
   */
  async sendPendingVerificationReminders(orgId: string): Promise<number> {
    const activeAudits = await prisma.auditCycle.findMany({
      where: { organizationId: orgId, status: AUDIT_STATUSES.IN_PROGRESS },
      include: {
        auditors: {
          include: { employee: { select: { id: true, name: true } } }
        }
      }
    });

    let reminded = 0;
    for (const audit of activeAudits) {
      const pendingCount = await this.auditRepository.countItems(audit.id, { verificationStatus: 'Pending' });

      if (pendingCount > 0) {
        for (const auditor of audit.auditors) {
          emitToUser(auditor.employee.id, 'audit.pending_reminder', {
            cycleId: audit.id,
            name: audit.name,
            pendingCount
          });
          reminded++;
        }
      }
    }

    return reminded;
  }
}

export const auditReminderService = new AuditReminderService();
export default auditReminderService;
